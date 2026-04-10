const mongoose = require("mongoose");

const VALID_STATUSES = ["chua-coc", "da-coc-mot-phan", "hoan-thanh"];
const VALID_CATEGORIES = ["dam-hoi", "dam-cuoi"];

const vendorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 200 },
    address: { type: String, default: "", maxlength: 500 },
    phone: { type: String, default: "", maxlength: 20 },
    price: { type: Number, required: true, min: 0 },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true },
);

const budgetSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      enum: VALID_CATEGORIES,
    },
    itemName: {
      type: String,
      required: true,
      maxlength: 200,
    },
    estimatedCost: {
      type: Number,
      required: true,
      min: 0,
    },
    baseEstimatedCost: {
      type: Number,
      default: null, // original user-set estimate; restored when all vendors removed
      min: 0,
    },
    depositPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    remainingCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    note: {
      type: String,
      default: "",
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: VALID_STATUSES,
      default: "chua-coc",
    },
    deadline: {
      type: Date,
      default: null,
    },
    vendors: {
      type: [vendorSchema],
      default: [],
    },
    notifyStage: {
      type: Number,
      default: 0,
      min: 0,
      max: 4,
    },
    lastNotificationSent: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

budgetSchema.index({ category: 1 });

const Budget = mongoose.model("Budget", budgetSchema);

module.exports = Budget;
