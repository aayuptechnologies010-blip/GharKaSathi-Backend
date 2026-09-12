const mongoose = require('mongoose');

const bankDetailsSchema = new mongoose.Schema(
  {
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifscCode: { type: String, trim: true, uppercase: true },
    accountHolderName: { type: String, trim: true },
  },
  { _id: false }
);

const serviceProviderSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    firebaseUid: { type: String, required: true, unique: true },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
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

    // KYC
    aadhaarNumber: { type: String, trim: true },
    aadhaarFrontImage: { type: String },
    aadhaarBackImage: { type: String },
    kycStatus: {
      type: String,
      enum: ['pending', 'submitted', 'approved', 'rejected'],
      default: 'pending',
    },
    kycRejectionReason: { type: String },

    // Profile
    bio: { type: String, trim: true },
    skills: [{ type: String, trim: true }],
    languages: [{ type: String, trim: true }],
    experienceYears: { type: Number, default: 0 },
    experienceDescription: { type: String, trim: true },
    baseHourlyRate: { type: Number, default: 0 },

    // Bank
    bankDetails: bankDetailsSchema,

    // Push notifications token
    fcmToken: { type: String },

    // Status
    isApproved: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: false },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    completedJobs: { type: Number, default: 0 },
    earnings: { type: Number, default: 0 },
    withdrawnAmount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

serviceProviderSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('ServiceProvider', serviceProviderSchema);
