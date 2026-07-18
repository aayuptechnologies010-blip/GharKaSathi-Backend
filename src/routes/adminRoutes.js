const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getProviders,
  approveProvider,
  suspendProvider,
  reinstateProvider,
  getUsers,
  suspendUser,
  reinstateUser,
} = require('../controllers/adminController');
const { getComplaints, resolveComplaint } = require('../controllers/adminComplaintController');
const { getPayments, getPaymentSummary, getAnalytics } = require('../controllers/adminReportController');
const { listAllCategoriesAdmin } = require('../controllers/categoryController');
const { getMe, updateMe, updatePassword } = require('../controllers/adminProfileController');

const router = express.Router();

router.use(protect('admin'));

router.get('/me', getMe);
router.put('/me', updateMe);
router.put('/me/password', updatePassword);

router.get('/categories', listAllCategoriesAdmin);

router.get('/providers', getProviders);
router.put('/providers/:id/approve', approveProvider);
router.put('/providers/:id/suspend', suspendProvider);
router.put('/providers/:id/reinstate', reinstateProvider);

router.get('/users', getUsers);
router.put('/users/:id/suspend', suspendUser);
router.put('/users/:id/reinstate', reinstateUser);

router.get('/complaints', getComplaints);
router.put('/complaints/:id/resolve', resolveComplaint);

router.get('/payments', getPayments);
router.get('/payments/summary', getPaymentSummary);
router.get('/analytics', getAnalytics);

module.exports = router;
