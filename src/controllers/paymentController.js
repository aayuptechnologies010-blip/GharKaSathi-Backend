const crypto = require('crypto');
const razorpay = require('../config/razorpay');
const Booking = require('../models/Booking');
const Category = require('../models/Category');
const ServiceProvider = require('../models/ServiceProvider');
const Payment = require('../models/Payment');
const asyncHandler = require('../utils/asyncHandler');

async function buildPaymentDoc(booking) {
  const category = await Category.findById(booking.category);
  const commissionPercent = category ? category.commissionPercent : 10;
  // Use finalAmount (set at booking creation with discount+tax) or price (set by provider on accept)
  const billAmount = booking.finalAmount || booking.price || 0;
  const commissionAmount = Math.round((billAmount * commissionPercent) / 100);
  const payoutAmount = billAmount - commissionAmount;
  return { commissionPercent, commissionAmount, payoutAmount, billAmount };
}

// POST /api/payments/create-order (user)
const createOrder = asyncHandler(async (req, res) => {
  const { bookingId } = req.body;

  if (!razorpay) {
    return res.status(503).json({ message: 'Payment gateway is not configured' });
  }

  const booking = await Booking.findOne({ _id: bookingId, user: req.account._id });
  if (!booking) {
    return res.status(404).json({ message: 'Booking not found' });
  }
  if (booking.status !== 'completed') {
    return res.status(400).json({ message: 'Booking must be completed before payment' });
  }
  if (!booking.price && !booking.finalAmount) {
    return res.status(400).json({ message: 'Booking has no price quote yet' });
  }
  if (booking.paymentStatus === 'paid') {
    return res.status(400).json({ message: 'Booking is already paid' });
  }

  let payment = await Payment.findOne({ booking: booking._id });
  if (payment && payment.status === 'paid') {
    return res.status(400).json({ message: 'Booking is already paid' });
  }

  const { commissionPercent, commissionAmount, payoutAmount, billAmount } = await buildPaymentDoc(booking);

  const order = await razorpay.orders.create({
    amount: Math.round(billAmount * 100),
    currency: 'INR',
    receipt: `booking_${booking._id}`,
  });

  if (payment) {
    payment.method = 'razorpay';
    payment.amount = billAmount;
    payment.commissionPercent = commissionPercent;
    payment.commissionAmount = commissionAmount;
    payment.payoutAmount = payoutAmount;
    payment.status = 'created';
    payment.gatewayOrderId = order.id;
    await payment.save();
  } else {
    payment = await Payment.create({
      booking: booking._id,
      user: booking.user,
      provider: booking.provider,
      method: 'razorpay',
      amount: billAmount,
      commissionPercent,
      commissionAmount,
      payoutAmount,
      gatewayOrderId: order.id,
    });
  }

  res.status(201).json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
  });
});

// POST /api/payments/verify (user)
const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return res.status(400).json({ message: 'razorpayOrderId, razorpayPaymentId and razorpaySignature are required' });
  }

  const payment = await Payment.findOne({ gatewayOrderId: razorpayOrderId, user: req.account._id });
  if (!payment) {
    return res.status(404).json({ message: 'Payment order not found' });
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    payment.status = 'failed';
    await payment.save();
    return res.status(400).json({ message: 'Payment signature verification failed' });
  }

  payment.status = 'paid';
  payment.gatewayPaymentId = razorpayPaymentId;
  payment.paidAt = new Date();
  await payment.save();

  await Booking.findByIdAndUpdate(payment.booking, { paymentStatus: 'paid', status: 'paid' });
  await ServiceProvider.findByIdAndUpdate(payment.provider, { $inc: { earnings: payment.payoutAmount } });

  res.json({ message: 'Payment verified', payment });
});

// POST /api/payments/cash (provider) — mark a completed booking as paid in cash
const markCashPaid = asyncHandler(async (req, res) => {
  const { bookingId } = req.body;

  const booking = await Booking.findOne({ _id: bookingId, provider: req.account._id });
  if (!booking) {
    return res.status(404).json({ message: 'Booking not found' });
  }
  if (booking.status !== 'completed') {
    return res.status(400).json({ message: 'Booking must be completed before recording payment' });
  }
  if (booking.paymentStatus === 'paid') {
    return res.status(400).json({ message: 'Booking is already paid' });
  }

  const { commissionPercent, commissionAmount, payoutAmount, billAmount } = await buildPaymentDoc(booking);

  const payment = await Payment.findOneAndUpdate(
    { booking: booking._id },
    {
      booking: booking._id,
      user: booking.user,
      provider: booking.provider,
      method: 'cash',
      amount: billAmount,
      commissionPercent,
      commissionAmount,
      payoutAmount,
      status: 'paid',
      paidAt: new Date(),
    },
    { upsert: true, new: true }
  );

  booking.paymentStatus = 'paid';
  booking.status = 'paid';
  await booking.save();
  await ServiceProvider.findByIdAndUpdate(req.account._id, { $inc: { earnings: payoutAmount } });

  res.json({ message: 'Cash payment recorded', payment });
});

module.exports = { createOrder, verifyPayment, markCashPaid };
