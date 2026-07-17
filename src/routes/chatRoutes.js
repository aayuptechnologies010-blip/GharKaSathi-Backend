const express = require('express');
const { protect } = require('../middleware/auth');
const { getMessages, sendMessage } = require('../controllers/chatController');

const router = express.Router();

router.use(protect('user', 'provider'));
router.get('/:bookingId', getMessages);
router.post('/:bookingId', sendMessage);

module.exports = router;
