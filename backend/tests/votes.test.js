// tests/votes.test.js

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
  title:       'Performance improvements to the API',
  description: 'Current API response times are too high. We need to optimise queries.',
  category:    'Performance',
};

describe('Votes', () => {
  let postId;
  let userCookies;
  let otherCookies;

  beforeEach(async () => {
    const author = await createUserAndLogin({
      name: 'Author', email: 'author@votes.com', password: 'Password1!',
    });
    userCookies = author.cookies;

    const other = await createUserAndLogin({
      name: 'Other', email: 'other@votes.com', password: 'Password1!',
    });
    otherCookies = other.cookies;

    const createRes = await request(app)
      .post('/api/posts')
      .set('Cookie', userCookies)
      .send(validPost);

    postId = createRes.body.data.post._id;
  });

  it('should allow a user to vote on a post', async () => {
    const res = await request(app)
      .post(`/api/posts/${postId}/vote`)
      .set('Cookie', otherCookies);

    expect(res.status).toBe(200);
    expect(res.body.data.hasVoted).toBe(true);
    expect(res.body.data.voteCount).toBe(1);
  });

  it('should prevent duplicate voting', async () => {
    // First vote
    await request(app)
      .post(`/api/posts/${postId}/vote`)
      .set('Cookie', otherCookies);

    // Second vote — should fail
    const res = await request(app)
      .post(`/api/posts/${postId}/vote`)
      .set('Cookie', otherCookies);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('should allow a user to remove their vote', async () => {
    // Vote first
    await request(app)
      .post(`/api/posts/${postId}/vote`)
      .set('Cookie', otherCookies);

    // Remove vote
    const res = await request(app)
      .delete(`/api/posts/${postId}/vote`)
      .set('Cookie', otherCookies);

    expect(res.status).toBe(200);
    expect(res.body.data.hasVoted).toBe(false);
    expect(res.body.data.voteCount).toBe(0);
  });

  it('should not allow removing a vote that was never cast', async () => {
    const res = await request(app)
      .delete(`/api/posts/${postId}/vote`)
      .set('Cookie', otherCookies);

    expect(res.status).toBe(409);
  });

  it('should require authentication to vote', async () => {
    const res = await request(app).post(`/api/posts/${postId}/vote`);
    expect(res.status).toBe(401);
  });
});
