const jwt = require("jsonwebtoken");

const COOKIE_NAME = "reunion_admin_session";

const readCookie = (req, name) => {
  const raw = req.headers.cookie || "";
  const entry = raw.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : null;
};

const verifyReunionAdmin = (req, res, next) => {
  const token = readCookie(req, COOKIE_NAME);
  try {
    if (!token || !process.env.JWT_SECRET) throw new Error("Missing session");
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: "wedding-api",
      audience: "reunion-admin",
    });
    if (payload.scope !== "reunion:admin") throw new Error("Invalid scope");
    req.reunionAdmin = payload;
    next();
  } catch (_error) {
    res.status(401).json({ success: false, message: "Phiên quản trị không hợp lệ hoặc đã hết hạn." });
  }
};

module.exports = { COOKIE_NAME, readCookie, verifyReunionAdmin };
