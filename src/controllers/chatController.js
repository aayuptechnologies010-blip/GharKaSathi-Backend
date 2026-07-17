const Booking = require('../models/Booking');
const Message = require('../models/Message');
const asyncHandler = require('../utils/asyncHandler');
const { bookingRoom } = require('../socket');

async function findOwnedBooking(req) {
  const filter =
    req.role === 'provider'
      ? { _id: req.params.bookingId, provider: req.account._id }
      : { _id: req.params.bookingId, user: req.account._id };
  return Booking.findOne(filter);
}

// GET /api/chat/:bookingId
const getMessages = asyncHandler(async (req, res) => {
  const booking = await findOwnedBooking(req);
  if (!booking) {
    return res.status(404).json({ message: 'Booking not found' });
  }

  const messages = await Message.find({ booking: booking._id }).sort('createdAt');
  res.json(messages);
});

// POST /api/chat/:bookingId
const sendMessage = asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ message: 'text is required' });
  }

  const booking = await findOwnedBooking(req);
  if (!booking) {
    return res.status(404).json({ message: 'Booking not found' });
  }

  const message = await Message.create({
    booking: booking._id,
    senderRole: req.role,
    text: text.trim(),
  });

  req.app.get('io')?.to(bookingRoom(booking._id.toString())).emit('message', message);

  res.status(201).json(message);
});

module.exports = { getMessages, sendMessage };
