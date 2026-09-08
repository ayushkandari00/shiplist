// src/controllers/comments.controller.js

const commentsService = require('../services/comments.service');
const { sendSuccess } = require('../utils/response');

const getComments = async (req, res, next) => {
  try {
    const comments = await commentsService.getCommentsByPost(req.params.postId);
    return sendSuccess(res, { comments }, 'Comments retrieved');
  } catch (err) {
    return next(err);
  }
};

const createComment = async (req, res, next) => {
  try {
    const comment = await commentsService.createComment({
      postId:        req.params.postId,
      authorId:      req.user._id,
      content:       req.body.content,
      parentComment: req.body.parentComment,
    });
    return sendSuccess(res, { comment }, 'Comment created', 201);
  } catch (err) {
    return next(err);
  }
};

const updateComment = async (req, res, next) => {
  try {
    const comment = await commentsService.updateComment({
      commentId: req.params.id,
      userId:    req.user._id,
      userRole:  req.user.role,
      content:   req.body.content,
    });
    return sendSuccess(res, { comment }, 'Comment updated');
  } catch (err) {
    return next(err);
  }
};

const deleteComment = async (req, res, next) => {
  try {
    const result = await commentsService.deleteComment({
      commentId: req.params.id,
      userId:    req.user._id,
      userRole:  req.user.role,
    });
    return sendSuccess(res, null, result.message);
  } catch (err) {
    return next(err);
  }
};

module.exports = { getComments, createComment, updateComment, deleteComment };
