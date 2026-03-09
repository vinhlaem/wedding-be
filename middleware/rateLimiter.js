/**
 * Lightweight in-memory rate limiter for Vercel serverless.
 *
 * ⚠️  Serverless caveat: each function instance has its own memory.
 *     This limiter protects *one instance* from being flooded.
 *     For global cross-instance rate limiting you would need Redis (Upstash).
 *     For a wedding site with 200-300 users this per-instance limiter is
 *     sufficient — it prevents any single IP from hammering one instance.
 *
 * Usage:
 *   const { apiLimiter, writeLimiter } = require('./middleware/rateLimiter');
 *   app.use('/api/messages', writeLimiter, messageRoutes);
 *   app.use('/api/media',    apiLimiter,   mediaRoutes);
 */

const DEFAULT_WINDOW_MS = 60_000; // 1 minute
const MAX_MAP_SIZE = 5_000; // evict oldest entries to cap memory

function createRateLimiter({
  windowMs = DEFAULT_WINDOW_MS,
  max = 60, // max requests per IP per window
  message = "Too many requests, please try again later.",
  skipRoutes = [], // array of path prefixes to skip
} = {}) {
  // ip -> { count, resetAt }
  const hits = new Map();

  // Periodic cleanup: every window, remove expired entries.
  // (setInterval keeps the module alive but doesn't block — safe on Vercel.)
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(ip);
    }
  }, windowMs);

  return (req, res, next) => {
    // Skip limiter for health check and excluded paths.
    if (
      req.path === "/health" ||
      skipRoutes.some((p) => req.path.startsWith(p))
    ) {
      return next();
    }

    // Use X-Forwarded-For (Vercel sets this) falling back to remoteAddress.
    const ip =
      (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
      req.socket.remoteAddress ||
      "unknown";

    const now = Date.now();
    let entry = hits.get(ip);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 1, resetAt: now + windowMs };
      hits.set(ip, entry);
    } else {
      entry.count++;
    }

    // Prevent the map from growing unbounded on traffic spikes.
    if (hits.size > MAX_MAP_SIZE) {
      // Evict the oldest (first inserted) entry.
      hits.delete(hits.keys().next().value);
    }

    // Set standard rate-limit response headers.
    res.set("X-RateLimit-Limit", String(max));
    res.set("X-RateLimit-Remaining", String(Math.max(0, max - entry.count)));
    res.set("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > max) {
      res.set("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ success: false, message });
    }

    next();
  };
}

// ── Prebuilt limiters ────────────────────────────────────────────────────────

/**
 * General API limiter — 120 req / min per IP.
 * Covers read-heavy media endpoints accessed by all site visitors.
 */
const apiLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 120,
  message: "Rate limit exceeded. Please slow down.",
});

/**
 * Write limiter — 10 req / min per IP.
 * Covers POST /api/messages (sending a wish). Prevents spam.
 */
const writeLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 10,
  message: "Too many submissions. Please wait a minute before trying again.",
});

module.exports = { createRateLimiter, apiLimiter, writeLimiter };
