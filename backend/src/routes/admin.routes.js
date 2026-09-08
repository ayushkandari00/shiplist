// src/routes/admin.routes.js

const express = require('express');
const router = express.Router();

const adminController = require('../controllers/admin.controller');
const authenticate    = require('../middleware/auth');
const requireRole     = require('../middleware/rbac');

// PATCH /api/admin/posts/:id/status
// Must be authenticated AND must have ADMIN role
router.patch(
  '/posts/:id/status',
  authenticate,
  requireRole('ADMIN'),
  adminController.updatePostStatus
);

module.exports = router;
