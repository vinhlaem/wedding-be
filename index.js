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

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : "*",
    credentials: true,
  }),
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Apply light queue globally to all message routes
app.use("/api/messages", lightQueue, messageRoutes);
app.use("/api/media", mediaRoutes); // media routes manage their own queues

connectDB();

app.get("/", (req, res) => {
  res.send("Hello from Express!");
});

// Health check — no queue needed
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
