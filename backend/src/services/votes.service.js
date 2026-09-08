// src/services/votes.service.js
// Voting logic using MongoDB atomic operations.
// We NEVER do: read → check → modify → save
// Instead we use $addToSet / $pull / $inc in a single findOneAndUpdate call.

const mongoose = require('mongoose');
const Post = require('../models/Post');

// ── Add Vote ───────────────────────────────────────────────────────────────────

/**
 * Vote for a post.
 * $addToSet ensures the userId is only added once (prevents duplicate votes).
 * $inc bumps the voteCount — but ONLY if $addToSet actually changed the document.
 *
 * The trick: we use a condition in the filter that the userId is NOT yet in voters.
 * If the user already voted, the filter won't match, so no update happens.
 */
const addVote = async (postId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    const err = new Error('Invalid post ID');
    err.statusCode = 400;
    throw err;
  }

  // Filter: post exists AND user has NOT already voted
  const updatedPost = await Post.findOneAndUpdate(
    { _id: postId, voters: { $ne: userId } },
    {
      $addToSet: { voters: userId },
      $inc: { voteCount: 1 },
    },
    { new: true } // return the updated document
  );

  if (!updatedPost) {
    // Either post doesn't exist or user already voted
    const postExists = await Post.exists({ _id: postId });
    if (!postExists) {
      const err = new Error('Post not found');
      err.statusCode = 404;
      throw err;
    }
    // Post exists but user already voted
    const err = new Error('You have already voted for this post');
    err.statusCode = 409;
    throw err;
  }

  return {
    voteCount: updatedPost.voteCount,
    hasVoted: true,
  };
};

// ── Remove Vote ────────────────────────────────────────────────────────────────

/**
 * Remove a vote from a post.
 * Filter: user IS in voters.
 * $pull removes the userId; $inc decrements the count.
 */
const removeVote = async (postId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    const err = new Error('Invalid post ID');
    err.statusCode = 400;
    throw err;
  }

  const updatedPost = await Post.findOneAndUpdate(
    { _id: postId, voters: userId },
    {
      $pull: { voters: userId },
      $inc: { voteCount: -1 },
    },
    { new: true }
  );

  if (!updatedPost) {
    const postExists = await Post.exists({ _id: postId });
    if (!postExists) {
      const err = new Error('Post not found');
      err.statusCode = 404;
      throw err;
    }
    const err = new Error('You have not voted for this post');
    err.statusCode = 409;
    throw err;
  }

  return {
    voteCount: updatedPost.voteCount,
    hasVoted: false,
  };
};

module.exports = { addVote, removeVote };
