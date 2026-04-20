const mongoose = require("mongoose");

const mediaSchema = new mongoose.Schema(
  {
    component: {
      type: String,
      enum: [
        "banner",
        "gallery",
        "program",
        "video",
        "timeline",
        "profile",
        "quote",
        "slide",
        "footer",
      ],
      required: true,
      index: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    cloudinaryPublicId: {
      type: String,
      required: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    source: {
      type: String,
      enum: ["upload", "google-drive"],
      default: "upload",
    },
    // Optional role to distinguish sub-slots within the same component
    // e.g. "wife" | "husband" for profile, "image1" | "image2" for quote,
    //      "source" | "poster" for video
    role: {
      type: String,
      default: null,
    },
    // "image" for normal images, "video" for video files
    mediaType: {
      type: String,
      enum: ["image", "video"],
      default: "image",
    },
  },
  { timestamps: true },
);

// Ensure consistent ordering when fetching
mediaSchema.index({ component: 1, order: 1 });

const Media = mongoose.model("Media", mediaSchema);

module.exports = Media;
