const express = require('express');
const { protect } = require('../middleware/auth');
const {
  createBooking,
  getMyBookings,
  getProviderBookings,
  getBookingById,
  updateBookingStatus,
  cancelBooking,
  addReview,
  startJob,
  updateChecklist,
  completeJob,
} = require('../controllers/bookingController');

const router = express.Router();

// User routes
router.post('/', protect('user'), createBooking);
router.get('/my', protect('user'), getMyBookings);
router.put('/:id/cancel', protect('user'), cancelBooking);
router.post('/:id/review', protect('user'), addReview);

// Provider routes
router.get('/provider', protect('provider'), getProviderBookings);
router.put('/:id/status', protect('provider'), updateBookingStatus);
router.put('/:id/start-job', protect('provider'), startJob);
router.put('/:id/checklist', protect('provider'), updateChecklist);
router.put('/:id/complete-job', protect('provider'), completeJob);

// Shared (user or provider)
router.get('/:id', protect('user', 'provider'), getBookingById);

module.exports = router;
