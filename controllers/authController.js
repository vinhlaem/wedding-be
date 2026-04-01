const {
  verifyGoogleToken,
  isEmailWhitelisted,
  generateJWT,
} = require("../services/authService");
const { findOrCreateUser } = require("../services/userService");

/**
 * POST /api/auth/google
 * Body: { idToken: string }
 *
 * Flow:
 *  1. Verify Google ID token
 *  2. Normalise & check email against whitelist
 *  3. Find-or-create the user record
 *  4. Return a signed JWT
 */
const googleLogin = async (req, res) => {
  const { idToken } = req.body || {};

  if (!idToken) {
    return res
      .status(400)
      .json({ success: false, message: "idToken is required" });
  }

  // 1. Verify with Google
  let payload;
  try {
    payload = await verifyGoogleToken(idToken);
  } catch (err) {
    console.warn("[auth] Google token verification failed:", err.message);
    return res
      .status(401)
      .json({ success: false, message: "Invalid Google token" });
  }

  // 2. Extract and validate profile
  const { sub: googleId, email, name, picture } = payload;

  if (!email) {
    return res
      .status(400)
      .json({ success: false, message: "Google account has no email" });
  }

  const normalisedEmail = email.trim().toLowerCase();

  // 3. Whitelist check
  if (!isEmailWhitelisted(normalisedEmail)) {
    console.warn("[auth] Unauthorised login attempt:", normalisedEmail);
    return res.status(403).json({
      success: false,
      message: "Access denied. Your account is not authorised.",
    });
  }

  // 4. Find or create user
  let user;
  try {
    user = await findOrCreateUser({
      googleId,
      email: normalisedEmail,
      name,
      picture,
    });
  } catch (err) {
    console.error("[auth] User upsert error:", err.message);
    return res
      .status(500)
      .json({ success: false, message: "Authentication error" });
  }

  // 5. Issue JWT
  let token;
  try {
    token = generateJWT(user);
  } catch (err) {
    console.error("[auth] JWT generation error:", err.message);
    return res
      .status(500)
      .json({ success: false, message: "Could not generate session token" });
  }

  return res.status(200).json({
    success: true,
    token,
    user: {
      email: user.email,
      name: user.name,
      picture: user.picture,
      role: user.role,
    },
  });
};

module.exports = { googleLogin };
