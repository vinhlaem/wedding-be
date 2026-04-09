const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    endpoint: {
      type: String,
      required: true,
      unique: true,
    },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
  },
  { timestamps: true },
);

const Subscription = mongoose.model("Subscription", subscriptionSchema);

module.exports = Subscription;
