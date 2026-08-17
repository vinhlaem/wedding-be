const mongoose = require("mongoose");

const reunionPlanSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 1000 },
    location: { type: String, required: true, trim: true, maxlength: 200 },
    resolvedAddress: { type: String, required: true, maxlength: 500 },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    distanceKm: { type: Number, required: true, min: 0, max: 150 },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClassMember",
      default: null,
    },
    isSeed: { type: Boolean, default: false },
  },
  { timestamps: true },
);

reunionPlanSchema.index(
  { authorId: 1 },
  {
    unique: true,
    partialFilterExpression: { authorId: { $type: "objectId" } },
  },
);
reunionPlanSchema.index(
  { isSeed: 1 },
  { unique: true, partialFilterExpression: { isSeed: true } },
);

module.exports = mongoose.model("ReunionPlan", reunionPlanSchema);
