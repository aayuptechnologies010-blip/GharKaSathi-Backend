const Booking = require('../models/Booking');
const Complaint = require('../models/Complaint');
const asyncHandler = require('../utils/asyncHandler');

// POST /api/complaints (user)
const createComplaint = asyncHandler(async (req, res) => {
  const { bookingId, subject, description } = req.body;

  if (!subject || !description) {
    return res.status(400).json({ message: 'subject and description are required' });
  }

  let provider;
  if (bookingId) {
    const booking = await Booking.findOne({ _id: bookingId, user: req.account._id });
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    provider = booking.provider;
  }

  const complaint = await Complaint.create({
    user: req.account._id,
    booking: bookingId,
    provider,
    subject,
    description,
  });

  res.status(201).json(complaint);
});

// GET /api/complaints/my (user)
const getMyComplaints = asyncHandler(async (req, res) => {
  const complaints = await Complaint.find({ user: req.account._id }).sort('-createdAt');
  res.json(complaints);
});

module.exports = { createComplaint, getMyComplaints };
