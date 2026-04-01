const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ── Whitelist ──────────────────────────────────────────────────────────────────
// Emails are stored lower-cased. Populate via env var or extend with DB lookup.
const buildWhitelist = () => {
  const raw = process.env.AUTH_WHITELIST || "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
};

/**
 * Verify a Google ID token and return the decoded payload.
 * Throws if the token is invalid or the audience doesn't match.
 * @param {string} idToken
 * @returns {Promise<import("google-auth-library").TokenPayload>}
 */
const verifyGoogleToken = async (idToken) => {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload();
};

/**
 * Check whether an email address is allowed to access the dashboard.
 * @param {string} email
 * @returns {boolean}
 */
const isEmailWhitelisted = (email) => {
  const whitelist = buildWhitelist();
  const normalised = (email || "").trim().toLowerCase();
  return whitelist.includes(normalised);
};

/**
 * Sign a JWT for an authenticated user.
 * @param {{ _id: string, email: string, role: string, name: string }} user
 * @returns {string}
 */
const generateJWT = (user) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");

  const payload = {
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
    name: user.name,
  };

  return jwt.sign(payload, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    issuer: "wedding-dashboard",
  });
};

module.exports = { verifyGoogleToken, isEmailWhitelisted, generateJWT };
