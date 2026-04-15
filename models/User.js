const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    googleId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    name: { type: String },
    picture: { type: String },
    // Allow regular users for the wedding-budget flow
    role: { type: String, enum: ["admin", "hr", "user"], default: "user" },
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);

module.exports = User;
