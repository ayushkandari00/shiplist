// src/services/posts.service.js
// Business logic for feature request posts (CRUD + list with filters).

const mongoose = require('mongoose');
const Post = require('../models/Post');

// ── Create ─────────────────────────────────────────────────────────────────────

const createPost = async ({ title, description, category, authorId }) => {
  const post = await Post.create({
    title,
    description,
    category,
    author: authorId,
  });

  // Populate the author info so the response includes the user's name
  await post.populate('author', 'name email');
  return post;
};

// ── List (with pagination, filtering, search, sorting) ────────────────────────

const getPosts = async ({ page, limit, category, status, search, sort, order }) => {
  // Build the MongoDB filter object dynamically
  const filter = {};

  if (category) filter.category = category;
  if (status)   filter.status   = status;

  // Full-text search uses the text index on title + description.
  // If no search term, skip the $text filter (text index queries are expensive).
  if (search) {
    filter.$text = { $search: search };
  }

  const sortOrder = order === 'asc' ? 1 : -1;
  const sortObj = { [sort]: sortOrder };

  // If sorting by voteCount or commentCount (not the text relevance score),
  // add createdAt as a tiebreaker for consistent pagination.
  if (sort !== 'createdAt') {
    sortObj.createdAt = -1;
  }

  const skip = (page - 1) * limit;

  // Run count and data fetch in parallel for performance
  const [total, posts] = await Promise.all([
    Post.countDocuments(filter),
    Post.find(filter)
      .populate('author', 'name email')
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .select('-voters'), // voters array can be large; exclude from list response
  ]);

  return {
    posts,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ── Get Single ─────────────────────────────────────────────────────────────────

const getPostById = async (postId) => {
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    const err = new Error('Invalid post ID');
    err.statusCode = 400;
    throw err;
  }

  const post = await Post.findById(postId).populate('author', 'name email');

  if (!post) {
    const err = new Error('Post not found');
    err.statusCode = 404;
    throw err;
  }

  return post;
};

// ── Update ─────────────────────────────────────────────────────────────────────

const updatePost = async ({ postId, userId, userRole, updates }) => {
  const post = await getPostById(postId);

  // Only the original author or an admin can edit
  const isAuthor = post.author._id.toString() === userId.toString();
  const isAdmin  = userRole === 'ADMIN';

  if (!isAuthor && !isAdmin) {
    const err = new Error('You are not authorised to edit this post');
    err.statusCode = 403;
    throw err;
  }

  // Apply only the fields that were sent (partial update)
  Object.assign(post, updates);
  await post.save();
  await post.populate('author', 'name email');

  return post;
};

// ── Delete ─────────────────────────────────────────────────────────────────────

const deletePost = async ({ postId, userId, userRole }) => {
  const post = await getPostById(postId);

  const isAuthor = post.author._id.toString() === userId.toString();
  const isAdmin  = userRole === 'ADMIN';

  if (!isAuthor && !isAdmin) {
    const err = new Error('You are not authorised to delete this post');
    err.statusCode = 403;
    throw err;
  }

  await post.deleteOne();
  return { message: 'Post deleted successfully' };
};

module.exports = {
  createPost,
  getPosts,
  getPostById,
  updatePost,
  deletePost,
};
