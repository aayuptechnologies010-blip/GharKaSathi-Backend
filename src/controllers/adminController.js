const ServiceProvider = require('../models/ServiceProvider');
const User = require('../models/User');
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

module.exports = {
  getProviders,
  approveProvider,
  suspendProvider,
  reinstateProvider,
  getUsers,
  suspendUser,
  reinstateUser,
};
