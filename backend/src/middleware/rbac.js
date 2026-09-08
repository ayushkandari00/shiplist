// src/middleware/rbac.js
// Role-Based Access Control middleware factory.
// Usage: router.patch('/admin/...', authenticate, requireRole('ADMIN'), handler)

const { sendError } = require('../utils/response');

/**
 * Returns a middleware that checks req.user.role against the allowed roles.
 * Must be used AFTER the authenticate middleware.
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      // Defensive check — authenticate should have run first
      return sendError(res, 'Not authenticated', 401);
    }

    if (!roles.includes(req.user.role)) {
      return sendError(
        res,
        `Access denied. Required role: ${roles.join(' or ')}`,
        403
      );
    }

    return next();
  };
};

module.exports = requireRole;
