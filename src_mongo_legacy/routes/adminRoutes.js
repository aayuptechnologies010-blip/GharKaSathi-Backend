const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getProviders, approveProvider, suspendProvider, reinstateProvider,
  getUsers, suspendUser, reinstateUser,
  approveKyc, rejectKyc,
  getWithdrawals, processWithdrawal,
} = require('../controllers/adminController');
const { getComplaints, resolveComplaint } = require('../controllers/adminComplaintController');
const { getPayments, getPaymentSummary, getAnalytics } = require('../controllers/adminReportController');
const { listAllCategoriesAdmin } = require('../controllers/categoryController');
const { getMe, updateMe, updatePassword } = require('../controllers/adminProfileController');

const router = express.Router();

router.use(protect('admin'));

// Admin profile
router.get('/me', getMe);
router.put('/me', updateMe);
router.put('/me/password', updatePassword);

// Categories
router.get('/categories', listAllCategoriesAdmin);

// Providers
router.get('/providers', getProviders);
router.put('/providers/:id/approve', approveProvider);
router.put('/providers/:id/suspend', suspendProvider);
router.put('/providers/:id/reinstate', reinstateProvider);

// KYC
router.put('/providers/:id/kyc/approve', approveKyc);
router.put('/providers/:id/kyc/reject', rejectKyc);

// Users
router.get('/users', getUsers);
router.put('/users/:id/suspend', suspendUser);
router.put('/users/:id/reinstate', reinstateUser);

// Complaints
router.get('/complaints', getComplaints);
router.put('/complaints/:id/resolve', resolveComplaint);

// Payments
router.get('/payments', getPayments);
router.get('/payments/summary', getPaymentSummary);

// Withdrawals
router.get('/withdrawals', getWithdrawals);
router.put('/withdrawals/:id/process', processWithdrawal);

// Analytics
router.get('/analytics', getAnalytics);

module.exports = router;
