require("dotenv").config();
const express = require("express");
const connectDB = require("./database");
const app = express();
const PORT = process.env.PORT || 9000;
const messageRoutes = require("./routes/message");
const mediaRoutes = require("./routes/media");
const accountRoutes = require("./routes/account");
const authRoutes = require("./routes/auth");
const budgetRoutes = require("./routes/budget");
const pushRoutes = require("./routes/push");
const notificationRoutes = require("./routes/notification");
const cronRoutes = require("./routes/cron");
const adminRoutes = require("./routes/admin");
const slidesRoutes = require("./routes/slides");
const reunionRoutes = require("./routes/reunion");
const { startCron } = require("./services/cronService");
const { ensureReunionDatabase } = require("./services/reunionBootstrapService");
const cors = require("cors");
const bodyParser = require("body-parser");
const { lightQueue } = require("./middleware/requestQueue");
const { apiLimiter, writeLimiter } = require("./middleware/rateLimiter");

app.use(
  cors({
    origin(origin, callback) {
      const allowed = (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || "")
        .split(",")
        .map((value) => value.trim().replace(/\/$/, ""))
        .filter(Boolean);
      if (!origin || allowed.length === 0 || allowed.includes(origin.replace(/\/$/, ""))) {
        return callback(null, true);
      }
      return callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true,
  }),
);

// Limit body size to prevent oversized payload attacks.
app.use(bodyParser.json({ limit: "256kb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "256kb" }));

// ── DB connection singleton — await before handling any request ──────────────
// This ensures the first cold-start request doesn't race with the connect.
const dbReady = connectDB().catch((err) => {
  console.error("[startup] MongoDB connection failed:", err.message);
  throw err;
});

// Vercel has no post-deploy migration shell. Ensure reunion indexes and
// idempotent master data on every cold-start before serving any API request.
const appReady = dbReady.then(() => ensureReunionDatabase());

app.use(async (req, res, next) => {
  try {
    await appReady;
    next();
  } catch (error) {
    console.error("[startup] Database bootstrap failed:", error.message);
    res.status(503).json({ success: false, message: "Database initialization failed" });
  }
});

// ── Routes ────────────────────────────────────────────────────────────────────
// Auth — no rate limiter to keep login fast; Google already rate-limits token issuance.
app.use("/api/auth", authRoutes);

// writeLimiter is tighter (10/min) for the POST /messages write path.
app.use("/api/messages", writeLimiter, lightQueue, messageRoutes);

// apiLimiter is more generous (120/min) for read-heavy media endpoints.
// Dashboard write operations (POST/PUT/DELETE) additionally require a valid JWT.
app.use("/api/media", apiLimiter, mediaRoutes);

// Accounts (bank/QR/crypto) - reads are rate-limited by apiLimiter, writes by writeLimiter + JWT
app.use("/api/accounts", apiLimiter, accountRoutes);

// Budget (wedding expense management)
app.use("/api/budgets", apiLimiter, budgetRoutes);

// Push subscriptions
app.use("/api/push", pushRoutes);

// In-app notifications
app.use("/api/notifications", notificationRoutes);

// Vercel Cron trigger — protected by CRON_SECRET
app.use("/api/cron", cronRoutes);

// One-time admin tasks — protected by ADMIN_SECRET (remove after use)
app.use("/api/admin", adminRoutes);

// Slides (CMS-managed slideshow)
app.use("/api/slides", apiLimiter, slidesRoutes);

// Class reunion 2026 (isolated public registration + PIN-protected admin APIs)
app.use("/api/reunion", apiLimiter, reunionRoutes);

// ── Start cron jobs after DB is ready ─────────────────────────────────────────
dbReady.then(() => startCron());

// ── Misc ──────────────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("Wedding API is running.");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
