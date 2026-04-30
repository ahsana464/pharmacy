const express = require("express");
const router  = express.Router();
const mongoose = require("mongoose");

const dispenseLogSchema = new mongoose.Schema(
  {
    medicineId:   { type: mongoose.Schema.Types.ObjectId, ref: "Medicine" },
    name:         String,
    batch:        String,
    qty:          Number,
    remaining:    Number,
  },
  { timestamps: true }
);

const DispenseLog = mongoose.model("DispenseLog", dispenseLogSchema);

// GET all logs
router.get("/", async (req, res) => {
  try {
    const logs = await DispenseLog.find().sort({ createdAt: -1 }).limit(100);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch logs", error: err.message });
  }
});

// POST new log entry
router.post("/", async (req, res) => {
  try {
    const log = new DispenseLog(req.body);
    const saved = await log.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: "Failed to save log", error: err.message });
  }
});

module.exports = router;
