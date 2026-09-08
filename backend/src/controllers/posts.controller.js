// src/controllers/posts.controller.js

const postsService = require('../services/posts.service');
const { sendSuccess } = require('../utils/response');

const createPost = async (req, res, next) => {
  try {
    const post = await postsService.createPost({
      ...req.body,
      authorId: req.user._id,
    });
    return sendSuccess(res, { post }, 'Feature request created', 201);
  } catch (err) {
    return next(err);
  }
};

const getPosts = async (req, res, next) => {
  try {
    // req.query has already been coerced by the validate middleware
    const result = await postsService.getPosts(req.query);
    return sendSuccess(res, result, 'Posts retrieved');
  } catch (err) {
    return next(err);
  }
};

const getPostById = async (req, res, next) => {
  try {
    const post = await postsService.getPostById(req.params.id);
    return sendSuccess(res, { post }, 'Post retrieved');
  } catch (err) {
    return next(err);
  }
};

const updatePost = async (req, res, next) => {
  try {
    const post = await postsService.updatePost({
      postId:   req.params.id,
      userId:   req.user._id,
      userRole: req.user.role,
      updates:  req.body,
    });
    return sendSuccess(res, { post }, 'Post updated');
  } catch (err) {
    return next(err);
  }
};

const deletePost = async (req, res, next) => {
  try {
    const result = await postsService.deletePost({
      postId:   req.params.id,
      userId:   req.user._id,
      userRole: req.user.role,
    });
    return sendSuccess(res, null, result.message);
  } catch (err) {
    return next(err);
  }
};

module.exports = { createPost, getPosts, getPostById, updatePost, deletePost };
