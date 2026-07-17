const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getMe,
  updateMe,
  updateLocation,
  searchProviders,
  updateAvailability,
  getEarnings,
} = require('../controllers/providerController');

const router = express.Router();

router.get('/search', searchProviders);

router.use(protect('provider'));
router.get('/me', getMe);
router.put('/me', updateMe);
router.put('/me/location', updateLocation);
router.put('/me/availability', updateAvailability);
router.get('/me/earnings', getEarnings);

module.exports = router;
