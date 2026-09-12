const ServiceProvider = require('../models/ServiceProvider');
const User = require('../models/User');
const Withdrawal = require('../models/Withdrawal');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/admin/providers?approved=false
const getProviders = asyncHandler(async (req, res) => {
  const { approved } = req.query;
  const filter = {};
  if (approved !== undefined) filter.isApproved = approved === 'true';

  const providers = await ServiceProvider.find(filter).populate('categories', 'name').sort('-createdAt');
  res.json(providers);
});

// PUT /api/admin/providers/:id/approve
const approveProvider = asyncHandler(async (req, res) => {
  const provider = await ServiceProvider.findById(req.params.id);
  if (!provider) {
    return res.status(404).json({ message: 'Provider not found' });
  }

  provider.isApproved = true;
  await provider.save();
  res.json(provider);
});

// PUT /api/admin/providers/:id/suspend
const suspendProvider = asyncHandler(async (req, res) => {
  const provider = await ServiceProvider.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!provider) {
    return res.status(404).json({ message: 'Provider not found' });
  }
  res.json(provider);
});

// PUT /api/admin/providers/:id/reinstate
const reinstateProvider = asyncHandler(async (req, res) => {
  const provider = await ServiceProvider.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true });
  if (!provider) {
    return res.status(404).json({ message: 'Provider not found' });
  }
  res.json(provider);
});

// GET /api/admin/users
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).sort('-createdAt');
  res.json(users);
});

// PUT /api/admin/users/:id/suspend
const suspendUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.json(user);
});

// PUT /api/admin/users/:id/reinstate
const reinstateUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true });
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.json(user);
});

// PUT /api/admin/providers/:id/kyc/approve
const approveKyc = asyncHandler(async (req, res) => {
  const provider = await ServiceProvider.findById(req.params.id);
  if (!provider) return res.status(404).json({ message: 'Provider not found' });
  if (provider.kycStatus !== 'submitted') {
    return res.status(400).json({ message: 'KYC is not in submitted state' });
  }
  provider.kycStatus = 'approved';
  provider.kycRejectionReason = undefined;
  // Auto-approve the provider account when KYC is approved
  provider.isApproved = true;
  await provider.save();
  res.json({ message: 'KYC approved', provider });
});

// PUT /api/admin/providers/:id/kyc/reject
const rejectKyc = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const provider = await ServiceProvider.findById(req.params.id);
  if (!provider) return res.status(404).json({ message: 'Provider not found' });
  provider.kycStatus = 'rejected';
  provider.kycRejectionReason = reason || 'Documents not clear';
  await provider.save();
  res.json({ message: 'KYC rejected', provider });
});

// GET /api/admin/withdrawals?status=pending
const getWithdrawals = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status) filter.status = status;
  const withdrawals = await Withdrawal.find(filter)
    .populate('provider', 'name phone bankDetails')
    .sort('-createdAt');
  res.json(withdrawals);
});

// PUT /api/admin/withdrawals/:id/approve
// PUT /api/admin/withdrawals/:id/reject
const processWithdrawal = asyncHandler(async (req, res) => {
  const { action, reason } = req.body; // action: 'approve' | 'reject'
  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ message: 'action must be approve or reject' });
  }

  const withdrawal = await Withdrawal.findById(req.params.id);
  if (!withdrawal) return res.status(404).json({ message: 'Withdrawal not found' });
  if (withdrawal.status !== 'pending') {
    return res.status(400).json({ message: 'Withdrawal is already processed' });
  }

  withdrawal.status = action === 'approve' ? 'approved' : 'rejected';
  withdrawal.processedAt = new Date();
  if (action === 'reject') withdrawal.rejectionReason = reason || 'Rejected by admin';

  if (action === 'approve') {
    // Deduct from provider available balance
    await ServiceProvider.findByIdAndUpdate(withdrawal.provider, {
      $inc: { withdrawnAmount: withdrawal.amount },
    });
  }

  await withdrawal.save();
  res.json(withdrawal);
});

module.exports = {
  getProviders,
  approveProvider,
  suspendProvider,
  reinstateProvider,
  getUsers,
  suspendUser,
  reinstateUser,
  approveKyc,
  rejectKyc,
  getWithdrawals,
  processWithdrawal,
};
