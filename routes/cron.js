const express = require("express");
const router = express.Router();
const connectDB = require("../database");
const { runNotificationCheck } = require("../services/notificationService");

// NOTE: Vercel Cron Jobs run in UTC.
//       Current schedule: */5 * * * * (every 5 min — for testing).
//       Switch to "0 1 * * *" (08:00 ICT) before going to production.

/**
 * GET /api/cron/notify
 *
 * Triggered by Vercel Cron every 5 minutes.
 * Protected by a shared secret passed as:  Authorization: Bearer <CRON_SECRET>
 */
router.get("/notify", async (req, res) => {
  // ── Auth ─────────────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!cronSecret || !token || token !== cronSecret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // ── Execution ─────────────────────────────────────────────────────────────
  const startedAt = new Date().toISOString();
  console.log(`[cron] Running at: ${startedAt}`);

  try {
    // Serverless functions don't maintain a persistent DB connection —
    // ensure it is open before running the check.
    await connectDB();

    await runNotificationCheck();

    console.log("[cron] Completed successfully.");
    return res.json({ success: true, ranAt: startedAt });
  } catch (err) {
    console.error("[cron] Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
