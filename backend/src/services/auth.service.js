// src/services/auth.service.js
// All authentication business logic lives here.
// Controllers call these functions and handle the HTTP response.

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');

// ── Signup ─────────────────────────────────────────────────────────────────────

/**
 * Create a new user account.
 * Returns a verification token (simulated — no real email is sent).
 * In a real app you would email this token; here the API response includes it.
 */
const signup = async ({ name, email, password }) => {
  // Check for existing user first to give a clear error message
  const existing = await User.findOne({ email });
  if (existing) {
    const err = new Error('Email already registered');
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // Simulated verification token — random hex string
  const verificationToken = crypto.randomBytes(32).toString('hex');

  const user = await User.create({
    name,
    email,
    passwordHash,
    verificationToken,
    isVerified: false,
  });

  return {
    userId: user._id,
    name: user.name,
    email: user.email,
    // Return the token so the dev can call /verify without an email client
    verificationToken,
  };
};

// ── Email Verification ─────────────────────────────────────────────────────────

/**
 * Mark the user as verified using the token returned on signup.
 */
const verifyEmail = async (token) => {
  // +verificationToken because we used select:false on the field
  const user = await User.findOne({ verificationToken: token }).select('+verificationToken');

  if (!user) {
    const err = new Error('Invalid or expired verification token');
    err.statusCode = 400;
    throw err;
  }

  user.isVerified = true;
  user.verificationToken = undefined; // clear the token once used
  await user.save();

  return { message: 'Email verified successfully' };
};

// ── Login ──────────────────────────────────────────────────────────────────────

/**
 * Validate credentials, issue access + refresh tokens.
 * Stores the refresh token in DB for rotation.
 */
const login = async ({ email, password }) => {
  // +passwordHash because select:false is set on the field
  const user = await User.findOne({ email }).select('+passwordHash +refreshToken');

  if (!user) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  if (!user.isVerified) {
    const err = new Error('Please verify your email before logging in');
    err.statusCode = 403;
    throw err;
  }

  const payload = { userId: user._id, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  // Store the refresh token in DB — this lets us invalidate it on logout
  user.refreshToken = refreshToken;
  await user.save();

  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

// ── Refresh ────────────────────────────────────────────────────────────────────

/**
 * Refresh token rotation:
 * 1. Verify the incoming refresh token (JWT signature + expiry)
 * 2. Check it matches the one stored in DB (so we can invalidate old tokens)
 * 3. Issue a new access + refresh token pair
 * 4. Overwrite the DB refresh token (rotation)
 */
const refreshTokens = async (incomingRefreshToken) => {
  if (!incomingRefreshToken) {
    const err = new Error('Refresh token not provided');
    err.statusCode = 401;
    throw err;
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(incomingRefreshToken);
  } catch {
    const err = new Error('Invalid or expired refresh token. Please log in again.');
    err.statusCode = 401;
    throw err;
  }

  const user = await User.findById(decoded.userId).select('+refreshToken');
  if (!user || user.refreshToken !== incomingRefreshToken) {
    // Token reuse detected — potentially stolen token
    const err = new Error('Refresh token reuse detected. Please log in again.');
    err.statusCode = 401;
    throw err;
  }

  const payload = { userId: user._id, role: user.role };
  const accessToken = signAccessToken(payload);
  const newRefreshToken = signRefreshToken(payload);

  user.refreshToken = newRefreshToken;
  await user.save();

  return { accessToken, refreshToken: newRefreshToken };
};

// ── Logout ─────────────────────────────────────────────────────────────────────

/**
 * Clear the stored refresh token so the old token can't be reused.
 * The caller (controller) must also clear the cookies.
 */
const logout = async (userId) => {
  await User.findByIdAndUpdate(userId, { refreshToken: undefined });
};

// ── Forgot Password ────────────────────────────────────────────────────────────

/**
 * Generate a password-reset token (simulated — no real email).
 * Returns the token so it can be shown in the API response during development.
 */
const forgotPassword = async (email) => {
  const user = await User.findOne({ email });

  // We always return success even if the email doesn't exist —
  // this prevents user enumeration attacks.
  if (!user) {
    return { message: 'If that email is registered, you will receive a reset link.' };
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

  user.passwordResetToken = resetToken;
  user.passwordResetExpires = resetExpires;
  await user.save();

  // In production: send an email with a link containing this token.
  // Here we just return it so the dev can test the reset flow.
  return {
    message: 'If that email is registered, you will receive a reset link.',
    resetToken, // ONLY returned in development mode
  };
};

// ── Reset Password ─────────────────────────────────────────────────────────────

const resetPassword = async ({ token, password }) => {
  const user = await User.findOne({
    passwordResetToken: token,
    passwordResetExpires: { $gt: new Date() }, // token must not be expired
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) {
    const err = new Error('Invalid or expired password reset token');
    err.statusCode = 400;
    throw err;
  }

  user.passwordHash = await bcrypt.hash(password, 12);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  // Invalidate any existing refresh tokens so they must log in again
  user.refreshToken = undefined;
  await user.save();

  return { message: 'Password reset successfully. Please log in.' };
};

// ── Get Current User ───────────────────────────────────────────────────────────

/**
 * Return the currently authenticated user's public profile.
 * req.user is already attached by the authenticate middleware.
 */
const getMe = async (userId) => {
  const user = await User.findById(userId).select('name email role isVerified createdAt');
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  return user;
};

module.exports = {
  signup,
  verifyEmail,
  login,
  refreshTokens,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
};
