const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClassMember",
      required: true,
      unique: true,
      index: true,
    },
    participantCount: { type: Number, required: true, min: 1, validate: Number.isInteger },
    isPaid: { type: Boolean, default: false },
    amountReceived: { type: Number, default: null, min: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Registration", registrationSchema);
