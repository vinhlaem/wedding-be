require("dotenv").config();
const express = require("express");
const connectDB = require("./database");
const app = express();
const PORT = process.env.PORT || 9000;
const messageRoutes = require("./routes/message");
const mediaRoutes = require("./routes/media");
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
const dbReady = connectDB().catch((err) => {
  console.error("[startup] MongoDB connection failed:", err.message);
  process.exit(1);
});

app.use(async (req, res, next) => {
  await dbReady;
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
// writeLimiter is tighter (10/min) for the POST /messages write path.
app.use("/api/messages", writeLimiter, lightQueue, messageRoutes);

// apiLimiter is more generous (120/min) for read-heavy media endpoints.
app.use("/api/media", apiLimiter, mediaRoutes);

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
