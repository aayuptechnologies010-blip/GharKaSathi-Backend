const Category = require('../models/Category');
const ServiceProvider = require('../models/ServiceProvider');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Review = require('../models/Review');
const Withdrawal = require('../models/Withdrawal');
const asyncHandler = require('../utils/asyncHandler');

// ─── Profile ────────────────────────────────────────────────────────────────

// GET /api/providers/me
const getMe = asyncHandler(async (req, res) => {
  const provider = await ServiceProvider.findById(req.account._id).populate('categories', 'name icon slug');
  res.json(provider);
});

// PUT /api/providers/me
const updateMe = asyncHandler(async (req, res) => {
  const {
    name, email, profileImage, categories, documents,
    bio, skills, languages, experienceYears, experienceDescription,
    baseHourlyRate, address, fcmToken,
  } = req.body;

  if (categories !== undefined) {
    if (categories.length > 0) {
      const found = await Category.find({ _id: { $in: categories }, isActive: true });
      if (found.length !== categories.length) {
        return res.status(400).json({ message: 'One or more categories are invalid' });
      }
    }
    req.account.categories = categories;
  }

  const fields = { name, email, profileImage, documents, bio, skills, languages, experienceYears, experienceDescription, baseHourlyRate, address, fcmToken };
  Object.entries(fields).forEach(([k, v]) => { if (v !== undefined) req.account[k] = v; });

  await req.account.save();
  res.json(req.account);
});

// PUT /api/providers/me/location
const updateLocation = asyncHandler(async (req, res) => {
  const { text, lat, lng } = req.body;
  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ message: 'lat and lng are required' });
  }
  req.account.address = { text, lat: Number(lat), lng: Number(lng) };
  req.account.location = { type: 'Point', coordinates: [Number(lng), Number(lat)] };
  await req.account.save();
  res.json(req.account);
});

// PUT /api/providers/me/availability
const updateAvailability = asyncHandler(async (req, res) => {
  const { isAvailable } = req.body;
  if (typeof isAvailable !== 'boolean') {
    return res.status(400).json({ message: 'isAvailable (boolean) is required' });
  }
  req.account.isAvailable = isAvailable;
  await req.account.save();
  res.json({ isAvailable: req.account.isAvailable });
});

// ─── KYC ────────────────────────────────────────────────────────────────────

// PUT /api/providers/me/kyc
// Provider submits Aadhaar number + front/back image URLs
const submitKyc = asyncHandler(async (req, res) => {
  const { aadhaarNumber, aadhaarFrontImage, aadhaarBackImage } = req.body;

  if (!aadhaarNumber || !aadhaarFrontImage) {
    return res.status(400).json({ message: 'aadhaarNumber and aadhaarFrontImage are required' });
  }
  if (!/^\d{12}$/.test(aadhaarNumber.replace(/\s/g, ''))) {
    return res.status(400).json({ message: 'aadhaarNumber must be 12 digits' });
  }
  if (req.account.kycStatus === 'approved') {
    return res.status(400).json({ message: 'KYC is already approved' });
  }

  req.account.aadhaarNumber = aadhaarNumber.replace(/\s/g, '');
  req.account.aadhaarFrontImage = aadhaarFrontImage;
  if (aadhaarBackImage) req.account.aadhaarBackImage = aadhaarBackImage;
  req.account.kycStatus = 'submitted';
  req.account.kycRejectionReason = undefined;
  await req.account.save();

  res.json({ message: 'KYC submitted successfully', kycStatus: req.account.kycStatus });
});

// ─── Bank Details ────────────────────────────────────────────────────────────

// PUT /api/providers/me/bank
const updateBankDetails = asyncHandler(async (req, res) => {
  const { bankName, accountNumber, ifscCode, accountHolderName } = req.body;

  if (!bankName || !accountNumber || !ifscCode || !accountHolderName) {
    return res.status(400).json({ message: 'bankName, accountNumber, ifscCode and accountHolderName are required' });
  }
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.toUpperCase())) {
    return res.status(400).json({ message: 'Invalid IFSC code format' });
  }

  req.account.bankDetails = { bankName, accountNumber, ifscCode: ifscCode.toUpperCase(), accountHolderName };
  await req.account.save();

  res.json({ message: 'Bank details saved', bankDetails: req.account.bankDetails });
});

// ─── Earnings & Withdrawals ──────────────────────────────────────────────────

// GET /api/providers/me/earnings
const getEarnings = asyncHandler(async (req, res) => {
  const provider = req.account;

  // This month earnings from payments
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [thisMonthPayments, lastMonthPayments, recentTransactions] = await Promise.all([
    Payment.aggregate([
      { $match: { provider: provider._id, status: 'paid', paidAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$payoutAmount' } } },
    ]),
    Payment.aggregate([
      { $match: { provider: provider._id, status: 'paid', paidAt: { $gte: lastMonthStart, $lt: monthStart } } },
      { $group: { _id: null, total: { $sum: '$payoutAmount' } } },
    ]),
    Payment.find({ provider: provider._id, status: 'paid' })
      .populate('booking', 'subService scheduledAt')
      .sort('-paidAt')
      .limit(10),
  ]);

  res.json({
    totalBalance: provider.earnings - provider.withdrawnAmount,
    totalEarnings: provider.earnings,
    withdrawnAmount: provider.withdrawnAmount,
    thisMonth: thisMonthPayments[0]?.total || 0,
    lastMonth: lastMonthPayments[0]?.total || 0,
    recentTransactions,
  });
});

// POST /api/providers/me/withdraw
const requestWithdrawal = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount < 1) {
    return res.status(400).json({ message: 'amount must be at least 1' });
  }

  const balance = req.account.earnings - req.account.withdrawnAmount;
  if (amount > balance) {
    return res.status(400).json({ message: `Insufficient balance. Available: ₹${balance}` });
  }
  if (!req.account.bankDetails?.accountNumber) {
    return res.status(400).json({ message: 'Please add bank details before withdrawing' });
  }

  // Check no pending withdrawal already
  const pending = await Withdrawal.findOne({ provider: req.account._id, status: 'pending' });
  if (pending) {
    return res.status(400).json({ message: 'You already have a pending withdrawal request' });
  }

  const withdrawal = await Withdrawal.create({
    provider: req.account._id,
    amount,
    bankSnapshot: req.account.bankDetails,
  });

  res.status(201).json(withdrawal);
});

// GET /api/providers/me/withdrawals
const getWithdrawals = asyncHandler(async (req, res) => {
  const withdrawals = await Withdrawal.find({ provider: req.account._id }).sort('-createdAt');
  res.json(withdrawals);
});

// ─── Job History ─────────────────────────────────────────────────────────────

// GET /api/providers/me/jobs?status=completed&page=1
const getJobHistory = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const filter = { provider: req.account._id };
  if (status) filter.status = status;

  const [jobs, total] = await Promise.all([
    Booking.find(filter)
      .populate('user', 'name phone')
      .populate('category', 'name icon')
      .sort('-createdAt')
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit)),
    Booking.countDocuments(filter),
  ]);

  res.json({ jobs, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
});

// ─── Reviews ─────────────────────────────────────────────────────────────────

// GET /api/providers/me/reviews
const getMyReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ provider: req.account._id })
    .populate('user', 'name profileImage')
    .populate('booking', 'subService scheduledAt')
    .sort('-createdAt');
  res.json(reviews);
});

// ─── Public endpoints ─────────────────────────────────────────────────────────

// GET /api/providers/search?categoryId=&lat=&lng=&radiusKm=10
const searchProviders = asyncHandler(async (req, res) => {
  const { categoryId, lat, lng, radiusKm } = req.query;
  const filter = { isApproved: true, isAvailable: true, isActive: true };
  if (categoryId) filter.categories = categoryId;

  let providers;
  if (lat !== undefined && lng !== undefined) {
    const radiusMeters = (Number(radiusKm) || 10) * 1000;
    providers = await ServiceProvider.find({
      ...filter,
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
          $maxDistance: radiusMeters,
        },
      },
    }).populate('categories', 'name icon');
  } else {
    providers = await ServiceProvider.find(filter).populate('categories', 'name icon').sort('-ratingAvg');
  }

  res.json(providers);
});

// GET /api/providers/:id
const getProviderById = asyncHandler(async (req, res) => {
  const provider = await ServiceProvider.findById(req.params.id).populate('categories', 'name icon slug');
  if (!provider || !provider.isActive) {
    return res.status(404).json({ message: 'Provider not found' });
  }
  res.json(provider);
});

// GET /api/providers/:id/reviews
const getProviderReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ provider: req.params.id })
    .populate('user', 'name profileImage')
    .sort('-createdAt');
  res.json(reviews);
});

module.exports = {
  getMe, updateMe, updateLocation, updateAvailability,
  submitKyc, updateBankDetails,
  getEarnings, requestWithdrawal, getWithdrawals,
  getJobHistory, getMyReviews,
  searchProviders, getProviderById, getProviderReviews,
};
