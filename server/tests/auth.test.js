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
  await User.updateOne({ _id: user._id }, { $set: { isActive: false } });

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
