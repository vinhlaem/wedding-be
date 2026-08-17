const mongoose = require("mongoose");

const reunionPlanVoteSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClassMember",
      required: true,
      unique: true,
      index: true,
    },
    planIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "ReunionPlan" }],
      default: [],
      validate: {
        validator: (items) => items.length <= 2,
        message: "Mỗi thành viên chỉ được vote tối đa 2 plan.",
      },
    },
  },
  { timestamps: true },
);

reunionPlanVoteSchema.index({ planIds: 1 });

module.exports = mongoose.model("ReunionPlanVote", reunionPlanVoteSchema);
