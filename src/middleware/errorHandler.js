const { errorResponse } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  console.error(err);

  // Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      return errorResponse(res, 409, 'Resource already exists', 'CONFLICT', { field: err.meta?.target });
    }
  }

  // Joi validation errors
  if (err.isJoi) {
    const details = err.details.map(d => ({ message: d.message, path: d.path }));
    return errorResponse(res, 400, 'Validation Error', 'VALIDATION_ERROR', details);
  }

  // Custom Application Errors
  if (err.statusCode) {
    return errorResponse(res, err.statusCode, err.message, err.errorCode || 'APPLICATION_ERROR');
  }

  // Default server error
  const statusCode = 500;
  const message = process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message;
  
  errorResponse(res, statusCode, message, 'INTERNAL_SERVER_ERROR');
};

module.exports = errorHandler;
