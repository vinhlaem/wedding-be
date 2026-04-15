const User = require("../models/User");

/**
 * Find an existing user by googleId, or create a new one.
 * @param {{ googleId: string, email: string, name: string, picture: string }} profile
 * @returns {Promise<User>}
 */
/**
 * Find or create user. Accepts optional `role` to set when creating a new user.
 */
const findOrCreateUser = async ({ googleId, email, name, picture, role }) => {
  // Try to find by googleId first (primary key for OAuth accounts)
  let user = await User.findOne({ googleId });

  if (user) {
    return user;
  }

  // Guard: check if email already registered with a different googleId
  const existingByEmail = await User.findOne({ email });
  if (existingByEmail) {
    // Reuse the account — link the googleId to the existing record
    existingByEmail.googleId = googleId;
    existingByEmail.name = name || existingByEmail.name;
    existingByEmail.picture = picture || existingByEmail.picture;
    await existingByEmail.save();
    return existingByEmail;
  }

  // Create fresh user
  const createPayload = { googleId, email, name, picture };
  if (role) createPayload.role = role;
  user = await User.create(createPayload);
  return user;
};

module.exports = { findOrCreateUser };
