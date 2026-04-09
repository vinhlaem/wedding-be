const webpush = require("web-push");

const VAPID_PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT     = process.env.VAPID_SUBJECT || "mailto:admin@wedding.local";

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.warn("[push] VAPID keys not set — push notifications disabled.");
} else {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

/**
 * Send a push notification to a single subscription.
 * Returns true on success, false if the subscription is expired/gone.
 */
async function sendPush(subscription, payload) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false;
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
      },
      JSON.stringify(payload),
    );
    return true;
  } catch (err) {
    // 410 Gone / 404 Not Found → subscription no longer valid
    if (err.statusCode === 410 || err.statusCode === 404) {
      return "gone";
    }
    console.error("[push] sendNotification error:", err.message);
    return false;
  }
}

module.exports = { sendPush, VAPID_PUBLIC_KEY };
