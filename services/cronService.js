const { runNotificationCheck } = require("./notificationService");

// startCron() is kept for local / traditional Node.js deployments only.
//
// On Vercel (serverless), cron jobs are triggered via the Vercel Cron
// feature which calls GET /api/cron/notify on the configured schedule.
// In that environment this function is intentionally a no-op so that
// node-cron is never imported (it is not available in serverless runtimes).
//
// Schedule reference (UTC):
//   Testing    : every-5-min  →  "*/5 * * * *"
//   Production : 08:00 ICT    →  "0 1 * * *"  (01:00 UTC)
function startCron() {
  if (process.env.VERCEL) {
    // Running on Vercel — cron is handled externally; nothing to do here.
    console.log("[cron] Vercel environment detected — internal cron skipped.");
    return;
  }

  // Local / self-hosted: fall back to a simple setInterval so node-cron is
  // not required as a production dependency.
  const INTERVAL_MS = 5 * 60 * 1_000; // 5 minutes (matches Vercel schedule)
  setInterval(async () => {
    console.log(`[cron] Running at: ${new Date().toISOString()}`);
    try {
      await runNotificationCheck();
      console.log("[cron] Done.");
    } catch (err) {
      console.error("[cron] Error:", err.message);
    }
  }, INTERVAL_MS);

  console.log("[cron] Deadline notification job scheduled (every 5 min).");
}

module.exports = { startCron };
