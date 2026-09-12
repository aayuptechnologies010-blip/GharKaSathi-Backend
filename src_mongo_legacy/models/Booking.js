const mongoose = require('mongoose');

const BOOKING_STATUSES = [
  'pending',
  'broadcasted',
  'accepted',
  'rejected',
  'on-the-way',
  'reached',
  'started',
  'completed',
  'paid',
  'reviewed',
  'cancelled',
];

const subServiceSnapshotSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    basePrice: { type: Number, required: true },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceProvider', required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    subService: subServiceSnapshotSchema,
    timeSlot: { type: String },
    status: { type: String, enum: BOOKING_STATUSES, default: 'pending' },
    scheduledAt: { type: Date, required: true },
    address: {
      text: { type: String, trim: true },
      lat: Number,
      lng: Number,
    },
    notes: { type: String },
    couponCode: { type: String },
    price: { type: Number },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    finalAmount: { type: Number },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    jobStartedAt: { type: Date },
    jobElapsedSeconds: { type: Number, default: 0 },
    workChecklist: [{
      item: { type: String },
      done: { type: Boolean, default: false },
    }],
  },
  { timestamps: true }
);

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
module.exports.BOOKING_STATUSES = BOOKING_STATUSES;
