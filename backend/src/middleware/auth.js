// src/middleware/auth.js
// Verifies the access token from the httpOnly cookie and attaches the user
// to req.user so downstream handlers know who made the request.

const { verifyAccessToken } = require('../utils/jwt');
const { sendError } = require('../utils/response');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    // Read from the httpOnly cookie (set by login/refresh endpoints)
    const token = req.cookies?.accessToken;

    if (!token) {
      return sendError(res, 'Not authenticated. Please log in.', 401);
    }

    // Throws if expired or tampered
    const decoded = verifyAccessToken(token);

    // Fetch the user from DB — this lets us catch deleted/banned users
    // We explicitly select role and isVerified since we need them for RBAC
    const user = await User.findById(decoded.userId).select('name email role isVerified');

    if (!user) {
      return sendError(res, 'User no longer exists', 401);
    }

    // Attach user to request for downstream access
    req.user = user;
    return next();
  } catch (err) {
    // jwt.verify throws JsonWebTokenError or TokenExpiredError
    if (err.name === 'TokenExpiredError') {
      return sendError(res, 'Access token expired. Please refresh your token.', 401);
    }
    return sendError(res, 'Invalid token', 401);
  }
};

module.exports = authenticate;
