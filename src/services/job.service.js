const prisma = require('../config/prisma');

class JobService {
  async getDashboard(providerId) {
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      include: { earnings: true }
    });

    const activeJobs = await prisma.job.count({
      where: { providerId, status: { in: ['ASSIGNED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'] } }
    });

    const completedJobs = await prisma.job.count({
      where: { providerId, status: 'COMPLETED' }
    });

    return {
      provider: {
        id: provider.id,
        name: provider.profile?.fullName,
        isAvailable: provider.isAvailable,
        kycStatus: provider.kycStatus
      },
      earningsThisMonth: provider.earnings?.totalEarned || 0,
      totalJobs: activeJobs + completedJobs,
      completedJobs,
      profileCompletion: provider.profileCompletionPercentage
    };
  }

  async acceptJobRequest(providerId, requestId) {
    // We use a transaction to ensure concurrency safety
    return await prisma.$transaction(async (tx) => {
      // 1. Lock the request and verify it's still PENDING
      // Prisma doesn't support SELECT FOR UPDATE directly in finding, so we use executeRaw
      const requests = await tx.$queryRaw`
        SELECT * FROM job_requests 
        WHERE id = ${requestId}::uuid 
        FOR UPDATE NOWAIT
      `;

      if (!requests || requests.length === 0) {
        throw new Error('Job request not found or already locked by another process');
      }

      const request = requests[0];

      if (request.status !== 'PENDING') {
        throw new Error(`Job request is no longer available (Status: ${request.status})`);
      }

      if (new Date() > new Date(request.expires_at)) {
        await tx.$queryRaw`UPDATE job_requests SET status = 'EXPIRED' WHERE id = ${requestId}::uuid`;
        throw new Error('Job request has expired');
      }

      const provider = await tx.provider.findUnique({
        where: { id: providerId }
      });

      if (!provider.isAvailable) {
        throw new Error('You must be available to accept jobs');
      }

      // 2. Mark request as ACCEPTED
      await tx.$queryRaw`
        UPDATE job_requests 
        SET status = 'ACCEPTED', provider_id = ${providerId}::uuid 
        WHERE id = ${requestId}::uuid
      `;

      // 3. Create the Job
      const job = await tx.job.create({
        data: {
          jobRequestId: requestId,
          serviceId: request.service_id,
          customerId: request.customer_id,
          providerId,
          address: request.pickup_address,
          latitude: request.latitude,
          longitude: request.longitude,
          scheduledAt: request.scheduled_at,
          status: 'ACCEPTED',
          finalAmount: request.estimated_amount
        }
      });

      // 4. Update provider availability (they are now busy)
      await tx.provider.update({
        where: { id: providerId },
        data: { isAvailable: false }
      });

      // 5. Track history
      await tx.jobStatusHistory.create({
        data: {
          jobId: job.id,
          status: 'ACCEPTED'
        }
      });

      return job;
    });
  }

  async updateJobStatus(providerId, jobId, newStatus, locationInfo = {}) {
    return await prisma.$transaction(async (tx) => {
      const job = await tx.job.findUnique({
        where: { id: jobId }
      });

      if (!job || job.providerId !== providerId) {
        throw new Error('Job not found or unauthorized');
      }

      // State machine validation
      const validTransitions = {
        'ACCEPTED': ['EN_ROUTE', 'CANCELLED'],
        'EN_ROUTE': ['ARRIVED', 'CANCELLED'],
        'ARRIVED': ['IN_PROGRESS', 'CANCELLED'],
        'IN_PROGRESS': ['COMPLETED']
      };

      if (!validTransitions[job.status] || !validTransitions[job.status].includes(newStatus)) {
        throw new Error(`Invalid status transition from ${job.status} to ${newStatus}`);
      }

      const updateData = { status: newStatus };
      if (newStatus === 'IN_PROGRESS') updateData.startedAt = new Date();
      if (newStatus === 'COMPLETED') updateData.completedAt = new Date();

      const updatedJob = await tx.job.update({
        where: { id: jobId },
        data: updateData
      });

      await tx.jobStatusHistory.create({
        data: {
          jobId,
          status: newStatus,
          latitude: locationInfo.latitude,
          longitude: locationInfo.longitude
        }
      });

      if (newStatus === 'COMPLETED') {
        // Handle earnings
        await this._processJobEarnings(tx, providerId, jobId, job.finalAmount);
        
        // Make provider available again
        await tx.provider.update({
          where: { id: providerId },
          data: { isAvailable: true }
        });
      }

      return updatedJob;
    });
  }

  async _processJobEarnings(tx, providerId, jobId, amount) {
    if (!amount) return;

    await tx.transaction.create({
      data: {
        providerId,
        jobId,
        amount,
        type: 'CREDIT',
        description: 'Earnings for completed job'
      }
    });

    const earnings = await tx.earnings.findUnique({ where: { providerId } });
    if (earnings) {
      await tx.earnings.update({
        where: { providerId },
        data: {
          totalBalance: { increment: amount },
          totalEarned: { increment: amount }
        }
      });
    } else {
      await tx.earnings.create({
        data: {
          providerId,
          totalBalance: amount,
          totalEarned: amount
        }
      });
    }
  }
}

module.exports = new JobService();
