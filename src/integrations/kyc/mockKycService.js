class MockKycService {
  async initiateVerification(aadhaarNumber) {
    console.log(`[MOCK KYC] Initiating Aadhaar verification for ${aadhaarNumber}`);
    // Returning a mock reference ID
    return {
      success: true,
      referenceId: 'kyc_ref_' + Date.now(),
      message: 'OTP sent to Aadhaar linked mobile number'
    };
  }

  async verifyIdentity(referenceId, otp) {
    console.log(`[MOCK KYC] Verifying OTP ${otp} for ref ${referenceId}`);
    if (otp === '123456') { // Mock OTP
      return {
        success: true,
        status: 'VERIFIED',
        message: 'Aadhaar verified successfully'
      };
    }
    return {
      success: false,
      status: 'FAILED',
      message: 'Invalid Aadhaar OTP'
    };
  }
}

module.exports = new MockKycService();
