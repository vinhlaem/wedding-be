/**
 * In-memory async request queue middleware (no external deps).
 *
 * @param {object} options
 * @param {number} options.concurrency  - max parallel requests running at once
 * @param {number} options.maxQueue     - max requests waiting in line before returning 503
 * @param {number} options.timeoutMs    - max ms a request can wait in queue (0 = no timeout)
 * @returns {function} Express middleware
 */
function createQueue({
  concurrency = 2,
  maxQueue = 30,
  timeoutMs = 30_000,
} = {}) {
  let active = 0;
  const queue = [];

  const drain = () => {
    while (active < concurrency && queue.length > 0) {
      const job = queue.shift();
      active++;
      job.run().finally(() => {
        active--;
        drain();
      });
    }
  };

  return (req, res, next) => {
    // Queue is full → reject immediately
    if (queue.length >= maxQueue) {
      return res.status(503).json({
        success: false,
        message: "Server is busy. Please try again in a moment.",
        retryAfter: 5,
      });
    }

    let settled = false;
    let timeoutId = null;

    const run = () =>
      new Promise((resolve) => {
        // Resolve when response finishes (success or error)
        const finish = () => {
          if (settled) return;
          settled = true;
          if (timeoutId) clearTimeout(timeoutId);
          resolve();
        };

        res.once("finish", finish);
        res.once("close", finish);

        // Actually hand control to the next handler
        next();
      });

    // Optional per-request queue timeout
    const enqueued = { run };

    if (timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        // Remove from queue if still waiting (hasn't run yet)
        const idx = queue.indexOf(enqueued);
        if (idx !== -1) {
          queue.splice(idx, 1);
          if (!res.headersSent) {
            res.status(503).json({
              success: false,
              message: "Request timed out in queue.",
            });
          }
        }
      }, timeoutMs);
    }

    queue.push(enqueued);
    drain();
  };
}

/**
 * Light queue — for fast read/write operations (GET, DELETE, reorder).
 * Allows moderate concurrency.
 */
const lightQueue = createQueue({
  concurrency: Number(process.env.QUEUE_LIGHT_CONCURRENCY) || 3,
  maxQueue: Number(process.env.QUEUE_LIGHT_MAX) || 50,
  timeoutMs: 15_000,
});

/**
 * Heavy queue — for Cloudinary uploads and Google Drive imports.
 * Sequential (concurrency=1) to avoid spiking CPU/memory on a weak host.
 */
const heavyQueue = createQueue({
  concurrency: Number(process.env.QUEUE_HEAVY_CONCURRENCY) || 1,
  maxQueue: Number(process.env.QUEUE_HEAVY_MAX) || 10,
  timeoutMs: 60_000, // uploads can take a while
});

module.exports = { lightQueue, heavyQueue, createQueue };
