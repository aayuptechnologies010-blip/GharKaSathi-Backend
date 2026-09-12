const providerService = require('../services/provider.service');
const { successResponse } = require('../utils/response');

const getProfile = async (req, res, next) => {
  try {
    const profile = await providerService.getProfile(req.provider.id);
    return successResponse(res, 200, 'Profile retrieved', profile);
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const profile = await providerService.updateProfile(req.provider.id, req.body);
    return successResponse(res, 200, 'Profile updated successfully', profile);
  } catch (error) {
    next(error);
  }
};

const uploadProfilePhoto = async (req, res, next) => {
  try {
    // Expected to use multer, req.file would have the info
    if (!req.file) {
      const error = new Error('No image file provided');
      error.statusCode = 400;
      throw error;
    }
    // Simulate upload to cloud storage
    const fileUrl = `https://mock-storage.com/${req.file.filename}`;
    
    // Update profile
    const profile = await providerService.updateProfile(req.provider.id, {
      profilePhotoUrl: fileUrl
    });

    return successResponse(res, 200, 'Profile photo updated', profile);
  } catch (error) {
    next(error);
  }
};

const getProfileCompletion = async (req, res, next) => {
  try {
    const completion = await providerService.getProfileCompletion(req.provider.id);
    return successResponse(res, 200, 'Completion percentage retrieved', completion);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  uploadProfilePhoto,
  getProfileCompletion
};
