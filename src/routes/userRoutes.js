const express = require('express');
const { protect } = require('../middleware/auth');
const { getMe, updateMe, updateLocation, getSavedAddresses, addSavedAddress, deleteSavedAddress } = require('../controllers/userController');

const router = express.Router();

router.use(protect('user'));
router.get('/me', getMe);
router.put('/me', updateMe);
router.put('/me/location', updateLocation);
router.get('/me/addresses', getSavedAddresses);
router.post('/me/addresses', addSavedAddress);
router.delete('/me/addresses', deleteSavedAddress);

module.exports = router;
