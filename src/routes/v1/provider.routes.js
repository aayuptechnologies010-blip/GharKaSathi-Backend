const express = require('express');
const router = express.Router();
const providerController = require('../../controllers/provider.controller');
const requireAuth = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const Joi = require('joi');

const profileUpdateSchema = Joi.object({
  fullName: Joi.string().min(2).max(100),
  dob: Joi.date().iso(),
  gender: Joi.string().valid('Male', 'Female', 'Other'),
});

router.use(requireAuth);

router.get('/me', providerController.getProfile);
router.put('/me/profile', validate(profileUpdateSchema), providerController.updateProfile);
// router.post('/me/profile-photo', upload.single('photo'), providerController.uploadProfilePhoto);
router.get('/me/profile-completion', providerController.getProfileCompletion);

module.exports = router;
