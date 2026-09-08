// src/services/comments.service.js

const mongoose = require('mongoose');
const Comment = require('../models/Comment');
const Post = require('../models/Post');

// ── Get Comments for a Post ────────────────────────────────────────────────────

/**
 * Fetch all comments for a post and build a nested tree in memory.
 * We fetch flat then nest — simple and avoids recursive DB queries.
 *
 * Each top-level comment will have a `replies` array containing its children.
 * We only support one level of nesting in this implementation (replies to replies
 * share the same parentComment so the UI can handle deeper nesting if needed).
 */
const getCommentsByPost = async (postId) => {
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    const err = new Error('Invalid post ID');
    err.statusCode = 400;
    throw err;
  }

  const comments = await Comment.find({ post: postId })
    .populate('author', 'name email')
    .sort({ createdAt: 1 })
    .lean(); // plain JS objects are faster for the nesting step

  // Build the nested tree
  const commentMap = {};
  const roots = [];

  comments.forEach((c) => {
    c.replies = [];
    commentMap[c._id.toString()] = c;
  });

  comments.forEach((c) => {
    if (c.parentComment) {
      const parent = commentMap[c.parentComment.toString()];
      if (parent) {
        parent.replies.push(c);
      } else {
        // Parent was deleted — promote the reply to root level
        roots.push(c);
      }
    } else {
      roots.push(c);
    }
  });

  return roots;
};

// ── Create Comment ─────────────────────────────────────────────────────────────

const createComment = async ({ postId, authorId, content, parentComment }) => {
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    const err = new Error('Invalid post ID');
    err.statusCode = 400;
    throw err;
  }

  // Verify post exists
  const postExists = await Post.exists({ _id: postId });
  if (!postExists) {
    const err = new Error('Post not found');
    err.statusCode = 404;
    throw err;
  }

  // Verify parent comment exists (if provided)
  if (parentComment) {
    if (!mongoose.Types.ObjectId.isValid(parentComment)) {
      const err = new Error('Invalid parentComment ID');
      err.statusCode = 400;
      throw err;
    }
    const parentExists = await Comment.exists({ _id: parentComment, post: postId });
    if (!parentExists) {
      const err = new Error('Parent comment not found on this post');
      err.statusCode = 404;
      throw err;
    }
  }

  const comment = await Comment.create({
    post: postId,
    author: authorId,
    content,
    parentComment: parentComment || null,
  });

  // Increment the post's denormalised comment count atomically
  await Post.findByIdAndUpdate(postId, { $inc: { commentCount: 1 } });

  await comment.populate('author', 'name email');
  return comment;
};

// ── Update Comment ─────────────────────────────────────────────────────────────

const updateComment = async ({ commentId, userId, userRole, content }) => {
  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    const err = new Error('Invalid comment ID');
    err.statusCode = 400;
    throw err;
  }

  const comment = await Comment.findById(commentId).populate('author', 'name email');
  if (!comment) {
    const err = new Error('Comment not found');
    err.statusCode = 404;
    throw err;
  }

  const isAuthor = comment.author._id.toString() === userId.toString();
  const isAdmin  = userRole === 'ADMIN';

  if (!isAuthor && !isAdmin) {
    const err = new Error('You are not authorised to edit this comment');
    err.statusCode = 403;
    throw err;
  }

  comment.content = content;
  await comment.save();
  return comment;
};

// ── Delete Comment ─────────────────────────────────────────────────────────────

const deleteComment = async ({ commentId, userId, userRole }) => {
  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    const err = new Error('Invalid comment ID');
    err.statusCode = 400;
    throw err;
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    const err = new Error('Comment not found');
    err.statusCode = 404;
    throw err;
  }

  const isAuthor = comment.author.toString() === userId.toString();
  const isAdmin  = userRole === 'ADMIN';

  if (!isAuthor && !isAdmin) {
    const err = new Error('You are not authorised to delete this comment');
    err.statusCode = 403;
    throw err;
  }

  await comment.deleteOne();

  // Decrement denormalised count — clamp at 0 to avoid negative counts
  await Post.findByIdAndUpdate(comment.post, {
    $inc: { commentCount: -1 },
  });

  return { message: 'Comment deleted successfully' };
};

module.exports = {
  getCommentsByPost,
  createComment,
  updateComment,
  deleteComment,
};
