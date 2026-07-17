const asyncHandler = require('../utils/asyncHandler');

// GET /api/users/me
const getMe = asyncHandler(async (req, res) => {
  res.json(req.account);
});

// PUT /api/users/me
const updateMe = asyncHandler(async (req, res) => {
  const { name, email, profileImage } = req.body;

  if (name !== undefined) req.account.name = name;
  if (email !== undefined) req.account.email = email;
  if (profileImage !== undefined) req.account.profileImage = profileImage;

  await req.account.save();
  res.json(req.account);
});

// PUT /api/users/me/location
const updateLocation = asyncHandler(async (req, res) => {
  const { text, lat, lng } = req.body;

  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ message: 'lat and lng are required' });
  }

  req.account.address = { text, lat, lng };
  await req.account.save();
  res.json(req.account);
});

module.exports = { getMe, updateMe, updateLocation };
