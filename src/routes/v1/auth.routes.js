const express = require('express');
const router = express.Router();
const authController = require('../../controllers/auth.controller');
const validate = require('../../middleware/validate');
const { registerSchema, loginSchema, sendOtpSchema, verifyOtpSchema } = require('../../validators/auth.validator');
const requireAuth = require('../../middleware/auth');

router.post('/register', validate(registerSchema), authController.register);
router.post('/send-otp', validate(sendOtpSchema), authController.sendOtp);
router.post('/verify-otp', validate(verifyOtpSchema), authController.verifyOtp);
router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authController.logout); // Refresh token should be validated

router.get('/me', requireAuth, authController.getMe);

module.exports = router;
