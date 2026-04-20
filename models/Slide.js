const mongoose = require("mongoose");

const slideSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["banner", "two", "three", "four"],
      required: true,
      index: true,
    },
    images: {
      type: [String],
      validate: [(arr) => arr.length > 0, "images must be a non-empty array"],
    },
    caption: {
      type: String,
      default: null,
    },
    order: {
      type: Number,
      default: 0,
    },
    published: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

slideSchema.index({ order: 1, createdAt: -1 });

const Slide = mongoose.model("Slide", slideSchema);
module.exports = Slide;
