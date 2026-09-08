// src/models/User.js

const mongoose = require('mongoose');
const { ROLES } = require('../constants');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,          // creates a unique index automatically
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,         // never returned in queries unless explicitly asked
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.USER,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    // For "simulated" email verification — we store the token in DB
    // (no actual email is sent; frontend just reads this from the API response)
    verificationToken: {
      type: String,
      select: false,
    },
    // For simulated password reset
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    // Refresh token stored server-side for rotation + invalidation on logout
    refreshToken: {
      type: String,
      select: false,
    },
  },
  { timestamps: true }
);

// Mongoose already creates an index on `email` because of `unique: true`.
// We add a text index for any potential future user search.
// Keeping it minimal — only indexes we actually use.

const User = mongoose.model('User', userSchema);

module.exports = User;
