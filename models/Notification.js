const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    expenseIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Budget" }],
    stage: {
      type: Number,
      required: true,
      min: 1,
      max: 4,
    },
    deadlineDate: {
      type: String, // "YYYY-MM-DD" for dedup key
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    sent: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// Unique per deadline + stage to prevent duplicate sends
notificationSchema.index({ deadlineDate: 1, stage: 1 }, { unique: true });

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
