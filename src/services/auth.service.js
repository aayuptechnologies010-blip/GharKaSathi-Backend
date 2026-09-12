const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { generateTokens } = require('../utils/jwt');
const otpService = require('../integrations/otp/mockOtpService');

class AuthService {
  async register(data) {
    const { mobileNumber, password } = data;

    // Check if provider exists
    const existingProvider = await prisma.provider.findUnique({
      where: { mobileNumber }
    });

    if (existingProvider) {
      const error = new Error('Provider with this mobile number already exists');
      error.statusCode = 409;
      error.errorCode = 'PROVIDER_EXISTS';
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const provider = await prisma.provider.create({
      data: {
        mobileNumber,
        passwordHash,
        accountStatus: 'PENDING',
        profile: {
          create: {} // Create an empty profile record
        },
        earnings: {
          create: {} // Create an empty earnings record
        }
      }
    });

    // We don't generate tokens here, they need to verify OTP/login first
    return {
      provider: {
        id: provider.id,
        mobileNumber: provider.mobileNumber,
        accountStatus: provider.accountStatus
      }
    };
  }

  async sendOtp(mobileNumber) {
    const provider = await prisma.provider.findUnique({
      where: { mobileNumber }
    });

    if (!provider) {
      const error = new Error('Provider not found');
      error.statusCode = 404;
      error.errorCode = 'PROVIDER_NOT_FOUND';
      throw error;
    }

    // Call external OTP service
    await otpService.sendOtp(mobileNumber);

    // Create or update OTP record in DB for testing/tracking purposes
    const otpHash = await bcrypt.hash('1234', 10); // Hardcoded '1234' for mock

    await prisma.otpVerification.upsert({
      where: { mobileNumber },
      update: {
        otpHash,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 mins
        attempts: 0,
        isVerified: false
      },
      create: {
        id: require('uuid').v4(),
        mobileNumber,
        otpHash,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      }
    });

    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(mobileNumber, otp) {
    const otpRecord = await prisma.otpVerification.findFirst({
      where: { mobileNumber }
    });

    if (!otpRecord) {
      const error = new Error('OTP not requested');
      error.statusCode = 400;
      error.errorCode = 'OTP_NOT_REQUESTED';
      throw error;
    }

    if (new Date() > otpRecord.expiresAt) {
      const error = new Error('OTP expired');
      error.statusCode = 400;
      error.errorCode = 'OTP_EXPIRED';
      throw error;
    }

    const isValid = await bcrypt.compare(otp, otpRecord.otpHash);
    if (!isValid) {
      // Increment attempts
      await prisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: { attempts: otpRecord.attempts + 1 }
      });
      const error = new Error('Invalid OTP');
      error.statusCode = 400;
      error.errorCode = 'INVALID_OTP';
      throw error;
    }

    await prisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: { isVerified: true }
    });

    await prisma.provider.update({
      where: { mobileNumber },
      data: { isMobileVerified: true }
    });

    return { message: 'OTP verified successfully' };
  }

  async login(mobileNumber, password, deviceInfo) {
    const provider = await prisma.provider.findUnique({
      where: { mobileNumber }
    });

    if (!provider) {
      const error = new Error('Invalid mobile number or password');
      error.statusCode = 401;
      error.errorCode = 'INVALID_CREDENTIALS';
      throw error;
    }

    const isMatch = await bcrypt.compare(password, provider.passwordHash);
    if (!isMatch) {
      const error = new Error('Invalid mobile number or password');
      error.statusCode = 401;
      error.errorCode = 'INVALID_CREDENTIALS';
      throw error;
    }

    if (!provider.isMobileVerified) {
      const error = new Error('Mobile number not verified');
      error.statusCode = 403;
      error.errorCode = 'MOBILE_NOT_VERIFIED';
      throw error;
    }

    const { accessToken, refreshToken } = generateTokens(provider.id);

    // Save refresh token
    await prisma.session.create({
      data: {
        providerId: provider.id,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        deviceInfo
      }
    });

    // Update last login
    await prisma.provider.update({
      where: { id: provider.id },
      data: { lastLoginAt: new Date() }
    });

    return {
      accessToken,
      refreshToken,
      provider: {
        id: provider.id,
        mobileNumber: provider.mobileNumber,
        accountStatus: provider.accountStatus,
        kycStatus: provider.kycStatus
      }
    };
  }

  async logout(refreshToken) {
    await prisma.session.deleteMany({
      where: { refreshToken }
    });
  }
}

module.exports = new AuthService();
