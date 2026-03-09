const mongoose = require("mongoose");
require("dotenv").config();

/**
 * Singleton MongoDB connection for Vercel serverless.
 *
 * On Vercel, each function instance may be reused across many requests.
 * We store the connection promise in the module scope (and optionally on
 * `global` so it survives hot-reload in dev) to avoid opening a new TCP
 * connection on every invocation.
 *
 * Key options chosen for M0 / serverless:
 *   maxPoolSize: 5   — keep the connection pool small so many instances
 *                       don't exhaust Atlas M0's ~500-connection limit.
 *   serverSelectionTimeoutMS: 5000 — fail fast on cold-start if Atlas is
 *                       unreachable instead of hanging for 30 s.
 *   socketTimeoutMS:  45000 — matches Vercel's 60-s function timeout.
 *   bufferCommands:   false — throw immediately if no connection instead
 *                       of silently queuing; makes bugs visible early.
 */

const MONGO_OPTIONS = {
  maxPoolSize: 5,
  minPoolSize: 1,
  serverSelectionTimeoutMS: 5_000,
  socketTimeoutMS: 45_000,
  bufferCommands: false,
};

// Cache the promise so subsequent calls within the same instance skip connecting.
let cached = global._mongooseCache;
if (!cached) {
  cached = global._mongooseCache = { conn: null, promise: null };
}

const connectDB = async () => {
  // Already connected — return immediately (zero DB round-trips).
  if (cached.conn) return cached.conn;

  // Connection in progress in another async path — await the same promise.
  if (!cached.promise) {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error("MONGO_URI environment variable is not set");

    cached.promise = mongoose
      .connect(uri, MONGO_OPTIONS)
      .then((mongooseInstance) => {
        console.log("[MongoDB] connection established");
        return mongooseInstance;
      })
      .catch((err) => {
        // Reset so the next cold-start can retry.
        cached.promise = null;
        console.error("[MongoDB] connection failed:", err.message);
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
};

module.exports = connectDB;
