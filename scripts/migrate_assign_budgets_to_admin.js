// Migration: attach existing Budget documents to an admin user
// Usage: node scripts/migrate_assign_budgets_to_admin.js

const mongoose = require("mongoose");
const Budget = require("../models/Budget");
const User = require("../models/User");
require("dotenv").config();

async function main() {
  const mongo = process.env.MONGO_URI;
  if (!mongo) throw new Error("MONGO_URI not configured");
  await mongoose.connect(mongo, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  // Find an admin user
  let admin = await User.findOne({ role: "admin" });
  if (!admin) {
    console.log(
      "No admin user found. Creating a placeholder admin account (no password).",
    );
    admin = await User.create({
      googleId: "migration-admin",
      email: "admin@example.com",
      name: "Admin (migration)",
      role: "admin",
    });
  }

  console.log("Using admin id:", admin._id.toString());

  const result = await Budget.updateMany(
    { owner: { $exists: false } },
    { $set: { owner: admin._id } },
  );
  console.log(
    "Updated budgets count:",
    result.nModified || result.modifiedCount || 0,
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
