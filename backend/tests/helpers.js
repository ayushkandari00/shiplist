// tests/helpers.js
// Shared test utilities — DB connection, app import, and a helper to get auth cookies.

process.env.NODE_ENV = 'test'; // must be set before app is loaded
require('dotenv').config();

const mongoose   = require('mongoose');
const request    = require('supertest');
const bcrypt     = require('bcryptjs');
const app        = require('../src/app');
const User       = require('../src/models/User');
const Post       = require('../src/models/Post');
const Comment    = require('../src/models/Comment');

const TEST_DB_URI = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/shiplist_test';

const connectTestDB = async () => {
  await mongoose.connect(TEST_DB_URI);
};

const disconnectTestDB = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
};

const clearDB = async () => {
  await Promise.all([
    User.deleteMany(),
    Post.deleteMany(),
    Comment.deleteMany(),
  ]);
};

/**
 * Create a user and return the authenticated supertest agent (with cookies).
 */
const createUserAndLogin = async ({ name, email, password, role = 'USER' }) => {
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, passwordHash, role, isVerified: true });

  const res = await request(app)
    .post('/auth/login')
    .send({ email, password });

  // Extract Set-Cookie header so we can attach it to subsequent requests
  const cookies = res.headers['set-cookie'];
  return { user, cookies };
};

module.exports = {
  app,
  request,
  connectTestDB,
  disconnectTestDB,
  clearDB,
  createUserAndLogin,
  User,
  Post,
  Comment,
};
