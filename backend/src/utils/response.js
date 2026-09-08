// src/utils/response.js
// Standardised JSON response helpers so every endpoint sends the same shape.
// This makes the frontend integration straightforward.

/**
 * Send a success response.
 * @param {object} res   - Express response object
 * @param {*}      data  - Data payload (object, array, etc.)
 * @param {string} message
 * @param {number} statusCode - HTTP status code (default 200)
 */
const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Send an error response.
 * @param {object} res
 * @param {string} message
 * @param {number} statusCode
 * @param {*}      errors  - Optional validation error details
 */
const sendError = (res, message = 'Something went wrong', statusCode = 500, errors = null) => {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
};

module.exports = { sendSuccess, sendError };
