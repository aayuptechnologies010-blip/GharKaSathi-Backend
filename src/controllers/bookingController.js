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
  const { providerId, categoryId, scheduledAt, address, notes } = req.body;

  if (!providerId || !categoryId || !scheduledAt) {
    return res.status(400).json({ message: 'providerId, categoryId and scheduledAt are required' });
  }

  const provider = await ServiceProvider.findById(providerId);
  if (!provider || !provider.isApproved || !provider.isAvailable) {
    return res.status(400).json({ message: 'Provider is not available for booking' });
  }
  if (!provider.categories.some((c) => c.toString() === categoryId)) {
    return res.status(400).json({ message: 'This provider does not offer the selected category' });
  }

  const booking = await Booking.create({
    user: req.account._id,
    provider: providerId,
    category: categoryId,
    scheduledAt,
    address,
    notes,
  });

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

// PUT /api/bookings/:id/status (provider)
// When accepting, the provider can attach a price quote for the user to pay.
const updateBookingStatus = asyncHandler(async (req, res) => {
  const { status, price } = req.body;
  const allowed = ['accepted', 'rejected', 'in-progress', 'completed'];

  if (!allowed.includes(status)) {
    return res.status(400).json({ message: `status must be one of: ${allowed.join(', ')}` });
  }

  const booking = await Booking.findOne({ _id: req.params.id, provider: req.account._id });
  if (!booking) {
    return res.status(404).json({ message: 'Booking not found' });
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
  res.json(booking);
});

// GET /api/bookings/:id (user who owns it, or provider assigned to it) — "Track Booking"
const getBookingById = asyncHandler(async (req, res) => {
  const filter =
    req.role === 'provider' ? { _id: req.params.id, provider: req.account._id } : { _id: req.params.id, user: req.account._id };

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
  getBookingById,
  updateBookingStatus,
  cancelBooking,
  addReview,
};
