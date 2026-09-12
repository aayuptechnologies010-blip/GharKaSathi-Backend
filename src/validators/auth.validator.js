const Joi = require('joi');

const registerSchema = Joi.object({
  mobileNumber: Joi.string().pattern(/^\+91[0-9]{10}$/).required().messages({
    'string.pattern.base': 'Mobile number must be a valid Indian number starting with +91'
  }),
  password: Joi.string().min(6).required(),
});

const loginSchema = Joi.object({
  mobileNumber: Joi.string().pattern(/^\+91[0-9]{10}$/).required(),
  password: Joi.string().required(),
});

const sendOtpSchema = Joi.object({
  mobileNumber: Joi.string().pattern(/^\+91[0-9]{10}$/).required(),
});

const verifyOtpSchema = Joi.object({
  mobileNumber: Joi.string().pattern(/^\+91[0-9]{10}$/).required(),
  otp: Joi.string().length(4).required(),
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

module.exports = {
  registerSchema,
  loginSchema,
  sendOtpSchema,
  verifyOtpSchema,
  refreshTokenSchema,
};
