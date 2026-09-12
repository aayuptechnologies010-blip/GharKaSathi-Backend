const { errorResponse } = require('../utils/response');

const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error } = schema.validate(req[source], { abortEarly: false });
    
    if (error) {
      const details = error.details.map(d => ({ message: d.message, path: d.path }));
      return errorResponse(res, 400, 'Validation Error', 'VALIDATION_ERROR', details);
    }
    
    next();
  };
};

module.exports = validate;
