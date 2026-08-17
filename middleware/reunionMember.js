const jwt = require("jsonwebtoken");

const verifyReunionMember = (req, res, next) => {
  const authorization = req.headers.authorization || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";

  try {
    if (!token || !process.env.JWT_SECRET) {
      throw new Error("Missing member token");
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: "wedding-api",
      audience: "reunion-member",
    });

    if (payload.scope !== "reunion:member" || !payload.memberId) {
      throw new Error("Invalid member scope");
    }

    req.reunionMember = payload;
    next();
  } catch (_error) {
    res.status(401).json({
      success: false,
      code: "MEMBER_SESSION_REQUIRED",
      message:
        "Phiên thành viên không hợp lệ. Vui lòng đăng ký lại để tiếp tục.",
    });
  }
};

module.exports = { verifyReunionMember };
