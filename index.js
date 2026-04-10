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
const { startCron } = require("./services/cronService");
const { seedBudgets } = require("./scripts/seedBudget");
const cors = require("cors");
const bodyParser = require("body-parser");
const { lightQueue } = require("./middleware/requestQueue");
const { apiLimiter, writeLimiter } = require("./middleware/rateLimiter");

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : "*",
    credentials: true,
  }),
);

// Limit body size to prevent oversized payload attacks.
app.use(bodyParser.json({ limit: "256kb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "256kb" }));

// ── DB connection singleton — await before handling any request ──────────────
// This ensures the first cold-start request doesn't race with the connect.
const dbReady = connectDB()
  .then(async () => {
    await seedBudgets();
  })
  .catch((err) => {
    console.error("[startup] MongoDB connection failed:", err.message);
    process.exit(1);
  });

app.use(async (req, res, next) => {
  await dbReady;
  next();
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
