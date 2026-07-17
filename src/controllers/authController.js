const bcrypt = require('bcryptjs');
const admin = require('../config/firebase');
const User = require('../models/User');
const ServiceProvider = require('../models/ServiceProvider');
const Admin = require('../models/Admin');
const asyncHandler = require('../utils/asyncHandler');
const generateToken = require('../utils/generateToken');

// POST /api/auth/verify-otp
// Client verifies the OTP with Firebase phone auth and sends us the resulting idToken.
// We verify it server-side, then find-or-create the account for the requested role.
const verifyOtp = asyncHandler(async (req, res) => {
  const { idToken, role, name } = req.body;

  if (!idToken || !['user', 'provider'].includes(role)) {
    return res.status(400).json({ message: 'idToken and role (user|provider) are required' });
  }

  const decoded = await admin.auth().verifyIdToken(idToken);
  const phone = decoded.phone_number;
  const firebaseUid = decoded.uid;

  if (!phone) {
    return res.status(400).json({ message: 'Token has no phone number' });
  }

  const Model = role === 'user' ? User : ServiceProvider;
  let account = await Model.findOne({ firebaseUid });

  let isNewAccount = false;
  if (!account) {
    isNewAccount = true;
    account = await Model.create({
      name: name || 'New ' + (role === 'user' ? 'User' : 'Service Provider'),
      phone,
      firebaseUid,
    });
  }

  const token = generateToken({ id: account._id, role });

  res.status(isNewAccount ? 201 : 200).json({
    token,
    isNewAccount,
    account,
  });
});

// POST /api/auth/admin/login
const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const account = await Admin.findOne({ email: email.toLowerCase() });
  if (!account) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const match = await bcrypt.compare(password, account.password);
  if (!match) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = generateToken({ id: account._id, role: 'admin' });

  res.json({ token, account: { id: account._id, name: account.name, email: account.email } });
});

module.exports = { verifyOtp, adminLogin };
