const express = require("express");
const connectDB = require("./database");
const app = express();
const PORT = 9000;
const messageRoutes = require("./routes/message");
const cors = require("cors");
const bodyParser = require("body-parser");

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/api/messages", messageRoutes);

connectDB();

app.get("/", (req, res) => {
  res.send("Hello from Express!");
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
