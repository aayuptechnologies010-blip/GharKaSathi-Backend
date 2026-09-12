const express = require('express');
const { protect } = require('../middleware/auth');
const {
  createBooking,
  getMyBookings,
  getProviderBookings,
  getOpenRequests,
  getBookingById,
  updateBookingStatus,
  cancelBooking,
  addReview,
} = require('../controllers/bookingController');

const router = express.Router();

router.post('/', protect('user'), createBooking);
router.get('/my', protect('user'), getMyBookings);
router.put('/:id/cancel', protect('user'), cancelBooking);
router.post('/:id/review', protect('user'), addReview);

router.get('/provider', protect('provider'), getProviderBookings);
router.get('/open-requests', protect('provider'), getOpenRequests);
router.put('/:id/status', protect('provider'), updateBookingStatus);

router.get('/:id', protect('user', 'provider'), getBookingById);

module.exports = router;
