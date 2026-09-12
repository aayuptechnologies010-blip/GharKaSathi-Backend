const prisma = require('../config/prisma');
const kycService = require('../integrations/kyc/mockKycService');

class ProviderService {
  async getProfile(providerId) {
    const profile = await prisma.providerProfile.findUnique({
      where: { providerId }
    });
    return profile || {};
  }

  async updateProfile(providerId, profileData) {
    const { fullName, dob, gender } = profileData;

    const profile = await prisma.providerProfile.upsert({
      where: { providerId },
      update: {
        fullName,
        dob: dob ? new Date(dob) : undefined,
        gender
      },
      create: {
        providerId,
        fullName,
        dob: dob ? new Date(dob) : undefined,
        gender
      }
    });

    await this._updateProfileCompletion(providerId);
    return profile;
  }

  async initiateKyc(providerId, aadhaarNumber) {
    // Basic Aadhaar validation (12 digits)
    if (!/^\d{12}$/.test(aadhaarNumber)) {
      const error = new Error('Invalid Aadhaar Number');
      error.statusCode = 400;
      throw error;
    }

    const response = await kycService.initiateVerification(aadhaarNumber);

    if (response.success) {
      const maskedAadhaar = 'XXXXXXXX' + aadhaarNumber.slice(-4);
      
      await prisma.kycVerification.upsert({
        where: { id: 'dummy_for_now_or_find_by_provider' }, // Actually need to query by providerId
        // In Prisma, upsert needs a unique identifier. We'll do findFirst + create/update instead.
      });

      // Proper way to handle 1:1 or 1:many KYC records
      const existingKyc = await prisma.kycVerification.findFirst({
        where: { providerId }
      });

      if (existingKyc) {
        await prisma.kycVerification.update({
          where: { id: existingKyc.id },
          data: {
            providerReferenceId: response.referenceId,
            maskedAadhaar,
            status: 'PENDING'
          }
        });
      } else {
        await prisma.kycVerification.create({
          data: {
            providerId,
            providerReferenceId: response.referenceId,
            maskedAadhaar,
            status: 'PENDING'
          }
        });
      }

      await prisma.provider.update({
        where: { id: providerId },
        data: { kycStatus: 'PENDING' }
      });
    }

    return response;
  }

  async verifyKyc(providerId, referenceId, otp) {
    const response = await kycService.verifyIdentity(referenceId, otp);

    const kycRecord = await prisma.kycVerification.findFirst({
      where: { providerId, providerReferenceId: referenceId }
    });

    if (!kycRecord) {
      const error = new Error('KYC record not found');
      error.statusCode = 404;
      throw error;
    }

    if (response.success) {
      await prisma.kycVerification.update({
        where: { id: kycRecord.id },
        data: {
          status: 'VERIFIED',
          verifiedAt: new Date()
        }
      });

      await prisma.provider.update({
        where: { id: providerId },
        data: { kycStatus: 'VERIFIED' }
      });

      await this._updateProfileCompletion(providerId);
    } else {
      await prisma.kycVerification.update({
        where: { id: kycRecord.id },
        data: { status: 'REJECTED', rejectionReason: response.message }
      });

      await prisma.provider.update({
        where: { id: providerId },
        data: { kycStatus: 'REJECTED' }
      });
    }

    return response;
  }

  async getKycStatus(providerId) {
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      select: { kycStatus: true }
    });
    const kycRecord = await prisma.kycVerification.findFirst({
      where: { providerId },
      orderBy: { createdAt: 'desc' }
    });

    return {
      kycStatus: provider.kycStatus,
      details: kycRecord
    };
  }

  async getProfileCompletion(providerId) {
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      select: { profileCompletionPercentage: true }
    });
    return { completionPercentage: provider.profileCompletionPercentage };
  }

  // Internal helper to calculate completion
  async _updateProfileCompletion(providerId) {
    let score = 0;
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      include: {
        profile: true,
        bankAccount: true,
        services: true,
        skills: true,
        locations: { take: 1 }
      }
    });

    if (provider.isMobileVerified) score += 10;
    if (provider.profile?.fullName) score += 10;
    if (provider.profile?.dob) score += 5;
    if (provider.profile?.profilePhotoUrl) score += 10;
    if (provider.kycStatus === 'VERIFIED') score += 25;
    if (provider.bankAccount?.isVerified) score += 15;
    if (provider.services?.length > 0) score += 15;
    if (provider.profile?.totalExperienceYears > 0) score += 10;

    const finalScore = Math.min(score, 100);

    await prisma.provider.update({
      where: { id: providerId },
      data: { profileCompletionPercentage: finalScore }
    });
  }
}

module.exports = new ProviderService();
