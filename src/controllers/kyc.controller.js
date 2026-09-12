const providerService = require('../services/provider.service');
const { successResponse } = require('../utils/response');

const initiateAadhaar = async (req, res, next) => {
  try {
    const { aadhaarNumber } = req.body;
    const result = await providerService.initiateKyc(req.provider.id, aadhaarNumber);
    return successResponse(res, 200, result.message, { referenceId: result.referenceId });
  } catch (error) {
    next(error);
  }
};

const verifyAadhaar = async (req, res, next) => {
  try {
    const { referenceId, otp } = req.body;
    const result = await providerService.verifyKyc(req.provider.id, referenceId, otp);
    return successResponse(res, 200, result.message, { status: result.status });
  } catch (error) {
    next(error);
  }
};

const uploadDocuments = async (req, res, next) => {
  try {
    // Handling multipart form data for document uploads (e.g. Aadhaar photos)
    const files = req.files;
    if (!files || files.length === 0) {
      const error = new Error('No files uploaded');
      error.statusCode = 400;
      throw error;
    }
    // Logic to save to storage and update provider_documents table
    // For now we'll mock success
    return successResponse(res, 200, 'Documents uploaded successfully');
  } catch (error) {
    next(error);
  }
};

const getKycStatus = async (req, res, next) => {
  try {
    const result = await providerService.getKycStatus(req.provider.id);
    return successResponse(res, 200, 'KYC status retrieved', result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  initiateAadhaar,
  verifyAadhaar,
  uploadDocuments,
  getKycStatus
};
