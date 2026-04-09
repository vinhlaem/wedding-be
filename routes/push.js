const express = require("express");
const router  = express.Router();
const Subscription = require("../models/Subscription");
const { VAPID_PUBLIC_KEY } = require("../services/pushService");
const { apiLimiter } = require("../middleware/rateLimiter");

// GET /api/push/vapid-public-key
router.get("/vapid-public-key", (req, res) => {
  if (!VAPID_PUBLIC_KEY) {
    return res.status(503).json({ success: false, message: "Push not configured" });
  }
  res.json({ success: true, data: { publicKey: VAPID_PUBLIC_KEY } });
});

// POST /api/push/subscribe
router.post("/subscribe", apiLimiter, async (req, res) => {
  const { endpoint, keys } = req.body || {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ success: false, message: "Invalid subscription" });
  }
  try {
    await Subscription.findOneAndUpdate(
      { endpoint },
      { endpoint, keys },
      { upsert: true, new: true },
    );
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/push/unsubscribe
router.delete("/unsubscribe", apiLimiter, async (req, res) => {
  const { endpoint } = req.body || {};
  if (!endpoint) return res.status(400).json({ success: false, message: "endpoint required" });
  await Subscription.deleteOne({ endpoint });
  res.json({ success: true });
});

module.exports = router;
