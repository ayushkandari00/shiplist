export const categories = ['UI/UX', 'Integrations', 'Performance', 'General'];
export const statuses = ['Under Review', 'Planned', 'In Progress', 'Completed'];
export const statusMap = { 'Under Review': { label: 'Under review', tone: 'review' }, Planned: { label: 'Planned', tone: 'planned' }, 'In Progress': { label: 'In progress', tone: 'progress' }, Completed: { label: 'Completed', tone: 'done' } };
export const categoryMap = Object.fromEntries(categories.map((category) => [category, category]));
export const sortMap = { Trending: { sort: 'voteCount', order: 'desc' }, Newest: { sort: 'createdAt', order: 'desc' }, 'Most Discussed': { sort: 'commentCount', order: 'desc' } };
