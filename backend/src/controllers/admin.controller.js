// src/controllers/admin.controller.js

const { z } = require('zod');
const adminService = require('../services/admin.service');
const { sendSuccess, sendError } = require('../utils/response');
const { POST_STATUSES } = require('../constants');

const updatePostStatus = async (req, res, next) => {
  try {
    const schema = z.object({
      status: z.enum(POST_STATUSES, {
        errorMap: () => ({ message: `Status must be one of: ${POST_STATUSES.join(', ')}` }),
      }),
    });

    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
      return sendError(res, 'Validation failed', 400, errors);
    }

    const post = await adminService.updatePostStatus({
      postId:    req.params.id,
      newStatus: result.data.status,
    });

    return sendSuccess(res, { post }, 'Post status updated');
  } catch (err) {
    return next(err);
  }
};

module.exports = { updatePostStatus };
