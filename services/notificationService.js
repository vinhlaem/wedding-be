const Budget = require("../models/Budget");
const Notification = require("../models/Notification");
const Subscription = require("../models/Subscription");
const { sendPush } = require("./pushService");

// Stage number → daysRemaining threshold
const STAGES = [
  { stage: 4, label: "overdue", check: (d) => d < 0 },
  { stage: 3, label: "1day", check: (d) => d >= 0 && d < 2 },
  { stage: 2, label: "3days", check: (d) => d >= 2 && d < 4 },
  { stage: 1, label: "7days", check: (d) => d >= 4 && d <= 7 },
];

function stageForDays(daysRemaining) {
  for (const s of STAGES) {
    if (s.check(daysRemaining)) return s.stage;
  }
  return 0;
}

function buildMessage(items, daysRemaining) {
  const prefix =
    daysRemaining < 0
      ? "Đã quá hạn thanh toán"
      : daysRemaining === 0
        ? "Hôm nay đến hạn thanh toán"
        : daysRemaining === 1
          ? "Ngày mai đến hạn thanh toán"
          : `Còn ${daysRemaining} ngày đến hạn thanh toán`;

  if (items.length === 1) {
    return `${prefix} ${items[0].itemName}`;
  }
  if (items.length <= 3) {
    return `${prefix} ${items.length} khoản: ${items.map((i) => i.itemName).join(", ")}`;
  }
  return `${prefix} ${items.length} khoản. Mở app để xem chi tiết.`;
}

/**
 * Core check — runs inside the cron job and can be called on-demand.
 */
async function runNotificationCheck() {
  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  // Only look at items that are not completed and have a deadline
  const pendingItems = await Budget.find({
    status: { $ne: "hoan-thanh" },
    deadline: { $ne: null },
  }).lean();

  if (!pendingItems.length) return;

  // Group by deadline date string "YYYY-MM-DD"
  const byDeadline = {};
  for (const item of pendingItems) {
    const dl = new Date(item.deadline);
    const dlStr = dl.toISOString().split("T")[0];
    const daysRemaining = Math.floor((dl - today) / 86_400_000);
    const stage = stageForDays(daysRemaining);
    if (stage === 0) continue; // outside any alert window
    if (item.notifyStage >= stage) continue; // already sent this or higher stage

    if (!byDeadline[dlStr]) byDeadline[dlStr] = {};
    if (!byDeadline[dlStr][stage])
      byDeadline[dlStr][stage] = { items: [], daysRemaining };
    byDeadline[dlStr][stage].items.push(item);
  }

  const subscriptions = await Subscription.find().lean();
  if (!subscriptions.length) return;

  for (const [dlStr, stages] of Object.entries(byDeadline)) {
    for (const [stageStr, { items, daysRemaining }] of Object.entries(stages)) {
      const stage = Number(stageStr);
      const message = buildMessage(items, daysRemaining);

      // Deduplicate: skip if already stored
      let notif = await Notification.findOne({ deadlineDate: dlStr, stage });
      if (notif && notif.sent) continue;

      // Upsert notification record
      if (!notif) {
        notif = await Notification.create({
          expenseIds: items.map((i) => i._id),
          stage,
          deadlineDate: dlStr,
          message,
          isRead: false,
          sent: false,
        });
      }

      // Fan-out to all subscriptions
      const payload = {
        title: "Wedding Budget 💍",
        body: message,
        tag: `deadline-${dlStr}-${stage}`,
        data: {
          deadlineDate: dlStr,
          stage,
          notificationId: notif._id.toString(),
        },
      };

      let anySent = false;
      const deadEndpoints = [];

      for (const sub of subscriptions) {
        const result = await sendPush(sub, payload);
        if (result === "gone") deadEndpoints.push(sub._id);
        else if (result) anySent = true;
      }

      // Remove stale subscriptions
      if (deadEndpoints.length) {
        await Subscription.deleteMany({ _id: { $in: deadEndpoints } });
      }

      // Mark notification as sent
      if (anySent) {
        await Notification.updateOne({ _id: notif._id }, { sent: true });
      }

      // Update notifyStage on each item to this stage (or keep higher)
      for (const item of items) {
        if (item.notifyStage < stage) {
          await Budget.updateOne(
            { _id: item._id },
            { notifyStage: stage, lastNotificationSent: new Date() },
          );
        }
      }
    }
  }
}

module.exports = { runNotificationCheck };
