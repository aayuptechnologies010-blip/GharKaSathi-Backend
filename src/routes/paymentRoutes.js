const express = require('express');
const { protect } = require('../middleware/auth');
const { createOrder, verifyPayment, markCashPaid } = require('../controllers/paymentController');

const router = express.Router();

router.post('/create-order', protect('user'), createOrder);
router.post('/verify', protect('user'), verifyPayment);
router.post('/cash', protect('provider'), markCashPaid);

module.exports = router;
