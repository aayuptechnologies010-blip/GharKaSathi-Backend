const express = require('express');
const { checkMobile, verifyOtp, adminLogin } = require('../controllers/authController');

const router = express.Router();

router.post('/check-mobile', checkMobile);
router.post('/verify-otp', verifyOtp);
router.post('/admin/login', adminLogin);

module.exports = router;
