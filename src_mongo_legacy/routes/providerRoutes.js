const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getMe, updateMe, updateLocation, updateAvailability,
  submitKyc, updateBankDetails,
  getEarnings, requestWithdrawal, getWithdrawals,
  getJobHistory, getMyReviews,
  searchProviders, getProviderById, getProviderReviews,
} = require('../controllers/providerController');

const router = express.Router();

// Public
router.get('/search', searchProviders);
router.get('/:id', getProviderById);
router.get('/:id/reviews', getProviderReviews);

// Protected (provider only)
router.use(protect('provider'));
router.get('/me', getMe);
router.put('/me', updateMe);
router.put('/me/location', updateLocation);
router.put('/me/availability', updateAvailability);
router.put('/me/kyc', submitKyc);
router.put('/me/bank', updateBankDetails);
router.get('/me/earnings', getEarnings);
router.post('/me/withdraw', requestWithdrawal);
router.get('/me/withdrawals', getWithdrawals);
router.get('/me/jobs', getJobHistory);
router.get('/me/reviews', getMyReviews);

module.exports = router;
