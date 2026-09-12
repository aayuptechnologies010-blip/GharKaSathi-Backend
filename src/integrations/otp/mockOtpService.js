class MockOtpService {
  async sendOtp(mobileNumber) {
    console.log(`[MOCK OTP] Sending OTP 1234 to ${mobileNumber}`);
    return { success: true, message: 'OTP sent successfully' };
  }

  async verifyOtp(mobileNumber, otp) {
    console.log(`[MOCK OTP] Verifying OTP ${otp} for ${mobileNumber}`);
    if (otp === '1234') {
      return { success: true, message: 'OTP verified successfully' };
    }
    return { success: false, message: 'Invalid OTP' };
  }
}

module.exports = new MockOtpService();
