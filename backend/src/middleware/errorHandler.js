// src/middleware/errorHandler.js
// Central error handler — the last middleware in the Express chain.
// Any error passed to next(err) lands here.

const { sendError } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  console.error('Unhandled error:', err);

  // Mongoose duplicate key error (e.g. duplicate email on signup)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return sendError(res, `${field} already exists`, 409);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return sendError(res, 'Validation failed', 400, errors);
  }

  // Mongoose CastError — invalid ObjectId in URL params
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return sendError(res, 'Invalid ID format', 400);
  }

  // JWT errors (shouldn't usually reach here — auth middleware handles them,
  // but kept as a safety net)
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid token', 401);
  }
  if (err.name === 'TokenExpiredError') {
    return sendError(res, 'Token expired', 401);
  }

  // Fallback — generic 500
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  return sendError(res, message, statusCode);
};

module.exports = errorHandler;
