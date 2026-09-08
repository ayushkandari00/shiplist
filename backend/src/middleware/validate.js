// src/middleware/validate.js
// Generic Zod validation middleware factory.
// Usage: router.post('/signup', validate(signupSchema), authController.signup)

const { sendError } = require('../utils/response');

/**
 * Returns an Express middleware that validates req.body against the given Zod schema.
 * On failure it returns 400 with a structured list of field errors.
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      // Format Zod errors into { field: message } pairs
      const errors = result.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return sendError(res, 'Validation failed', 400, errors);
    }
    // Replace the source with the parsed (and coerced) data
    req[source] = result.data;
    return next();
  };
};

module.exports = validate;
