// src/validators/posts.js
// Zod schemas for post request bodies.

const { z } = require('zod');
const { POST_CATEGORIES, POST_STATUSES } = require('../constants');

const createPostSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title cannot exceed 200 characters'),
  description: z
    .string({ required_error: 'Description is required' })
    .min(10, 'Description must be at least 10 characters'),
  category: z.enum(POST_CATEGORIES, {
    errorMap: () => ({ message: `Category must be one of: ${POST_CATEGORIES.join(', ')}` }),
  }),
});

// On update, all fields are optional — only send what you want to change.
const updatePostSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title cannot exceed 200 characters')
    .optional(),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .optional(),
  category: z
    .enum(POST_CATEGORIES, {
      errorMap: () => ({ message: `Category must be one of: ${POST_CATEGORIES.join(', ')}` }),
    })
    .optional(),
});

module.exports = { createPostSchema, updatePostSchema };
