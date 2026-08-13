const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const ClassMember = require("../models/ClassMember");
const Registration = require("../models/Registration");
const { normalizeFacebookName } = require("../utils/normalizeFacebookName");
const { COOKIE_NAME, readCookie } = require("../middleware/reunionAdmin");
const reunionConfig = require("../config/reunion");

const NAME_NOT_FOUND = "Không tìm thấy tên Facebook này trong danh sách lớp. Vui lòng nhập đầy đủ và đúng tên Facebook của bạn.";
const safeMember = (member) => ({ id: member._id, fullName: member.fullName, metadata: member.metadata, isAdmin: member.isAdmin });
const serializeRegistration = (item) => ({
  id: item._id,
  member: safeMember(item.memberId),
  participantCount: item.participantCount,
  isPaid: item.isPaid,
  amountReceived: item.amountReceived,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

const signCandidate = (member) => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not configured");
  return jwt.sign({ memberId: member._id.toString(), purpose: "reunion-registration" }, process.env.JWT_SECRET, {
    expiresIn: "15m",
    issuer: "wedding-api",
    audience: "reunion-candidate",
  });
};

const resolveMember = async ({ facebookName, candidateToken }) => {
  if (candidateToken) {
    const payload = jwt.verify(candidateToken, process.env.JWT_SECRET, { issuer: "wedding-api", audience: "reunion-candidate" });
    if (payload.purpose !== "reunion-registration") throw new Error("INVALID_CANDIDATE");
    return ClassMember.findById(payload.memberId);
  }
  const normalized = normalizeFacebookName(facebookName);
  if (!normalized) return { validationError: "Vui lòng nhập tên Facebook." };
  const matches = await ClassMember.find({ normalizedFullName: normalized }).sort({ seedKey: 1 }).lean();
  if (!matches.length) return { validationError: NAME_NOT_FOUND };
  if (matches.length > 1) return { candidates: matches.map((member) => ({ ...safeMember(member), candidateToken: signCandidate(member) })) };
  return matches[0];
};

const createRegistration = async (req, res) => {
  try {
    const count = Number(req.body?.participantCount);
    if (!Number.isInteger(count) || count < 1 || count > 50) {
      return res.status(400).json({ success: false, message: "Số người tham gia phải là số nguyên từ 1 đến 50." });
    }
    const resolved = await resolveMember(req.body || {});
    if (resolved?.validationError) return res.status(400).json({ success: false, message: resolved.validationError });
    if (resolved?.candidates) return res.status(409).json({ success: false, code: "AMBIGUOUS_NAME", message: "Có nhiều thành viên cùng tên. Vui lòng chọn đúng tài khoản của bạn.", candidates: resolved.candidates });
    if (!resolved) return res.status(400).json({ success: false, message: NAME_NOT_FOUND });

    // A returning member goes straight to the homepage with their existing
    // registration. Do not create or modify any database data.
    const existing = await Registration.findOne({ memberId: resolved._id }).populate("memberId");
    if (existing) {
      return res.status(200).json({
        success: true,
        alreadyRegistered: true,
        message: "Bạn đã đăng ký tham gia trước đó.",
        data: serializeRegistration(existing),
      });
    }

    try {
      const registration = await Registration.create({ memberId: resolved._id, participantCount: count });
      const populated = await registration.populate("memberId");
      return res.status(201).json({ success: true, data: serializeRegistration(populated) });
    } catch (error) {
      if (error?.code === 11000) {
        // Concurrent requests can both pass the check above. The unique
        // memberId index lets only one insert win; return the winning record.
        const existing = await Registration.findOne({ memberId: resolved._id }).populate("memberId");
        return res.status(200).json({ success: true, alreadyRegistered: true, message: "Bạn đã đăng ký tham gia trước đó.", data: existing ? serializeRegistration(existing) : null });
      }
      throw error;
    }
  } catch (error) {
    if (["JsonWebTokenError", "TokenExpiredError"].includes(error.name) || error.message === "INVALID_CANDIDATE") {
      return res.status(400).json({ success: false, message: "Lựa chọn thành viên đã hết hạn. Vui lòng nhập lại tên Facebook." });
    }
    console.error("[reunion] create registration:", error);
    return res.status(500).json({ success: false, message: "Có lỗi xảy ra. Vui lòng thử lại." });
  }
};

const listRegistrations = async (_req, res) => {
  try {
    const items = await Registration.find().populate("memberId").sort({ createdAt: 1 }).lean();
    const data = items.map(serializeRegistration);
    return res.json({
      success: true,
      data,
      stats: {
        registeredMembers: data.length,
        totalParticipants: data.reduce((sum, item) => sum + item.participantCount, 0),
        paidCount: data.filter((item) => item.isPaid).length,
        unpaidCount: data.filter((item) => !item.isPaid).length,
      },
      config: {
        REUNION_START: reunionConfig.REUNION_START,
        REUNION_END: reunionConfig.REUNION_END,
        PAYMENT_DEADLINE: reunionConfig.PAYMENT_DEADLINE,
        AMOUNT_ENTRY_AVAILABLE_FROM: reunionConfig.AMOUNT_ENTRY_AVAILABLE_FROM,
        amountEntryIsAvailable: reunionConfig.amountEntryIsAvailable(),
      },
    });
  } catch (error) {
    console.error("[reunion] list registrations:", error);
    return res.status(500).json({ success: false, message: "Có lỗi xảy ra. Vui lòng thử lại." });
  }
};

const setAdminCookie = (res, token) => res.cookie(COOKIE_NAME, token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 8 * 60 * 60 * 1000,
  path: "/api/reunion/admin",
});

const adminLogin = async (req, res) => {
  const pin = typeof req.body?.pin === "string" ? req.body.pin : "";
  const configured = process.env.ADMIN_PIN || "";
  if (!configured) return res.status(503).json({ success: false, message: "ADMIN_PIN chưa được cấu hình." });
  const valid = pin.length === configured.length && crypto.timingSafeEqual(Buffer.from(pin), Buffer.from(configured));
  if (!valid) return res.status(401).json({ success: false, message: "Mã quản trị không chính xác." });
  if (!process.env.JWT_SECRET) return res.status(503).json({ success: false, message: "JWT_SECRET chưa được cấu hình." });
  const token = jwt.sign({ scope: "reunion:admin" }, process.env.JWT_SECRET, { expiresIn: "8h", issuer: "wedding-api", audience: "reunion-admin" });
  setAdminCookie(res, token);
  return res.json({ success: true, data: { isAdmin: true, amountEntryIsAvailable: reunionConfig.amountEntryIsAvailable() } });
};

const adminLogout = (_req, res) => {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", path: "/api/reunion/admin" });
  return res.json({ success: true });
};

const adminStatus = (req, res) => {
  try {
    const token = readCookie(req, COOKIE_NAME);
    const payload = jwt.verify(token, process.env.JWT_SECRET, { issuer: "wedding-api", audience: "reunion-admin" });
    return res.json({ success: true, data: { isAdmin: payload.scope === "reunion:admin", amountEntryIsAvailable: reunionConfig.amountEntryIsAvailable() } });
  } catch (_error) {
    return res.json({ success: true, data: { isAdmin: false, amountEntryIsAvailable: reunionConfig.amountEntryIsAvailable() } });
  }
};

const findRegistration = async (id) => mongoose.isValidObjectId(id) ? Registration.findById(id) : null;
const updateParticipantCount = async (req, res) => {
  const count = Number(req.body?.participantCount);
  if (!Number.isInteger(count) || count < 1 || count > 50) return res.status(400).json({ success: false, message: "Số người tham gia phải là số nguyên từ 1 đến 50." });
  const item = await findRegistration(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: "Không tìm thấy đăng ký." });
  item.participantCount = count;
  await item.save(); await item.populate("memberId");
  return res.json({ success: true, data: serializeRegistration(item) });
};
const updatePaymentStatus = async (req, res) => {
  if (typeof req.body?.isPaid !== "boolean") return res.status(400).json({ success: false, message: "Trạng thái kinh phí không hợp lệ." });
  const item = await findRegistration(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: "Không tìm thấy đăng ký." });
  item.isPaid = req.body.isPaid;
  await item.save(); await item.populate("memberId");
  return res.json({ success: true, data: serializeRegistration(item) });
};
const updateAmount = async (req, res) => {
  if (!reunionConfig.amountEntryIsAvailable()) return res.status(403).json({ success: false, message: "Chức năng nhập số tiền chỉ mở sau hạn đóng kinh phí 22/08/2026." });
  const amount = Number(req.body?.amountReceived);
  if (!Number.isFinite(amount) || amount < 0) return res.status(400).json({ success: false, message: "Số tiền đã nhận phải là số không âm." });
  const item = await findRegistration(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: "Không tìm thấy đăng ký." });
  item.amountReceived = amount;
  await item.save(); await item.populate("memberId");
  return res.json({ success: true, data: serializeRegistration(item) });
};

module.exports = { createRegistration, listRegistrations, adminLogin, adminLogout, adminStatus, updateParticipantCount, updatePaymentStatus, updateAmount };
