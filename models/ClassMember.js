const mongoose = require("mongoose");

const classMemberSchema = new mongoose.Schema(
  {
    seedKey: { type: String, required: true, unique: true, immutable: true },
    fullName: { type: String, required: true, trim: true, maxlength: 150 },
    normalizedFullName: { type: String, required: true, index: true, maxlength: 150 },
    isAdmin: { type: Boolean, default: false },
    metadata: { type: String, default: null, maxlength: 500 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ClassMember", classMemberSchema);
