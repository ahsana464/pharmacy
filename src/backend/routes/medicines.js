const express = require("express");
const router  = express.Router();
const Medicine = require("../models/Medicine");

// GET all medicines
router.get("/", async (req, res) => {
  try {
    const medicines = await Medicine.find().sort({ createdAt: -1 });
    res.json(medicines);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch medicines", error: err.message });
  }
});

// GET single medicine
router.get("/:id", async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) return res.status(404).json({ message: "Medicine not found" });
    res.json(medicine);
  } catch (err) {
    res.status(500).json({ message: "Error fetching medicine", error: err.message });
  }
});

// POST add new medicine
router.post("/", async (req, res) => {
  try {
    const medicine = new Medicine(req.body);
    const saved = await medicine.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: "Failed to add medicine", error: err.message });
  }
});

// PATCH update qty (dispense)
router.patch("/:id/dispense", async (req, res) => {
  try {
    const { qty } = req.body;
    if (!qty || qty < 1) return res.status(400).json({ message: "Invalid quantity" });

    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) return res.status(404).json({ message: "Medicine not found" });
    if (qty > medicine.qty) return res.status(400).json({ message: "Not enough stock" });

    medicine.qty -= qty;
    const updated = await medicine.save();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Dispense failed", error: err.message });
  }
});

// PUT update full medicine
router.put("/:id", async (req, res) => {
  try {
    const updated = await Medicine.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: "Medicine not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: "Update failed", error: err.message });
  }
});

// DELETE medicine
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Medicine.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Medicine not found" });
    res.json({ message: "Medicine deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Delete failed", error: err.message });
  }
});

module.exports = router;
