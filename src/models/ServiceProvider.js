const mongoose = require('mongoose');

const serviceProviderSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true }],
    address: {
      text: { type: String, trim: true },
      lat: Number,
      lng: Number,
    },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
    profileImage: { type: String },
    documents: [{ type: String }],
    bio: { type: String, trim: true },
    skills: [{ type: String, trim: true }],
    languages: [{ type: String, trim: true }],
    experienceYears: { type: Number, default: 0 },
    baseHourlyRate: { type: Number, default: 0 },
    isApproved: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: true },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    completedJobs: { type: Number, default: 0 },
    earnings: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

serviceProviderSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('ServiceProvider', serviceProviderSchema);
