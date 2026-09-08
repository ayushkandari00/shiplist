// src/validators/comments.js

const { z } = require('zod');

const createCommentSchema = z.object({
  content: z
    .string({ required_error: 'Content is required' })
    .min(1, 'Comment cannot be empty'),
  parentComment: z
    .string()
    .regex(/^[a-fA-F0-9]{24}$/, 'parentComment must be a valid MongoDB ObjectId')
    .optional()
    .nullable(),
});

const updateCommentSchema = z.object({
  content: z
    .string({ required_error: 'Content is required' })
    .min(1, 'Comment cannot be empty'),
});

module.exports = { createCommentSchema, updateCommentSchema };
