// src/constants/index.js
// All "magic strings" in one place so they're easy to update and explain.

const ROLES = {
  USER: 'USER',
  ADMIN: 'ADMIN',
};

const POST_CATEGORIES = ['UI/UX', 'Integrations', 'Performance', 'General'];

const POST_STATUSES = ['Under Review', 'Planned', 'In Progress', 'Completed'];

// Allowed transitions for the admin status-update endpoint.
// key = current status → value = statuses it may move to.
const ALLOWED_STATUS_TRANSITIONS = {
  'Under Review': ['Planned'],
  'Planned':      ['In Progress'],
  'In Progress':  ['Completed'],
  'Completed':    [], // terminal
};

const SORT_OPTIONS = {
  MOST_UPVOTED:   'voteCount',
  NEWEST:         'createdAt',
  MOST_DISCUSSED: 'commentCount',
};

module.exports = {
  ROLES,
  POST_CATEGORIES,
  POST_STATUSES,
  ALLOWED_STATUS_TRANSITIONS,
  SORT_OPTIONS,
};
