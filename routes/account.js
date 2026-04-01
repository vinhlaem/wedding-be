const express = require("express");
const router = express.Router();
const {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
} = require("../controllers/accountController");
const { writeLimiter } = require("../middleware/rateLimiter");
const { verifyJWT } = require("../middleware/authMiddleware");

// GET /api/accounts
router.get("/", getAccounts);

// POST /api/accounts  (creation) - protect with write limiter + JWT
router.post("/", verifyJWT, writeLimiter, createAccount);

// PUT /api/accounts/:id (update) - protect with write limiter + JWT
router.put("/:id", verifyJWT, writeLimiter, updateAccount);

// DELETE /api/accounts/:id (delete) - protect with write limiter + JWT
router.delete("/:id", verifyJWT, writeLimiter, deleteAccount);

module.exports = router;
