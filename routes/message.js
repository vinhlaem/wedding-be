const express = require("express");
const router = express.Router();
const Message = require("../models/Message");

// ─── POST /api/messages ──────────────────────────────────────────────────────
// Write path: no cache, strict input validation.
router.post("/", async (req, res) => {
  const { name, message } = req.body;
  if (!name || !message) {
    return res
      .status(400)
      .json({ success: false, message: "Name and message are required" });
  }
  // Guard against extremely long payloads to avoid large doc writes.
  if (String(name).length > 100 || String(message).length > 1000) {
    return res.status(400).json({ success: false, message: "Input too long" });
  }
  try {
    const newMessage = await Message.create({
      name: String(name).trim(),
      message: String(message).trim(),
    });
    // Return only the fields the client needs — skip __v.
    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: {
        _id: newMessage._id,
        name: newMessage.name,
        message: newMessage.message,
        createdAt: newMessage.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/messages ───────────────────────────────────────────────────────
// Read path: run find + count in parallel, use projection + lean for minimal
// memory, and tell CDN/browser to cache for 10 s with stale-while-revalidate.
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit, 10) || 10),
    );
    const skip = (page - 1) * limit;

    // Run both queries concurrently — saves one round-trip to MongoDB.
    const projection = { name: 1, message: 1, createdAt: 1 };
    const [messages, totalMessages] = await Promise.all([
      Message.find({}, projection)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(), // returns plain JS objects — faster, lower RAM
      Message.countDocuments(),
    ]);

    const totalPages = Math.ceil(totalMessages / limit);

    // Cache-Control: let CDN/browser serve stale content for 10 s while
    // revalidating in the background — prevents repeated DB hits during bursts.
    res.set("Cache-Control", "public, max-age=10, stale-while-revalidate=30");

    res.status(200).json({
      success: true,
      message: "Messages fetched successfully",
      data: messages,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
