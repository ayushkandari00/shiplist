// tests/auth.test.js

const {
  app,
  request,
  connectTestDB,
  disconnectTestDB,
  clearDB,
  createUserAndLogin,
  User,
} = require('./helpers');

beforeAll(async () => { await connectTestDB(); });
afterAll(async () => { await disconnectTestDB(); });
beforeEach(async () => { await clearDB(); });

describe('Auth — Signup', () => {
  it('should create a new user and return verificationToken', async () => {
    const res = await request(app)
      .post('/auth/signup')
      .send({ name: 'Test User', email: 'test@example.com', password: 'Password1!' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('verificationToken');
    expect(res.body.data.email).toBe('test@example.com');
  });

  it('should reject duplicate email on signup', async () => {
    await request(app)
      .post('/auth/signup')
      .send({ name: 'User A', email: 'dup@example.com', password: 'Password1!' });

    const res = await request(app)
      .post('/auth/signup')
      .send({ name: 'User B', email: 'dup@example.com', password: 'Password1!' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('should reject weak passwords (< 8 chars)', async () => {
    const res = await request(app)
      .post('/auth/signup')
      .send({ name: 'User', email: 'short@example.com', password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('Auth — Login', () => {
  it('should login a verified user and set httpOnly cookies', async () => {
    // Signup
    const signupRes = await request(app)
      .post('/auth/signup')
      .send({ name: 'Login User', email: 'login@example.com', password: 'Password1!' });

    const { verificationToken } = signupRes.body.data;

    // Verify email
    await request(app).get(`/auth/verify-email?token=${verificationToken}`);

    // Login
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'login@example.com', password: 'Password1!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('login@example.com');

    // Cookies should be set
    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    const cookieStr = setCookie.join(' ');
    expect(cookieStr).toMatch(/accessToken/);
    expect(cookieStr).toMatch(/refreshToken/);
    expect(cookieStr).toMatch(/HttpOnly/);
  });

  it('should reject login with wrong password', async () => {
    await request(app)
      .post('/auth/signup')
      .send({ name: 'User', email: 'wrongpass@example.com', password: 'Password1!' });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'wrongpass@example.com', password: 'WrongPass!' });

    expect(res.status).toBe(401);
  });

  it('should reject login for unverified user', async () => {
    await request(app)
      .post('/auth/signup')
      .send({ name: 'Unverified', email: 'unverified@example.com', password: 'Password1!' });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'unverified@example.com', password: 'Password1!' });

    expect(res.status).toBe(403);
  });
});

describe('Auth — Protected route (/auth/me)', () => {
  it('should return user data for authenticated user', async () => {
    const { cookies } = await createUserAndLogin({
      name: 'Me User', email: 'me@example.com', password: 'Password1!',
    });

    const res = await request(app)
      .get('/auth/me')
      .set('Cookie', cookies);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('me@example.com');
  });

  it('should return 401 without a cookie', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });
});
