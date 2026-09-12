const authService = require('../services/auth.service');
const { successResponse } = require('../utils/response');

const register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    return successResponse(res, 201, 'Provider registered successfully', result);
  } catch (error) {
    next(error);
  }
};

const sendOtp = async (req, res, next) => {
  try {
    const { mobileNumber } = req.body;
    const result = await authService.sendOtp(mobileNumber);
    return successResponse(res, 200, result.message);
  } catch (error) {
    next(error);
  }
};

const verifyOtp = async (req, res, next) => {
  try {
    const { mobileNumber, otp } = req.body;
    const result = await authService.verifyOtp(mobileNumber, otp);
    return successResponse(res, 200, result.message);
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { mobileNumber, password, deviceInfo } = req.body;
    const result = await authService.login(mobileNumber, password, deviceInfo);
    return successResponse(res, 200, 'Login successful', result);
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body; // Ideally should be from cookies or headers
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    return successResponse(res, 200, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    // req.provider is set by auth middleware
    const provider = req.provider;
    // Remove sensitive info
    const { passwordHash, ...safeProvider } = provider;
    return successResponse(res, 200, 'Profile retrieved', safeProvider);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  sendOtp,
  verifyOtp,
  login,
  logout,
  getMe
};
