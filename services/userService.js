const User = require("../models/User");

/**
 * Find an existing user by googleId, or create a new one.
 * @param {{ googleId: string, email: string, name: string, picture: string }} profile
 * @returns {Promise<User>}
 */
const findOrCreateUser = async ({ googleId, email, name, picture }) => {
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
  user = await User.create({ googleId, email, name, picture });
  return user;
};

module.exports = { findOrCreateUser };
