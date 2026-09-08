// src/validators/query.js
// Zod schemas for GET /api/posts query parameters.

const { z } = require('zod');
const { POST_CATEGORIES, POST_STATUSES } = require('../constants');

const getPostsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => val > 0, 'Page must be a positive number'),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .refine((val) => val > 0 && val <= 100, 'Limit must be between 1 and 100'),
  category: z
    .enum(POST_CATEGORIES)
    .optional(),
  status: z
    .enum(POST_STATUSES)
    .optional(),
  search: z
    .string()
    .trim()
    .optional(),
  sort: z
    .enum(['voteCount', 'createdAt', 'commentCount'])
    .optional()
    .default('createdAt'),
  order: z
    .enum(['asc', 'desc'])
    .optional()
    .default('desc'),
});

module.exports = { getPostsQuerySchema };
