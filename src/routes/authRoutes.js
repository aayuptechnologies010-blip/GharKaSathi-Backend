const express = require('express');
const { verifyOtp, adminLogin } = require('../controllers/authController');

const router = express.Router();

router.post('/verify-otp', verifyOtp);
router.post('/admin/login', adminLogin);

module.exports = router;
