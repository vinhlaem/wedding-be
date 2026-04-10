const express = require("express");
const router = express.Router();
const connectDB = require("../database");
const { runNotificationCheck } = require("../services/notificationService");

// NOTE: Vercel Cron Jobs run in UTC.
//       Current schedule: "0 1 * * *" → 08:00 ICT (01:00 UTC), once per day.

/**
 * GET /api/cron/notify
 *
 * Triggered by Vercel Cron once per day.
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

/**
 * POST /api/cron/test-notify
 *
 * Manual trigger for testing — does NOT require CRON_SECRET.
 * Protected by the same JWT middleware used on other routes.
 * Call with a valid user token:  Authorization: Bearer <JWT>
 */
router.post("/test-notify", async (req, res) => {
  const startedAt = new Date().toISOString();
  console.log(`[cron:test] Manual trigger at: ${startedAt}`);

  try {
    await connectDB();
    await runNotificationCheck();
    console.log("[cron:test] Completed.");
    return res.json({ success: true, ranAt: startedAt });
  } catch (err) {
    console.error("[cron:test] Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
