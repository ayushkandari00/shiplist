// tests/posts.test.js

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
  title:       'Add dark mode to the dashboard',
  description: 'The current white theme is harsh on the eyes at night. Dark mode would help.',
  category:    'UI/UX',
};

describe('Posts — Create', () => {
  it('should create a post when authenticated', async () => {
    const { cookies } = await createUserAndLogin({
      name: 'Post User', email: 'poster@example.com', password: 'Password1!',
    });

    const res = await request(app)
      .post('/api/posts')
      .set('Cookie', cookies)
      .send(validPost);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.post.title).toBe(validPost.title);
    expect(res.body.data.post.status).toBe('Under Review');
  });

  it('should reject post creation without authentication', async () => {
    const res = await request(app).post('/api/posts').send(validPost);
    expect(res.status).toBe(401);
  });

  it('should reject post with missing fields', async () => {
    const { cookies } = await createUserAndLogin({
      name: 'User', email: 'u@example.com', password: 'Password1!',
    });

    const res = await request(app)
      .post('/api/posts')
      .set('Cookie', cookies)
      .send({ title: 'Short' }); // missing description and category

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });
});

describe('Posts — Read', () => {
  it('should list posts without authentication', async () => {
    const res = await request(app).get('/api/posts');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('posts');
    expect(res.body.data).toHaveProperty('pagination');
  });

  it('should filter posts by category', async () => {
    const { cookies } = await createUserAndLogin({
      name: 'Filter User', email: 'filter@example.com', password: 'Password1!',
    });

    await request(app).post('/api/posts').set('Cookie', cookies).send(validPost);

    const res = await request(app).get('/api/posts?category=UI/UX');
    expect(res.status).toBe(200);
    res.body.data.posts.forEach((p) => expect(p.category).toBe('UI/UX'));
  });
});

describe('Posts — Authorisation', () => {
  it('author can edit their own post', async () => {
    const { cookies } = await createUserAndLogin({
      name: 'Author', email: 'author@example.com', password: 'Password1!',
    });

    const createRes = await request(app)
      .post('/api/posts')
      .set('Cookie', cookies)
      .send(validPost);

    const postId = createRes.body.data.post._id;

    const updateRes = await request(app)
      .patch(`/api/posts/${postId}`)
      .set('Cookie', cookies)
      .send({ title: 'Updated title for dark mode' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.post.title).toBe('Updated title for dark mode');
  });

  it('another user cannot edit someone else\'s post', async () => {
    const { cookies: authorCookies } = await createUserAndLogin({
      name: 'Author', email: 'authorX@example.com', password: 'Password1!',
    });
    const { cookies: otherCookies } = await createUserAndLogin({
      name: 'Other',  email: 'otherX@example.com',  password: 'Password1!',
    });

    const createRes = await request(app)
      .post('/api/posts')
      .set('Cookie', authorCookies)
      .send(validPost);

    const postId = createRes.body.data.post._id;

    const updateRes = await request(app)
      .patch(`/api/posts/${postId}`)
      .set('Cookie', otherCookies)
      .send({ title: 'Hijacked title' });

    expect(updateRes.status).toBe(403);
  });
});
