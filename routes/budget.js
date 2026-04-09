const express = require("express");
const router = express.Router();
const {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
} = require("../controllers/budgetController");
const { writeLimiter } = require("../middleware/rateLimiter");
const { verifyJWT } = require("../middleware/authMiddleware");

// GET /api/budgets?category=dam-hoi|dam-cuoi
router.get("/", getBudgets);

// POST /api/budgets
router.post("/", writeLimiter, createBudget);

// PUT /api/budgets/:id
router.put("/:id", writeLimiter, updateBudget);

// DELETE /api/budgets/:id
router.delete("/:id", writeLimiter, deleteBudget);

module.exports = router;
