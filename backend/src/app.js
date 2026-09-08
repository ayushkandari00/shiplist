// src/app.js
// Sets up Express middleware, security headers, and routes.
// Kept separate from server.js so we can import it in tests without starting a real server.

require('dotenv').config();

const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const cookieParser = require('cookie-parser');

const authRoutes     = require('./routes/auth.routes');
const postsRoutes    = require('./routes/posts.routes');
const commentsRoutes = require('./routes/comments.routes');
const adminRoutes    = require('./routes/admin.routes');
const errorHandler   = require('./middleware/errorHandler');

const app = express();

// ── Security middleware ────────────────────────────────────────────────────────
// helmet sets various HTTP headers to protect against well-known vulnerabilities
app.use(helmet());

// CORS — allow requests from the frontend origin
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true, // required for cookies to be sent cross-origin
  })
);

// ── Body parsing ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── Cookie parsing ─────────────────────────────────────────────────────────────
app.use(cookieParser());

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API Routes ─────────────────────────────────────────────────────────────────
app.use('/auth',         authRoutes);
app.use('/api/posts',    postsRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/admin',    adminRoutes);

// ── 404 handler ────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Central error handler ──────────────────────────────────────────────────────
// Must have 4 parameters for Express to recognise it as an error handler
app.use(errorHandler);

module.exports = app;
