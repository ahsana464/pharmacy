const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema(
  {
    name:         { type: String, required: true, trim: true },
    category:     { type: String, default: "Other" },
    batch:        { type: String, default: "—" },
    manufacturer: { type: String, default: "—" },
    expiry:       { type: String, required: true },   // stored as "YYYY-MM-DD"
    qty:          { type: Number, required: true, min: 0 },
    price:        { type: Number, default: 0 },
    threshold:    { type: Number, default: 10 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Medicine", medicineSchema);
