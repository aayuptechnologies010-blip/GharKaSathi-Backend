const bcrypt = require('bcryptjs');
const asyncHandler = require('../utils/asyncHandler');
const Admin = require('../models/Admin');

// GET /api/admin/me
const getMe = asyncHandler(async (req, res) => {
  res.json({ id: req.account._id, name: req.account.name, email: req.account.email, createdAt: req.account.createdAt });
});

// PUT /api/admin/me
const updateMe = asyncHandler(async (req, res) => {
  const { name, email } = req.body;

  if (email !== undefined) {
    const existing = await Admin.findOne({ email: email.toLowerCase(), _id: { $ne: req.account._id } });
    if (existing) {
      return res.status(409).json({ message: 'email already in use' });
    }
    req.account.email = email.toLowerCase();
  }
  if (name !== undefined) req.account.name = name;

  await req.account.save();
  res.json({ id: req.account._id, name: req.account.name, email: req.account.email, createdAt: req.account.createdAt });
});

// PUT /api/admin/me/password
const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'currentPassword and newPassword are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'newPassword must be at least 8 characters' });
  }

  const match = await bcrypt.compare(currentPassword, req.account.password);
  if (!match) {
    return res.status(401).json({ message: 'currentPassword is incorrect' });
  }

  req.account.password = await bcrypt.hash(newPassword, 10);
  await req.account.save();
  res.json({ message: 'Password updated' });
});

module.exports = { getMe, updateMe, updatePassword };
