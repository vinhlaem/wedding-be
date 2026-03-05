require("dotenv").config();
const express = require("express");
const connectDB = require("./database");
const app = express();
const PORT = process.env.PORT || 9000;
const messageRoutes = require("./routes/message");
const mediaRoutes = require("./routes/media");
const cors = require("cors");
const bodyParser = require("body-parser");

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : "*",
    credentials: true,
  }),
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/api/messages", messageRoutes);
app.use("/api/media", mediaRoutes);

connectDB();

app.get("/", (req, res) => {
  res.send("Hello from Express!");
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
