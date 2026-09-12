const { verifyAccessToken } = require('../utils/jwt');
const prisma = require('../config/prisma');
const { errorResponse } = require('../utils/response');

const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyAccessToken(token);

  if (!decoded) {
    return errorResponse(res, 401, 'Invalid or expired token', 'TOKEN_EXPIRED');
  }

  try {
    const provider = await prisma.provider.findUnique({
      where: { id: decoded.id }
    });

    if (!provider) {
      return errorResponse(res, 401, 'Provider not found', 'PROVIDER_NOT_FOUND');
    }

    if (provider.accountStatus === 'BLOCKED' || provider.accountStatus === 'SUSPENDED') {
      return errorResponse(res, 403, 'Account is blocked or suspended', 'ACCOUNT_SUSPENDED');
    }

    req.provider = provider;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = requireAuth;
