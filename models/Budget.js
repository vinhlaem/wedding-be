const mongoose = require("mongoose");

const VALID_STATUSES = ["chua-coc", "da-coc-mot-phan", "hoan-thanh"];
const VALID_CATEGORIES = ["dam-hoi", "dam-cuoi"];

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
    address: {
      type: String,
      default: "",
      maxlength: 500,
    },
    phone: {
      type: String,
      default: "",
      maxlength: 20,
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
  },
  { timestamps: true },
);

budgetSchema.index({ category: 1 });

const Budget = mongoose.model("Budget", budgetSchema);

module.exports = Budget;
