const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    senderRole: { type: String, enum: ['user', 'provider'], required: true },
    text: { type: String, required: true, trim: true },
    imageUrl: { type: String },
  },
  { timestamps: true }
);

messageSchema.index({ booking: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
