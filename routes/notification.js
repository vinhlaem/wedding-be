const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const { apiLimiter } = require("../middleware/rateLimiter");
const { runNotificationCheck } = require("../services/notificationService");

// GET /api/notifications — list all, newest first
router.get("/", apiLimiter, async (req, res) => {
  try {
    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    const unreadCount = notifications.filter((n) => !n.isRead).length;
    res.json({ success: true, data: { notifications, unreadCount } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/notifications/:id/read
router.patch("/:id/read", apiLimiter, async (req, res) => {
  try {
    await Notification.updateOne({ _id: req.params.id }, { isRead: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/notifications/read-all
router.patch("/read-all", apiLimiter, async (req, res) => {
  try {
    await Notification.updateMany({ isRead: false }, { isRead: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/notifications/trigger — manual trigger for testing
router.post("/trigger", async (req, res) => {
  try {
    await runNotificationCheck();
    res.json({ success: true, message: "Check complete" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
