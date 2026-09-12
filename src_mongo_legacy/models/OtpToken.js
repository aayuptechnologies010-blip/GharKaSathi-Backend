const mongoose = require('mongoose');

const otpTokenSchema = new mongoose.Schema({
  phone: { type: String, required: true, trim: true },
  role: { type: String, enum: ['user', 'provider'], required: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

otpTokenSchema.index({ phone: 1, role: 1 });

module.exports = mongoose.model('OtpToken', otpTokenSchema);
