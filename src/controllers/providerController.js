const Category = require('../models/Category');
const ServiceProvider = require('../models/ServiceProvider');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/providers/me
const getMe = asyncHandler(async (req, res) => {
  const provider = await req.account.populate('categories');
  res.json(provider);
});

// PUT /api/providers/me
// Completes the profile after OTP signup: name, categories, address, documents.
const updateMe = asyncHandler(async (req, res) => {
  const { name, email, profileImage, categories, documents } = req.body;

  if (categories) {
    const found = await Category.find({ _id: { $in: categories }, isActive: true });
    if (found.length !== categories.length) {
      return res.status(400).json({ message: 'One or more categories are invalid' });
    }
    req.account.categories = categories;
  }

  if (name !== undefined) req.account.name = name;
  if (email !== undefined) req.account.email = email;
  if (profileImage !== undefined) req.account.profileImage = profileImage;
  if (documents !== undefined) req.account.documents = documents;

  await req.account.save();
  res.json(req.account);
});

// PUT /api/providers/me/location
const updateLocation = asyncHandler(async (req, res) => {
  const { text, lat, lng } = req.body;

  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ message: 'lat and lng are required' });
  }

  req.account.address = { text, lat, lng };
  req.account.location = { type: 'Point', coordinates: [lng, lat] };
  await req.account.save();
  res.json(req.account);
});

// GET /api/providers/search?categoryId=&lat=&lng=&radiusKm=10 (public)
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

// PUT /api/providers/me/availability
const updateAvailability = asyncHandler(async (req, res) => {
  const { isAvailable } = req.body;

  if (typeof isAvailable !== 'boolean') {
    return res.status(400).json({ message: 'isAvailable (boolean) is required' });
  }

  req.account.isAvailable = isAvailable;
  await req.account.save();
  res.json(req.account);
});

// GET /api/providers/me/earnings
const getEarnings = asyncHandler(async (req, res) => {
  res.json({ earnings: req.account.earnings });
});

module.exports = { getMe, updateMe, updateLocation, searchProviders, updateAvailability, getEarnings };
