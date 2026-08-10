const asyncHandler = require('../utils/asyncHandler');

// GET /api/users/me
const getMe = asyncHandler(async (req, res) => {
  res.json(req.account);
});

// PUT /api/users/me
const updateMe = asyncHandler(async (req, res) => {
  const { name, email, gender, dob, city, state, pincode, profileImage } = req.body;

  if (name !== undefined) req.account.name = name;
  if (email !== undefined) req.account.email = email;
  if (gender !== undefined) req.account.gender = gender;
  if (dob !== undefined) req.account.dob = dob;
  if (city !== undefined) req.account.city = city;
  if (state !== undefined) req.account.state = state;
  if (pincode !== undefined) req.account.pincode = pincode;
  if (profileImage !== undefined) req.account.profileImage = profileImage;

  // Mark profile completed if all required fields are present
  if (req.account.name && req.account.email && req.account.gender && req.account.dob) {
    req.account.isProfileCompleted = true;
  }

  await req.account.save();
  res.json(req.account);
});

// PUT /api/users/me/location
// lat/lng are optional — this app has no GPS, so most calls only ever send `text`. If either
// coordinate is provided, both must be valid; otherwise only the address text is updated.
const updateLocation = asyncHandler(async (req, res) => {
  const { text, lat, lng } = req.body;

  const address = { text, lat: req.account.address?.lat, lng: req.account.address?.lng };

  if (lat !== undefined || lng !== undefined) {
    const latitude = Number(lat);
    const longitude = Number(lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ message: 'lat and lng must be valid coordinates' });
    }
    address.lat = latitude;
    address.lng = longitude;
  }

  req.account.address = address;
  await req.account.save();
  res.json(req.account);
});

// GET /api/users/me/addresses
const getSavedAddresses = asyncHandler(async (req, res) => {
  res.json(req.account.savedAddresses || []);
});

// POST /api/users/me/addresses
const addSavedAddress = asyncHandler(async (req, res) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ message: 'address is required' });

  if (!req.account.savedAddresses.includes(address)) {
    req.account.savedAddresses.push(address);
    await req.account.save();
  }
  res.json(req.account.savedAddresses);
});

// DELETE /api/users/me/addresses
const deleteSavedAddress = asyncHandler(async (req, res) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ message: 'address is required' });

  req.account.savedAddresses = req.account.savedAddresses.filter((a) => a !== address);
  await req.account.save();
  res.json(req.account.savedAddresses);
});

module.exports = { getMe, updateMe, updateLocation, getSavedAddresses, addSavedAddress, deleteSavedAddress };
