// src/controllers/votes.controller.js

const votesService = require('../services/votes.service');
const { sendSuccess } = require('../utils/response');

const addVote = async (req, res, next) => {
  try {
    const result = await votesService.addVote(req.params.id, req.user._id);
    return sendSuccess(res, result, 'Vote added');
  } catch (err) {
    return next(err);
  }
};

const removeVote = async (req, res, next) => {
  try {
    const result = await votesService.removeVote(req.params.id, req.user._id);
    return sendSuccess(res, result, 'Vote removed');
  } catch (err) {
    return next(err);
  }
};

module.exports = { addVote, removeVote };
