// tests/comments.test.js

const {
  app,
  request,
  connectTestDB,
  disconnectTestDB,
  clearDB,
  createUserAndLogin,
} = require('./helpers');

beforeAll(async () => { await connectTestDB(); });
afterAll(async () => { await disconnectTestDB(); });
beforeEach(async () => { await clearDB(); });

const validPost = {
  title:       'Integration with Jira for issue tracking',
  description: 'Connect the portal to Jira so engineering can track progress.',
  category:    'Integrations',
};

describe('Comments', () => {
  let postId;
  let authorCookies;
  let otherCookies;
  let adminCookies;

  beforeEach(async () => {
    const author = await createUserAndLogin({
      name: 'Author', email: 'cauth@example.com', password: 'Password1!',
    });
    authorCookies = author.cookies;

    const other = await createUserAndLogin({
      name: 'Other', email: 'cother@example.com', password: 'Password1!',
    });
    otherCookies = other.cookies;

    const admin = await createUserAndLogin({
      name: 'Admin', email: 'cadmin@example.com', password: 'Password1!', role: 'ADMIN',
    });
    adminCookies = admin.cookies;

    const postRes = await request(app)
      .post('/api/posts')
      .set('Cookie', authorCookies)
      .send(validPost);

    postId = postRes.body.data.post._id;
  });

  it('should create a top-level comment', async () => {
    const res = await request(app)
      .post(`/api/posts/${postId}/comments`)
      .set('Cookie', otherCookies)
      .send({ content: 'Great idea! We really need this.' });

    expect(res.status).toBe(201);
    expect(res.body.data.comment.content).toBe('Great idea! We really need this.');
    expect(res.body.data.comment.parentComment).toBeNull();
  });

  it('should create a threaded reply', async () => {
    // Create parent comment
    const parentRes = await request(app)
      .post(`/api/posts/${postId}/comments`)
      .set('Cookie', otherCookies)
      .send({ content: 'Parent comment.' });

    const parentId = parentRes.body.data.comment._id;

    // Create reply
    const replyRes = await request(app)
      .post(`/api/posts/${postId}/comments`)
      .set('Cookie', authorCookies)
      .send({ content: 'Reply to parent.', parentComment: parentId });

    expect(replyRes.status).toBe(201);
    expect(replyRes.body.data.comment.parentComment).toBe(parentId);
  });

  it('author can edit their own comment', async () => {
    const createRes = await request(app)
      .post(`/api/posts/${postId}/comments`)
      .set('Cookie', otherCookies)
      .send({ content: 'Original content.' });

    const commentId = createRes.body.data.comment._id;

    const editRes = await request(app)
      .patch(`/api/comments/${commentId}`)
      .set('Cookie', otherCookies)
      .send({ content: 'Edited content.' });

    expect(editRes.status).toBe(200);
    expect(editRes.body.data.comment.content).toBe('Edited content.');
  });

  it('other user cannot edit someone else\'s comment', async () => {
    const createRes = await request(app)
      .post(`/api/posts/${postId}/comments`)
      .set('Cookie', otherCookies)
      .send({ content: 'My comment.' });

    const commentId = createRes.body.data.comment._id;

    const editRes = await request(app)
      .patch(`/api/comments/${commentId}`)
      .set('Cookie', authorCookies)
      .send({ content: 'Hijacked.' });

    expect(editRes.status).toBe(403);
  });

  it('admin can delete any comment', async () => {
    const createRes = await request(app)
      .post(`/api/posts/${postId}/comments`)
      .set('Cookie', otherCookies)
      .send({ content: 'A comment to be deleted.' });

    const commentId = createRes.body.data.comment._id;

    const deleteRes = await request(app)
      .delete(`/api/comments/${commentId}`)
      .set('Cookie', adminCookies);

    expect(deleteRes.status).toBe(200);
  });

  it('should return nested comment tree', async () => {
    // Create parent
    const parentRes = await request(app)
      .post(`/api/posts/${postId}/comments`)
      .set('Cookie', authorCookies)
      .send({ content: 'Top-level' });
    const parentId = parentRes.body.data.comment._id;

    // Create reply
    await request(app)
      .post(`/api/posts/${postId}/comments`)
      .set('Cookie', otherCookies)
      .send({ content: 'Reply', parentComment: parentId });

    const getRes = await request(app).get(`/api/posts/${postId}/comments`);

    expect(getRes.status).toBe(200);
    const comments = getRes.body.data.comments;
    const parent = comments.find((c) => c._id === parentId);
    expect(parent).toBeDefined();
    expect(parent.replies).toHaveLength(1);
    expect(parent.replies[0].content).toBe('Reply');
  });
});
