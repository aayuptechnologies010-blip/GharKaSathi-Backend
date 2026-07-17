const express = require('express');
const { protect } = require('../middleware/auth');
const { createComplaint, getMyComplaints } = require('../controllers/complaintController');

const router = express.Router();

router.use(protect('user'));
router.post('/', createComplaint);
router.get('/my', getMyComplaints);

module.exports = router;
