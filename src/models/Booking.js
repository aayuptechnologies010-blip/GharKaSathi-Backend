const mongoose = require('mongoose');

const BOOKING_STATUSES = ['pending', 'accepted', 'rejected', 'in-progress', 'completed', 'cancelled'];

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceProvider', required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    status: { type: String, enum: BOOKING_STATUSES, default: 'pending' },
    scheduledAt: { type: Date, required: true },
    address: {
      text: { type: String, trim: true },
      lat: Number,
      lng: Number,
    },
    notes: { type: String },
    price: { type: Number },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  },
  { timestamps: true }
);

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
module.exports.BOOKING_STATUSES = BOOKING_STATUSES;
