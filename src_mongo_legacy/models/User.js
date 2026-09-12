const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    dob: { type: String },
    address: {
      text: { type: String, trim: true },
      lat: Number,
      lng: Number,
    },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
    profileImage: { type: String },
    savedAddresses: [{ type: String }],
    isProfileCompleted: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
