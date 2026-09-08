// src/controllers/auth.controller.js
// Controllers are intentionally thin — they call a service and send the response.

const authService = require('../services/auth.service');
const { sendSuccess, sendError } = require('../utils/response');
const { accessTokenCookieOptions, refreshTokenCookieOptions } = require('../utils/cookie');

// ── POST /auth/signup ──────────────────────────────────────────────────────────
const signup = async (req, res, next) => {
  try {
    const result = await authService.signup(req.body);
    return sendSuccess(res, result, 'Account created. Please verify your email.', 201);
  } catch (err) {
    return next(err);
  }
};

// ── GET /auth/verify-email?token=... ──────────────────────────────────────────
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) return sendError(res, 'Verification token is required', 400);
    const result = await authService.verifyEmail(token);
    return sendSuccess(res, result, result.message);
  } catch (err) {
    return next(err);
  }
};

// ── POST /auth/login ───────────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { accessToken, refreshToken, user } = await authService.login(req.body);

    // Set both tokens in httpOnly cookies
    res.cookie('accessToken', accessToken, accessTokenCookieOptions());
    res.cookie('refreshToken', refreshToken, refreshTokenCookieOptions());

    return sendSuccess(res, { user }, 'Logged in successfully');
  } catch (err) {
    return next(err);
  }
};

// ── POST /auth/refresh ─────────────────────────────────────────────────────────
const refresh = async (req, res, next) => {
  try {
    const incomingRefreshToken = req.cookies?.refreshToken;
    const { accessToken, refreshToken } = await authService.refreshTokens(incomingRefreshToken);

    res.cookie('accessToken', accessToken, accessTokenCookieOptions());
    res.cookie('refreshToken', refreshToken, refreshTokenCookieOptions());

    return sendSuccess(res, null, 'Tokens refreshed successfully');
  } catch (err) {
    return next(err);
  }
};

// ── POST /auth/logout ──────────────────────────────────────────────────────────
const logout = async (req, res, next) => {
  try {
    // req.user is set by the authenticate middleware
    await authService.logout(req.user._id);

    // Clear cookies by setting maxAge to 0
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    return sendSuccess(res, null, 'Logged out successfully');
  } catch (err) {
    return next(err);
  }
};

// ── POST /auth/forgot-password ─────────────────────────────────────────────────
const forgotPassword = async (req, res, next) => {
  try {
    const result = await authService.forgotPassword(req.body.email);
    return sendSuccess(res, result, result.message);
  } catch (err) {
    return next(err);
  }
};

// ── POST /auth/reset-password ──────────────────────────────────────────────────
const resetPassword = async (req, res, next) => {
  try {
    const result = await authService.resetPassword(req.body);
    return sendSuccess(res, result, result.message);
  } catch (err) {
    return next(err);
  }
};

// ── GET /auth/me ───────────────────────────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user._id);
    return sendSuccess(res, { user }, 'User profile retrieved');
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  signup,
  verifyEmail,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
};
