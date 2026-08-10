const Category = require('../models/Category');
const ServiceProvider = require('../models/ServiceProvider');
const Review = require('../models/Review');
const asyncHandler = require('../utils/asyncHandler');
const { haversineKm } = require('../utils/geo');

// GET /api/providers/me
const getMe = asyncHandler(async (req, res) => {
  const provider = await req.account.populate('categories');
  res.json(provider);
});

// PUT /api/providers/me
const updateMe = asyncHandler(async (req, res) => {
  const { name, email, profileImage, categories, documents, bio, skills, languages, experienceYears, baseHourlyRate, address } = req.body;

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
  if (bio !== undefined) req.account.bio = bio;
  if (skills !== undefined) req.account.skills = skills;
  if (languages !== undefined) req.account.languages = languages;
  if (experienceYears !== undefined) req.account.experienceYears = experienceYears;
  if (baseHourlyRate !== undefined) req.account.baseHourlyRate = baseHourlyRate;
  if (address !== undefined) req.account.address = address;

  await req.account.save();
  res.json(req.account);
});

// PUT /api/providers/me/location
const updateLocation = asyncHandler(async (req, res) => {
  const { text, lat, lng } = req.body;

  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ message: 'lat and lng are required' });
  }

  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return res.status(400).json({ message: 'lat and lng must be valid coordinates' });
  }

  req.account.address = { text, lat: latitude, lng: longitude };
  req.account.location = { type: 'Point', coordinates: [longitude, latitude] };
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
    const latitude = Number(lat);
    const longitude = Number(lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ message: 'lat and lng must be valid coordinates' });
    }
    const radiusMeters = (Number(radiusKm) || 10) * 1000;
    const found = await ServiceProvider.find({
      ...filter,
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [longitude, latitude] },
          $maxDistance: radiusMeters,
        },
      },
    }).populate('categories', 'name icon');

    providers = found.map((provider) => {
      const obj = provider.toObject();
      const [providerLng, providerLat] = provider.location.coordinates;
      obj.distanceKm = parseFloat(haversineKm(latitude, longitude, providerLat, providerLng).toFixed(2));
      return obj;
    });
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

// GET /api/providers/:id (public)
const getProviderById = asyncHandler(async (req, res) => {
  const provider = await ServiceProvider.findById(req.params.id).populate('categories', 'name icon slug');
  if (!provider || !provider.isActive) {
    return res.status(404).json({ message: 'Provider not found' });
  }
  res.json(provider);
});

// GET /api/providers/:id/reviews (public)
const getProviderReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ provider: req.params.id })
    .populate('user', 'name profileImage')
    .sort('-createdAt');
  res.json(reviews);
});

module.exports = {
  getMe,
  updateMe,
  updateLocation,
  searchProviders,
  updateAvailability,
  getEarnings,
  getProviderById,
  getProviderReviews,
};
