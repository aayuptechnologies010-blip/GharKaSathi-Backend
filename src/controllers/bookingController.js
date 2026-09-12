const Booking = require('../models/Booking');
const ServiceProvider = require('../models/ServiceProvider');
const Review = require('../models/Review');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const { bookingRoom, userRoom } = require('../socket');

const CANCELLABLE_STATUSES = ['pending', 'broadcasted', 'accepted'];

// Which statuses a provider may move a booking to, given its current status.
// Without this, a booking already completed/rejected/cancelled could be flipped to any other
// status (e.g. "reject" a booking that was already completed, paid and reviewed).
const STATUS_TRANSITIONS = {
  pending: ['broadcasted', 'accepted', 'rejected', 'cancelled'],
  broadcasted: ['accepted', 'rejected', 'cancelled'],
  accepted: ['on-the-way', 'rejected'],
  'on-the-way': ['reached'],
  reached: ['started'],
  started: ['completed'],
  completed: [],
  rejected: [],
  cancelled: [],
};

// POST /api/bookings (user)
const createBooking = asyncHandler(async (req, res) => {
  const { providerId, categoryId, subServiceId, scheduledAt, timeSlot, address, notes, couponCode } = req.body;

  if (!categoryId || !scheduledAt || !address || !address.lat || !address.lng) {
    return res.status(400).json({ message: 'categoryId, scheduledAt, and valid address are required' });
  }

  const Category = require('../models/Category');
  const category = await Category.findOne({ _id: categoryId, isActive: true });
  if (!category) {
    return res.status(400).json({ message: 'Selected category is not available' });
  }

  let subService = null;
  if (subServiceId) {
    subService = category.subServices.id(subServiceId);
    if (!subService) {
      return res.status(400).json({ message: 'Selected sub-service does not belong to this category' });
    }
  }

  const scheduledDate = new Date(scheduledAt);
  if (Number.isNaN(scheduledDate.getTime())) {
    return res.status(400).json({ message: 'scheduledAt must be a valid date' });
  }

  // Coupon discount logic (mirrors app: SGSAVE30=30%, FIRST99=20%, CLEANPRO=18%)
  const COUPONS = { SGSAVE30: 0.3, FIRST99: 0.2, CLEANPRO: 0.18 };
  const basePrice = subService ? subService.basePrice : null;
  let discount = 0;
  let tax = 0;
  let finalAmount = null;

  if (basePrice != null) {
    const discountRate = couponCode ? (COUPONS[couponCode.toUpperCase()] || 0) : 0;
    discount = basePrice * discountRate;
    tax = (basePrice - discount) * 0.18;
    finalAmount = basePrice - discount + tax;
  }

  const booking = await Booking.create({
    user: req.account._id,
    category: categoryId,
    subService: subService ? { name: subService.name, description: subService.description, basePrice: subService.basePrice } : undefined,
    timeSlot,
    scheduledAt: scheduledDate,
    address,
    notes,
    couponCode: couponCode ? couponCode.toUpperCase() : undefined,
    discount,
    tax,
    finalAmount,
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
  const allowed = ['accepted', 'rejected', 'on-the-way', 'reached', 'started', 'completed'];

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

  const io = req.app.get('io');
  if (io) {
    if (status === 'accepted') {
      io.to(`user:${booking.user}`).emit('booking-accepted', booking);
    }
    io.to(bookingRoom(booking._id.toString())).emit('booking-status', booking);
  }

  // Push notification to user on key status changes
  const notifMap = {
    accepted: { title: 'Booking Confirmed!', body: 'A provider has accepted your booking request.' },
    'on-the-way': { title: 'Partner is Traveling', body: 'Your service partner has started traveling to your address.' },
    reached: { title: 'Partner Arrived!', body: 'Your service partner has arrived at your location.' },
    started: { title: 'Service Started', body: 'Work has successfully started at your location.' },
    completed: { title: 'Service Completed!', body: 'Please authorize the payment and rate your service partner.' },
  };
  if (notifMap[status]) {
    const notif = await Notification.create({
      user: booking.user,
      title: notifMap[status].title,
      body: notifMap[status].body,
      routeType: 'booking',
      routeId: booking._id.toString(),
    });
    io?.to(userRoom(booking.user.toString())).emit('notification', notif);
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

  if (!CANCELLABLE_STATUSES.includes(booking.status)) {
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
  if (!['completed', 'paid'].includes(booking.status)) {
    return res.status(400).json({ message: 'Can only review a completed or paid booking' });
  }

  const existing = await Review.findOne({ booking: booking._id });
  if (existing) {
    return res.status(400).json({ message: 'You have already reviewed this booking' });
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
  provider.ratingAvg = parseFloat(newAvg.toFixed(2));
  provider.completedJobs = (provider.completedJobs || 0) + 1;
  await provider.save();

  booking.status = 'reviewed';
  await booking.save();

  res.status(201).json({ review, booking });
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
