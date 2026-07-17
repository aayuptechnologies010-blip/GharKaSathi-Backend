const User = require('../models/User');
const ServiceProvider = require('../models/ServiceProvider');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/admin/payments?status=paid&from=2026-01-01&to=2026-12-31
const getPayments = asyncHandler(async (req, res) => {
  const { status, from, to } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const payments = await Payment.find(filter)
    .populate('user', 'name phone')
    .populate('provider', 'name phone')
    .populate('booking', 'category scheduledAt')
    .sort('-createdAt');
  res.json(payments);
});

// GET /api/admin/payments/summary
const getPaymentSummary = asyncHandler(async (req, res) => {
  const [summary] = await Payment.aggregate([
    { $match: { status: 'paid' } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
        totalCommission: { $sum: '$commissionAmount' },
        totalPayout: { $sum: '$payoutAmount' },
        paymentCount: { $sum: 1 },
      },
    },
  ]);

  res.json(summary || { totalRevenue: 0, totalCommission: 0, totalPayout: 0, paymentCount: 0 });
});

// GET /api/admin/analytics
const getAnalytics = asyncHandler(async (req, res) => {
  const [userCount, providerCount, pendingProviderCount, bookingsByStatus, topCategories] = await Promise.all([
    User.countDocuments({}),
    ServiceProvider.countDocuments({ isApproved: true }),
    ServiceProvider.countDocuments({ isApproved: false }),
    Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Booking.aggregate([
      { $group: { _id: '$category', bookings: { $sum: 1 } } },
      { $sort: { bookings: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
      { $unwind: '$category' },
      { $project: { _id: 0, category: '$category.name', bookings: 1 } },
    ]),
  ]);

  const [paymentTotals] = await Payment.aggregate([
    { $match: { status: 'paid' } },
    { $group: { _id: null, totalRevenue: { $sum: '$amount' }, totalCommission: { $sum: '$commissionAmount' } } },
  ]);

  res.json({
    users: userCount,
    approvedProviders: providerCount,
    pendingProviders: pendingProviderCount,
    bookingsByStatus: bookingsByStatus.reduce((acc, b) => ({ ...acc, [b._id]: b.count }), {}),
    topCategories,
    revenue: paymentTotals?.totalRevenue || 0,
    commissionEarned: paymentTotals?.totalCommission || 0,
  });
});

module.exports = { getPayments, getPaymentSummary, getAnalytics };
