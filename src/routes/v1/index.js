const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const providerRoutes = require('./provider.routes');
const kycRoutes = require('./kyc.routes');
// const serviceRoutes = require('./service.routes');
// const jobRoutes = require('./job.routes');
// const earningRoutes = require('./earning.routes');
// const notificationRoutes = require('./notification.routes');
// const reviewRoutes = require('./review.routes');

router.use('/auth', authRoutes);
router.use('/providers', providerRoutes);
router.use('/kyc', kycRoutes);
// router.use('/services', serviceRoutes);
// router.use('/jobs', jobRoutes);
// router.use('/earnings', earningRoutes);
// router.use('/notifications', notificationRoutes);
// router.use('/reviews', reviewRoutes);

module.exports = router;
