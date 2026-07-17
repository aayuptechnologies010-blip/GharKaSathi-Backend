const express = require('express');
const { protect } = require('../middleware/auth');
const { getMe, updateMe, updateLocation } = require('../controllers/userController');

const router = express.Router();

router.use(protect('user'));
router.get('/me', getMe);
router.put('/me', updateMe);
router.put('/me/location', updateLocation);

module.exports = router;
