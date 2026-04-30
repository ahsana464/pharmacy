require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const medicineRoutes = require("./routes/medicines");
const dispenseLogRoutes = require("./routes/dispenseLogs");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: "*" }));
app.use(express.json());

app.use("/api/medicines", medicineRoutes);
app.use("/api/dispense-logs", dispenseLogRoutes);

app.get("/", (req, res) => res.json({ status: "PharmaDesk API running ✅" }));

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB Atlas");
    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });