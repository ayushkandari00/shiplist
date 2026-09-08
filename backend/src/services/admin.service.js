// src/services/admin.service.js
// Admin-only business logic.

const Post = require('../models/Post');
const { ALLOWED_STATUS_TRANSITIONS } = require('../constants');

/**
 * Update a post's status.
 * Enforces the allowed transition flow:
 *   Under Review → Planned → In Progress → Completed
 */
const updatePostStatus = async ({ postId, newStatus }) => {
  const post = await Post.findById(postId).populate('author', 'name email');

  if (!post) {
    const err = new Error('Post not found');
    err.statusCode = 404;
    throw err;
  }

  const currentStatus = post.status;
  const allowedNext = ALLOWED_STATUS_TRANSITIONS[currentStatus];

  if (!allowedNext.includes(newStatus)) {
    const err = new Error(
      `Cannot transition from "${currentStatus}" to "${newStatus}". ` +
      `Allowed: ${allowedNext.length ? allowedNext.join(', ') : 'none (terminal status)'}`
    );
    err.statusCode = 422;
    throw err;
  }

  post.status = newStatus;
  await post.save();

  return post;
};

module.exports = { updatePostStatus };
