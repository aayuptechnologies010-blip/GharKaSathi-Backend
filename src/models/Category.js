const mongoose = require('mongoose');

const subServiceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    basePrice: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    icon: { type: String },
    description: { type: String },
    commissionPercent: { type: Number, default: 10, min: 0, max: 100 },
    subServices: [subServiceSchema],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);
