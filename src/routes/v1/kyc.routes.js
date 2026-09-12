const express = require('express');
const router = express.Router();
const kycController = require('../../controllers/kyc.controller');
const requireAuth = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const Joi = require('joi');

const initiateKycSchema = Joi.object({
  aadhaarNumber: Joi.string().pattern(/^\d{12}$/).required(),
});

const verifyKycSchema = Joi.object({
  referenceId: Joi.string().required(),
  otp: Joi.string().length(6).required(),
});

router.use(requireAuth);

router.post('/aadhaar/initiate', validate(initiateKycSchema), kycController.initiateAadhaar);
router.post('/aadhaar/verify', validate(verifyKycSchema), kycController.verifyAadhaar);
// router.post('/documents', upload.array('documents'), kycController.uploadDocuments);
router.get('/status', kycController.getKycStatus);

module.exports = router;
