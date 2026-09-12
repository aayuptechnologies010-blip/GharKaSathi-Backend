const Booking = require('../models/Booking');
const ServiceProvider = require('../models/ServiceProvider');
const Review = require('../models/Review');
const asyncHandler = require('../utils/asyncHandler');

const ACTIVE_STATUSES = ['pending', 'accepted', 'in-progress'];

// Which statuses a provider may move a booking to, given its current status.
// Without this, a booking already completed/rejected/cancelled could be flipped to any other
// status (e.g. "reject" a booking that was already completed, paid and reviewed).
const STATUS_TRANSITIONS = {
  pending: ['accepted', 'rejected'],
  accepted: ['in-progress', 'rejected'],
  'in-progress': ['completed'],
  completed: [],
  rejected: [],
  cancelled: [],
};

// POST /api/bookings (user)
const createBooking = asyncHandler(async (req, res) => {
  const { categoryId, scheduledAt, address, notes } = req.body;

  if (!categoryId || !scheduledAt || !address || !address.lat || !address.lng) {
    return res.status(400).json({ message: 'categoryId, scheduledAt, and valid address are required' });
  }

  const booking = await Booking.create({
    user: req.account._id,
    category: categoryId,
    scheduledAt,
    address,
    notes,
  });

  // Find nearby providers (within 10km)
  const MAX_DISTANCE = 10000;
  const nearbyProviders = await ServiceProvider.find({
    isApproved: true,
    isAvailable: true,
    categories: categoryId,
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [address.lng, address.lat] },
        $maxDistance: MAX_DISTANCE,
      },
    },
  });

  const io = req.app.get('io');
  if (io && nearbyProviders.length > 0) {
    nearbyProviders.forEach((provider) => {
      io.to(`provider:${provider._id}`).emit('new-booking-request', booking);
    });
  }

  res.status(201).json(booking);
});

// GET /api/bookings/my (user)
const getMyBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ user: req.account._id })
    .populate('provider', 'name phone ratingAvg')
    .populate('category', 'name icon')
    .sort('-createdAt');
  res.json(bookings);
});

// GET /api/bookings/provider (provider)
const getProviderBookings = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = { provider: req.account._id };
  if (status) filter.status = status;

  const bookings = await Booking.find(filter)
    .populate('user', 'name phone')
    .populate('category', 'name icon')
    .sort('-createdAt');
  res.json(bookings);
});

// GET /api/bookings/open-requests (provider)
const getOpenRequests = asyncHandler(async (req, res) => {
  const provider = await ServiceProvider.findById(req.account._id);
  if (!provider || !provider.location || !provider.location.coordinates) {
    return res.status(400).json({ message: 'Provider location not found' });
  }

  const MAX_DISTANCE = 10000;
  const openBookings = await Booking.find({
    status: 'pending',
    provider: null,
    category: { $in: provider.categories }
  }).populate('user', 'name phone').populate('category', 'name icon');

  const bookingsWithDistance = openBookings.filter(b => {
    if (!b.address || !b.address.lat || !b.address.lng) return false;
    const R = 6371e3; // metres
    const phi1 = provider.location.coordinates[1] * Math.PI/180;
    const phi2 = b.address.lat * Math.PI/180;
    const dPhi = (b.address.lat - provider.location.coordinates[1]) * Math.PI/180;
    const dLam = (b.address.lng - provider.location.coordinates[0]) * Math.PI/180;

    const a = Math.sin(dPhi/2) * Math.sin(dPhi/2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(dLam/2) * Math.sin(dLam/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    const d = R * c;
    return d <= MAX_DISTANCE;
  });

  res.json(bookingsWithDistance);
});

// PUT /api/bookings/:id/status (provider)
// When accepting, the provider can attach a price quote for the user to pay.
const updateBookingStatus = asyncHandler(async (req, res) => {
  const { status, price } = req.body;
  const allowed = ['accepted', 'rejected', 'in-progress', 'completed'];

  if (!allowed.includes(status)) {
    return res.status(400).json({ message: `status must be one of: ${allowed.join(', ')}` });
  }

  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    return res.status(404).json({ message: 'Booking not found' });
  }

  if (status === 'accepted' && booking.status === 'pending') {
    if (booking.provider) {
      return res.status(400).json({ message: 'Booking already accepted by someone else' });
    }
    booking.provider = req.account._id;
  } else {
    if (booking.provider?.toString() !== req.account._id.toString()) {
      return res.status(403).json({ message: 'Not authorized for this booking' });
    }
  }

  if (!STATUS_TRANSITIONS[booking.status]?.includes(status)) {
    return res.status(400).json({ message: `Cannot move booking from ${booking.status} to ${status}` });
  }

  if (status === 'accepted' && price !== undefined) {
    if (price <= 0) {
      return res.status(400).json({ message: 'price must be greater than 0' });
    }
    booking.price = price;
  }

  if (status === 'completed' && !booking.price) {
    return res.status(400).json({ message: 'Booking has no price quote yet — accept with a price first' });
  }

  booking.status = status;
  await booking.save();

  if (status === 'accepted') {
    const io = req.app.get('io');
    if (io) io.to(`user:${booking.user}`).emit('booking-accepted', booking);
  }

  res.json(booking);
});

// GET /api/bookings/:id (user who owns it, or provider assigned to it) — "Track Booking"
const getBookingById = asyncHandler(async (req, res) => {
  let filter;
  if (req.role === 'provider') {
    filter = { _id: req.params.id, $or: [{ provider: req.account._id }, { status: 'pending' }] };
  } else {
    filter = { _id: req.params.id, user: req.account._id };
  }

  const booking = await Booking.findOne(filter)
    .populate('user', 'name phone')
    .populate('provider', 'name phone ratingAvg')
    .populate('category', 'name icon');

  if (!booking) {
    return res.status(404).json({ message: 'Booking not found' });
  }

  res.json(booking);
});

// PUT /api/bookings/:id/cancel (user)
const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, user: req.account._id });
  if (!booking) {
    return res.status(404).json({ message: 'Booking not found' });
  }

  if (!ACTIVE_STATUSES.includes(booking.status)) {
    return res.status(400).json({ message: `Cannot cancel a booking that is ${booking.status}` });
  }

  booking.status = 'cancelled';
  await booking.save();
  res.json(booking);
});

// POST /api/bookings/:id/review (user)
const addReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'rating must be between 1 and 5' });
  }

  const booking = await Booking.findOne({ _id: req.params.id, user: req.account._id });
  if (!booking) {
    return res.status(404).json({ message: 'Booking not found' });
  }
  if (booking.status !== 'completed') {
    return res.status(400).json({ message: 'Can only review a completed booking' });
  }

  const review = await Review.create({
    booking: booking._id,
    user: req.account._id,
    provider: booking.provider,
    rating,
    comment,
  });

  const provider = await ServiceProvider.findById(booking.provider);
  const newCount = provider.ratingCount + 1;
  const newAvg = (provider.ratingAvg * provider.ratingCount + rating) / newCount;
  provider.ratingCount = newCount;
  provider.ratingAvg = newAvg;
  await provider.save();

  res.status(201).json(review);
});

module.exports = {
  createBooking,
  getMyBookings,
  getProviderBookings,
  getOpenRequests,
  getBookingById,
  updateBookingStatus,
  cancelBooking,
  addReview,
};
