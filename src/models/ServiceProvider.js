const mongoose = require('mongoose');

const serviceProviderSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    firebaseUid: { type: String, required: true, unique: true },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true }],
    address: {
      text: { type: String, trim: true },
      lat: Number,
      lng: Number,
    },
    // GeoJSON mirror of address.lat/lng, kept in sync on every location update — required for $near queries.
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },
    profileImage: { type: String },
    documents: [{ type: String }],
    isApproved: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: true },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    earnings: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

serviceProviderSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('ServiceProvider', serviceProviderSchema);
