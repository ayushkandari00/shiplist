// src/models/Post.js

const mongoose = require('mongoose');
const { POST_CATEGORIES, POST_STATUSES } = require('../constants');

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      // Supports Markdown — we just store the raw markdown string
    },
    category: {
      type: String,
      enum: POST_CATEGORIES,
      required: [true, 'Category is required'],
    },
    status: {
      type: String,
      enum: POST_STATUSES,
      default: 'Under Review',
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // voters is an array of User ObjectIds.
    // Using $addToSet / $pull in atomic operations to prevent duplicates.
    voters: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // Denormalised count so we can sort without counting array length every time.
    voteCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Denormalised comment count for "Most Discussed" sort.
    commentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────────────
// Full-text search across title and description
postSchema.index({ title: 'text', description: 'text' });

// Compound index for the common "filter by status, sort by newest" query
postSchema.index({ status: 1, createdAt: -1 });

// Compound index for "filter by category + status"
postSchema.index({ category: 1, status: 1 });

// Index for "sort by most upvoted"
postSchema.index({ voteCount: -1 });

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
