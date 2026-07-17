const Razorpay = require('razorpay');

const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;

let instance = null;
if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
  instance = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
} else {
  console.warn('Razorpay credentials are not set — online payments will fail until RAZORPAY_* env vars are configured.');
}

module.exports = instance;
