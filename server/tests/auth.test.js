import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';

import app from '../app.js';
import connectDB from '../config/db.js';

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

const roles = ['investor', 'advisor', 'admin'];

for (const role of roles) {
  test(`role middleware allows ${role} access when authorized`, async () => {
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: `${role} user`,
        email: makeEmail(role),
        password: 'Password123!',
        role,
      });

    const token = registerResponse.body.token;
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.user.role, role);
  });
}
