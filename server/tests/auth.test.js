import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import mongoose from 'mongoose';

import app from '../app.js';
import connectDB from '../config/db.js';
import { getJwtSecret } from '../config/jwt.js';
import { authorize } from '../middleware/auth.js';
import User from '../models/User.js';

test.before(async () => {
  await connectDB();
});

test.after(async () => {
  await mongoose.connection.close();
});

const makeEmail = (label) => {
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${label}-${id}@example.com`;
};

const baseUser = {
  name: 'Alice Investor',
  email: makeEmail('alice'),
  password: 'Password123!',
  role: 'investor',
};

test('register creates a new user', async () => {
  const response = await request(app)
    .post('/api/auth/register')
    .send(baseUser);

  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);
  assert.equal(response.body.user.role, 'investor');
  assert.equal(response.body.user.email, baseUser.email);
  assert.equal(response.body.user.passwordHash, undefined);
  assert.equal(response.body.user.tokenVersion, undefined);
  const decodedToken = jwt.decode(response.body.token, { complete: true });
  assert.equal(decodedToken.header.alg, 'HS256');
  assert.ok(decodedToken.payload.exp > decodedToken.payload.iat);

  const storedUser = await User.findById(response.body.user.id);
  assert.notEqual(storedUser.passwordHash, baseUser.password);
  assert.equal(await bcrypt.compare(baseUser.password, storedUser.passwordHash), true);
});

test('public registration cannot assign a privileged role', async () => {
  const response = await request(app)
    .post('/api/auth/register')
    .send({ ...baseUser, email: makeEmail('role-escalation'), role: 'admin' });

  assert.equal(response.status, 201);
  assert.equal(response.body.user.role, 'investor');
});

test('duplicate email is rejected', async () => {
  const duplicateUser = {
    ...baseUser,
    email: baseUser.email,
  };

  const response = await request(app)
    .post('/api/auth/register')
    .send(duplicateUser);

  assert.equal(response.status, 409);
  assert.equal(response.body.success, false);
  assert.match(response.body.message, /already exists|already registered/i);
});

test('authentication rejects malformed emails and oversized passwords', async () => {
  const invalidEmail = await request(app)
    .post('/api/auth/login')
    .send({ email: 'not-an-email', password: 'Password123!' });
  const oversizedPassword = await request(app)
    .post('/api/auth/login')
    .send({ email: baseUser.email, password: 'é'.repeat(37) });
  const oversizedName = await request(app)
    .post('/api/auth/register')
    .send({ ...baseUser, email: makeEmail('long-name'), name: 'N'.repeat(121) });

  assert.equal(invalidEmail.status, 400);
  assert.equal(oversizedPassword.status, 400);
  assert.equal(oversizedName.status, 400);
});

test('login succeeds with valid credentials', async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({
      email: baseUser.email,
      password: baseUser.password,
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.ok(response.body.token);
  assert.equal(response.body.user.role, 'investor');
  assert.equal(response.body.user.passwordHash, undefined);
});

test('login rejects wrong password', async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({
      email: baseUser.email,
      password: 'WrongPassword123!',
    });

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
  assert.match(response.body.message, /invalid|incorrect/i);
});

test('protected route requires token', async () => {
  const response = await request(app).get('/api/auth/me');

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
  assert.match(response.body.message, /token|authorized|login/i);
});

test('protected route rejects malformed token', async () => {
  const response = await request(app)
    .get('/api/auth/me')
    .set('Authorization', 'Bearer not-a-valid-jwt');

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
});

test('protected route rejects expired token', async () => {
  const user = await User.findOne({ email: baseUser.email });
  const expiredToken = jwt.sign({ id: user._id }, getJwtSecret(), { expiresIn: -1 });
  const response = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${expiredToken}`);

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
});

test('inactive users cannot log in or use an existing token', async () => {
  const user = await User.findOne({ email: baseUser.email });
  const existingToken = jwt.sign({ id: user._id }, getJwtSecret(), { expiresIn: '1h' });
  await User.updateOne(
    { _id: user._id },
    { $set: { isActive: false }, $inc: { tokenVersion: 1 } }
  );

  try {
    const [loginResponse, currentUserResponse] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: baseUser.email, password: baseUser.password }),
      request(app).get('/api/auth/me').set('Authorization', `Bearer ${existingToken}`),
    ]);

    assert.equal(loginResponse.status, 401);
    assert.equal(currentUserResponse.status, 401);
  } finally {
    await User.updateOne({ _id: user._id }, { $set: { isActive: true } });
  }

  const restoredSessionResponse = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${existingToken}`);
  assert.equal(restoredSessionResponse.status, 401);
});

test('logout invalidates issued tokens and a new login creates a usable session', async () => {
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: baseUser.email, password: baseUser.password });
  const token = login.body.token;
  const logout = await request(app)
    .post('/api/auth/logout')
    .set('Authorization', `Bearer ${token}`);
  const revokedSession = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${token}`);
  const nextLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: baseUser.email, password: baseUser.password });
  const activeSession = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${nextLogin.body.token}`);

  assert.equal(logout.status, 200);
  assert.equal(revokedSession.status, 401);
  assert.equal(nextLogin.status, 200);
  assert.equal(activeSession.status, 200);
  assert.equal(activeSession.body.user.passwordHash, undefined);
});

test('JWT signing requires a configured secret and has no fallback', () => {
  const configuredSecret = process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;

  try {
    assert.throws(() => getJwtSecret(), { statusCode: 500 });
  } finally {
    if (configuredSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = configuredSecret;
  }
});

test('production JWT secrets must contain at least 32 UTF-8 bytes', () => {
  const configuredSecret = process.env.JWT_SECRET;
  const configuredEnvironment = process.env.NODE_ENV;
  process.env.JWT_SECRET = 'short-secret';
  process.env.NODE_ENV = 'production';

  try {
    assert.throws(() => getJwtSecret(), { statusCode: 500 });
  } finally {
    if (configuredSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = configuredSecret;
    if (configuredEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = configuredEnvironment;
  }
});

const roles = ['investor', 'advisor', 'admin'];

for (const role of roles) {
  test(`role middleware allows ${role} when authorized`, () => {
    let nextCalled = false;
    authorize(role)({ user: { role } }, {}, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
  });

  test(`role middleware rejects ${role} when not authorized`, () => {
    let actualError;
    const otherRole = roles.find((candidate) => candidate !== role);
    authorize(role)({ user: { role: otherRole } }, {}, (error) => { actualError = error; });
    assert.equal(actualError.statusCode, 403);
  });
}
