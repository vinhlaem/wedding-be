/**
 * scripts/createIndexes.js
 *
 * One-time script to create optimal MongoDB indexes for the wedding API.
 * Run once after deployment or when spinning up a new DB:
 *
 *   node scripts/createIndexes.js
 *
 * Indexes are idempotent — safe to run multiple times.
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("❌  MONGO_URI environment variable is not set.");
  process.exit(1);
}

async function createIndexes() {
  await mongoose.connect(MONGO_URI, {
    maxPoolSize: 2,
    serverSelectionTimeoutMS: 10_000,
  });
  console.log("✅  Connected to MongoDB");

  const db = mongoose.connection.db;

  // ── Media collection ────────────────────────────────────────────────────────
  const media = db.collection("media");

  // Primary query pattern: filter by component, sort by order
  await media.createIndex(
    { component: 1, order: 1 },
    { name: "component_order", background: true },
  );
  console.log("   ✓  media: { component, order }");

  // Role-based sub-queries (e.g. profile bride/groom, video, quote)
  await media.createIndex(
    { component: 1, role: 1 },
    { name: "component_role", background: true, sparse: true },
  );
  console.log("   ✓  media: { component, role }");

  // ── Messages collection ─────────────────────────────────────────────────────
  const messages = db.collection("messages");

  // Default sort is newest-first; index supports skip/limit pagination
  await messages.createIndex(
    { createdAt: -1 },
    { name: "createdAt_desc", background: true },
  );
  console.log("   ✓  messages: { createdAt -1 }");

  await mongoose.disconnect();
  console.log("\n🎉  All indexes created successfully.");
}

createIndexes().catch((err) => {
  console.error("❌  Index creation failed:", err.message);
  mongoose.disconnect();
  process.exit(1);
});
