const mongoose = require("mongoose");
const ClassMember = require("../models/ClassMember");
const Registration = require("../models/Registration");
const ReunionPlan = require("../models/ReunionPlan");
const ReunionPlanVote = require("../models/ReunionPlanVote");
const MAX_DISTANCE_KM = 150;

const ensureInitialPlan = () =>
  ReunionPlan.findOneAndUpdate(
    { isSeed: true },
    {
      $set: {
        title: "Đi Huế",
        description:
          "Đi Huế, thuê villa và cùng nhau nấu nướng, ăn uống trò chuyện về chuyện xưa",
        location: "Huế",
        resolvedAddress: "Huế, Thành phố Huế, Việt Nam",
        latitude: 16.4637,
        longitude: 107.5909,
        distanceKm: 95.1,
        authorId: null,
        isSeed: true,
      },
    },
    { upsert: true, new: true },
  );

const serializePlan = (plan, voteCount, currentMemberVotes) => ({
  id: plan._id,
  title: plan.title,
  description: plan.description,
  location: plan.location,
  resolvedAddress: plan.resolvedAddress,
  latitude: plan.latitude,
  longitude: plan.longitude,
  distanceKm: plan.distanceKm,
  authorId: plan.authorId?._id || null,
  authorName: plan.authorId?.fullName || "Ban tổ chức",
  voteCount,
  hasVoted: currentMemberVotes.has(plan._id.toString()),
  createdAt: plan.createdAt,
});

const getOptionalMemberId = (req) => {
  const authorization = req.headers.authorization || "";
  if (!authorization.startsWith("Bearer ")) return null;

  try {
    const jwt = require("jsonwebtoken");
    const payload = jwt.verify(
      authorization.slice("Bearer ".length),
      process.env.JWT_SECRET,
      { issuer: "wedding-api", audience: "reunion-member" },
    );
    return payload.scope === "reunion:member" ? payload.memberId : null;
  } catch (_error) {
    return null;
  }
};

const listPlans = async (req, res) => {
  try {
    await ensureInitialPlan();
    const memberId = getOptionalMemberId(req);
    const [plans, voteCounts, memberVotes] = await Promise.all([
      ReunionPlan.find().populate("authorId").lean(),
      ReunionPlanVote.aggregate([
        { $unwind: "$planIds" },
        { $group: { _id: "$planIds", count: { $sum: 1 } } },
      ]),
      memberId
        ? ReunionPlanVote.findOne({ memberId }).select("planIds").lean()
        : null,
    ]);

    const counts = new Map(
      voteCounts.map((item) => [item._id.toString(), item.count]),
    );
    const currentMemberVotes = new Set(
      (memberVotes?.planIds || []).map((planId) => planId.toString()),
    );
    const data = plans
      .map((plan) =>
        serializePlan(
          plan,
          counts.get(plan._id.toString()) || 0,
          currentMemberVotes,
        ),
      )
      .sort(
        (a, b) =>
          b.voteCount - a.voteCount ||
          new Date(a.createdAt) - new Date(b.createdAt),
      );

    return res.json({
      success: true,
      data,
      meta: {
        memberVoteCount: currentMemberVotes.size,
        maxVotes: 2,
        maxDistanceKm: MAX_DISTANCE_KM,
      },
    });
  } catch (error) {
    console.error("[reunion] list plans:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể tải danh sách plan. Vui lòng thử lại.",
    });
  }
};

const createPlan = async (req, res) => {
  try {
    const memberId = req.reunionMember.memberId;
    const title = String(req.body?.title || "").trim();
    const description = String(req.body?.description || "").trim();
    const location = String(req.body?.location || "").trim();

    if (!title || !description || !location) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ tên plan, nội dung và địa điểm.",
      });
    }
    if (
      title.length > 120 ||
      description.length > 1000 ||
      location.length > 200
    ) {
      return res.status(400).json({
        success: false,
        message: "Nội dung plan vượt quá độ dài cho phép.",
      });
    }

    const [member, registration, existingPlan] = await Promise.all([
      ClassMember.findById(memberId),
      Registration.exists({ memberId }),
      ReunionPlan.exists({ authorId: memberId }),
    ]);
    if (!member || !registration) {
      return res.status(403).json({
        success: false,
        message: "Chỉ thành viên đã đăng ký tham gia mới được tạo plan.",
      });
    }
    if (existingPlan) {
      return res.status(409).json({
        success: false,
        code: "PLAN_ALREADY_CREATED",
        message: "Mỗi thành viên chỉ được tạo 1 plan.",
      });
    }

    const plan = await ReunionPlan.create({
      title,
      description,
      location,
      authorId: memberId,
    });
    await plan.populate("authorId");

    return res.status(201).json({
      success: true,
      data: serializePlan(plan, 0, new Set()),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        code: "PLAN_ALREADY_CREATED",
        message: "Mỗi thành viên chỉ được tạo 1 plan.",
      });
    }
    console.error("[reunion] create plan:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể tạo plan lúc này. Vui lòng thử lại.",
    });
  }
};

const toggleVote = async (req, res) => {
  try {
    const memberId = req.reunionMember.memberId;
    const planId = req.params.id;
    if (!mongoose.isValidObjectId(planId)) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy plan." });
    }

    const [plan, registration, ballot] = await Promise.all([
      ReunionPlan.findById(planId),
      Registration.exists({ memberId }),
      ReunionPlanVote.findOne({ memberId }),
    ]);
    if (!plan) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy plan." });
    }
    if (!registration) {
      return res.status(403).json({
        success: false,
        message: "Chỉ thành viên đã đăng ký tham gia mới được vote.",
      });
    }

    const hasVoted = ballot?.planIds.some((id) => id.equals(planId));
    if (hasVoted) {
      await ReunionPlanVote.updateOne(
        { memberId },
        { $pull: { planIds: planId } },
      );
      return res.json({ success: true, data: { hasVoted: false } });
    }

    const updated = await ReunionPlanVote.findOneAndUpdate(
      {
        memberId,
        "planIds.1": { $exists: false },
        planIds: { $ne: plan._id },
      },
      {
        $addToSet: { planIds: plan._id },
        $setOnInsert: { memberId },
      },
      { upsert: !ballot, new: true, runValidators: true },
    );
    if (!updated) {
      const latestBallot = await ReunionPlanVote.findOne({ memberId }).lean();
      if (latestBallot?.planIds.some((id) => id.equals(planId))) {
        return res.json({ success: true, data: { hasVoted: true } });
      }
      return res.status(409).json({
        success: false,
        code: "VOTE_LIMIT_REACHED",
        message: "Bạn đã dùng hết 2 lượt bình chọn.",
      });
    }

    return res.status(201).json({ success: true, data: { hasVoted: true } });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        code: "VOTE_LIMIT_REACHED",
        message: "Bạn đã dùng hết 2 lượt bình chọn.",
      });
    }
    console.error("[reunion] toggle plan vote:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật bình chọn. Vui lòng thử lại.",
    });
  }
};

module.exports = { createPlan, listPlans, toggleVote };
