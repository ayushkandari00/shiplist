// src/routes/posts.routes.js

const express = require('express');
const router = express.Router();

const postsController  = require('../controllers/posts.controller');
const votesController  = require('../controllers/votes.controller');
const commentsController = require('../controllers/comments.controller');
const authenticate     = require('../middleware/auth');
const validate         = require('../middleware/validate');
const { createPostSchema, updatePostSchema } = require('../validators/posts');
const { createCommentSchema, updateCommentSchema } = require('../validators/comments');
const { getPostsQuerySchema } = require('../validators/query');

// ── Posts ──────────────────────────────────────────────────────────────────────
router.get( '/',    validate(getPostsQuerySchema, 'query'), postsController.getPosts);
router.get( '/:id',                                         postsController.getPostById);
router.post('/',    authenticate, validate(createPostSchema), postsController.createPost);
router.patch('/:id',authenticate, validate(updatePostSchema), postsController.updatePost);
router.delete('/:id',authenticate,                            postsController.deletePost);

// ── Votes ──────────────────────────────────────────────────────────────────────
router.post(  '/:id/vote', authenticate, votesController.addVote);
router.delete('/:id/vote', authenticate, votesController.removeVote);

// ── Comments ───────────────────────────────────────────────────────────────────
router.get( '/:postId/comments',      commentsController.getComments);
router.post('/:postId/comments', authenticate, validate(createCommentSchema), commentsController.createComment);

module.exports = router;
