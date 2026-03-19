const express = require("express");
const router = express.Router();
const {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
} = require("../controllers/accountController");
const { writeLimiter } = require("../middleware/rateLimiter");

// GET /api/accounts
router.get("/", getAccounts);

// POST /api/accounts  (creation) - protect with write limiter
router.post("/", writeLimiter, createAccount);

// PUT /api/accounts/:id (update) - protect with write limiter
router.put("/:id", writeLimiter, updateAccount);

// DELETE /api/accounts/:id (delete) - protect with write limiter
router.delete("/:id", writeLimiter, deleteAccount);

module.exports = router;
