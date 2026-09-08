// src/routes/auth.routes.js

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const authController = require('../controllers/auth.controller');
const authenticate   = require('../middleware/auth');
const validate       = require('../middleware/validate');
const {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('../validators/auth');

// Rate limiter for auth endpoints — prevents brute-force attacks.
// 10 requests per 15 minutes per IP.
// Bypassed in test environment so supertest runs don't trip the limit.
const authLimiter = process.env.NODE_ENV === 'test'
  ? (req, res, next) => next() // no-op in tests
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 10,
      message: { success: false, message: 'Too many requests. Please try again in 15 minutes.' },
      standardHeaders: true,
      legacyHeaders: false,
    });

// Public routes
router.post('/signup',          authLimiter, validate(signupSchema),          authController.signup);
router.get( '/verify-email',                                                   authController.verifyEmail);
router.post('/login',           authLimiter, validate(loginSchema),            authController.login);
router.post('/refresh',                                                         authController.refresh);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema),   authController.forgotPassword);
router.post('/reset-password',  authLimiter, validate(resetPasswordSchema),    authController.resetPassword);

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.get( '/me',     authenticate, authController.getMe);

module.exports = router;
