const cron = require("node-cron");
const { runNotificationCheck } = require("./notificationService");

/**
 * Daily at 08:00 — check deadlines and send push notifications
 * Cron expression: second=0 minute=0 hour=8 * * *
 */
function startCron() {
  cron.schedule(
    "0 8 * * *",
    async () => {
      console.log("[cron] Running deadline notification check…");
      try {
        await runNotificationCheck();
        console.log("[cron] Done.");
      } catch (err) {
        console.error("[cron] Error:", err.message);
      }
    },
    { timezone: "Asia/Ho_Chi_Minh" },
  );

  console.log("[cron] Deadline notification job scheduled (08:00 ICT).");
}

module.exports = { startCron };
