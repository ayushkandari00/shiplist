// src/routes/comments.routes.js
// Standalone comment routes (edit and delete by comment ID, not nested under a post)

const express = require('express');
const router = express.Router();

const commentsController = require('../controllers/comments.controller');
const authenticate       = require('../middleware/auth');
const validate           = require('../middleware/validate');
const { updateCommentSchema } = require('../validators/comments');

router.patch( '/:id', authenticate, validate(updateCommentSchema), commentsController.updateComment);
router.delete('/:id', authenticate,                                 commentsController.deleteComment);

module.exports = router;
