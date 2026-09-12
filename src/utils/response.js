const successResponse = (res, statusCode, message, data = {}, meta = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta,
  });
};

const errorResponse = (res, statusCode, message, errorCode = 'INTERNAL_ERROR', details = {}) => {
  return res.status(statusCode).json({
    success: false,
    message,
    error: {
      code: errorCode,
      details,
    }
  });
};

module.exports = {
  successResponse,
  errorResponse,
};
