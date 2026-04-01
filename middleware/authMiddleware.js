const jwt = require("jsonwebtoken");

/**
 * Middleware to verify the JWT sent in the Authorization header.
 * Attaches the decoded payload to req.user on success.
 * Usage: router.post("/", verifyJWT, handler)
 */
const verifyJWT = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token =
    authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Authentication required" });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET not configured");

    const decoded = jwt.verify(token, secret, {
      issuer: "wedding-dashboard",
    });
    req.user = decoded;
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
};

module.exports = { verifyJWT };
