const express = require("express");
const router = express.Router();
const {
  getSlides,
  createSlide,
  updateSlide,
  deleteSlide,
  reorderSlides,
} = require("../controllers/slidesController");
const { lightQueue } = require("../middleware/requestQueue");
const { verifyJWT } = require("../middleware/authMiddleware");
const { apiLimiter, writeLimiter } = require("../middleware/rateLimiter");

// Public read route
router.get("/", lightQueue, getSlides);

// Admin write routes
router.post("/", verifyJWT, lightQueue, createSlide);
router.put("/:id", verifyJWT, lightQueue, updateSlide);
router.delete("/:id", verifyJWT, lightQueue, deleteSlide);
router.patch("/reorder", verifyJWT, lightQueue, reorderSlides);

module.exports = router;
