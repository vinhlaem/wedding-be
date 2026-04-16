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
  createShareLink,
  acceptShare,
  createBudgetsBulk,
} = require("../controllers/budgetController");
const { verifyJWT } = require("../middleware/authMiddleware");
const { writeLimiter } = require("../middleware/rateLimiter");

// Protect budget endpoints: users must be authenticated. Admins still can access all.
// GET /api/budgets?category=dam-hoi|dam-cuoi
router.get("/", verifyJWT, getBudgets);

// POST /api/budgets
router.post("/", verifyJWT, writeLimiter, createBudget);

// POST /api/budgets/bulk  -> create multiple budgets at once (for admin use)
router.post("/bulk", verifyJWT, writeLimiter, createBudgetsBulk);

// PUT /api/budgets/:id
router.put("/:id", verifyJWT, writeLimiter, updateBudget);

// DELETE /api/budgets/:id
router.delete("/:id", verifyJWT, writeLimiter, deleteBudget);

// Vendor sub-routes
router.post("/:id/vendors", verifyJWT, writeLimiter, addVendor);
router.put("/:id/vendors/:vendorId", verifyJWT, writeLimiter, updateVendor);
router.delete("/:id/vendors/:vendorId", verifyJWT, writeLimiter, deleteVendor);
router.patch(
  "/:id/vendors/:vendorId/default",
  verifyJWT,
  writeLimiter,
  setDefaultVendor,
);

// Share endpoints
// POST /api/budgets/share  -> create workspace share link (authenticated user)
router.post("/share", verifyJWT, writeLimiter, createShareLink);

// POST /api/budgets/share/accept  -> accept share (after login), body: { token }
router.post("/share/accept", verifyJWT, writeLimiter, acceptShare);

module.exports = router;
