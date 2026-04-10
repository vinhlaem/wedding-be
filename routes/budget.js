const express = require("express");
const router = express.Router();
const {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
  addVendor,
  updateVendor,
  deleteVendor,
  setDefaultVendor,
} = require("../controllers/budgetController");
const { writeLimiter } = require("../middleware/rateLimiter");

// GET /api/budgets?category=dam-hoi|dam-cuoi
router.get("/", getBudgets);

// POST /api/budgets
router.post("/", writeLimiter, createBudget);

// PUT /api/budgets/:id
router.put("/:id", writeLimiter, updateBudget);

// DELETE /api/budgets/:id
router.delete("/:id", writeLimiter, deleteBudget);

// Vendor sub-routes
router.post("/:id/vendors", writeLimiter, addVendor);
router.put("/:id/vendors/:vendorId", writeLimiter, updateVendor);
router.delete("/:id/vendors/:vendorId", writeLimiter, deleteVendor);
router.patch("/:id/vendors/:vendorId/default", writeLimiter, setDefaultVendor);

module.exports = router;
