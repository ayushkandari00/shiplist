// tests/admin.test.js

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
  title:       'Better onboarding flow for new users',
  description: 'New users struggle to understand the portal. We need a guided tour.',
  category:    'UI/UX',
};

describe('Admin — Status Update', () => {
  let postId;
  let adminCookies;
  let userCookies;

  beforeEach(async () => {
    const admin = await createUserAndLogin({
      name: 'Admin', email: 'admin@test.com', password: 'Password1!', role: 'ADMIN',
    });
    adminCookies = admin.cookies;

    const user = await createUserAndLogin({
      name: 'User', email: 'user@test.com', password: 'Password1!',
    });
    userCookies = user.cookies;

    const postRes = await request(app)
      .post('/api/posts')
      .set('Cookie', userCookies)
      .send(validPost);

    postId = postRes.body.data.post._id;
  });

  it('admin can update post status following allowed transitions', async () => {
    // Under Review → Planned
    const res = await request(app)
      .patch(`/api/admin/posts/${postId}/status`)
      .set('Cookie', adminCookies)
      .send({ status: 'Planned' });

    expect(res.status).toBe(200);
    expect(res.body.data.post.status).toBe('Planned');
  });

  it('admin cannot skip a status step', async () => {
    // Under Review → In Progress (skip Planned) — should fail
    const res = await request(app)
      .patch(`/api/admin/posts/${postId}/status`)
      .set('Cookie', adminCookies)
      .send({ status: 'In Progress' });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('regular user cannot update post status', async () => {
    const res = await request(app)
      .patch(`/api/admin/posts/${postId}/status`)
      .set('Cookie', userCookies)
      .send({ status: 'Planned' });

    expect(res.status).toBe(403);
  });

  it('unauthenticated request is rejected', async () => {
    const res = await request(app)
      .patch(`/api/admin/posts/${postId}/status`)
      .send({ status: 'Planned' });

    expect(res.status).toBe(401);
  });

  it('admin can walk through the full status flow', async () => {
    const steps = [
      { from: 'Under Review', to: 'Planned' },
      { from: 'Planned',      to: 'In Progress' },
      { from: 'In Progress',  to: 'Completed' },
    ];

    for (const step of steps) {
      const res = await request(app)
        .patch(`/api/admin/posts/${postId}/status`)
        .set('Cookie', adminCookies)
        .send({ status: step.to });

      expect(res.status).toBe(200);
      expect(res.body.data.post.status).toBe(step.to);
    }
  });
});
