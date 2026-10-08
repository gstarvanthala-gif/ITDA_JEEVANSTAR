import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import request from 'supertest';

import app from '../app.js';
import { createCorsOptions } from '../config/cors.js';
import connectDB from '../config/db.js';
import { getJwtSecret } from '../config/jwt.js';
import errorHandler from '../middleware/errorHandler.js';
import User from '../models/User.js';

const testUserIds = [];

before(async () => {
  await connectDB();
});

after(async () => {
  if (testUserIds.length > 0) await User.deleteMany({ _id: { $in: testUserIds } });
  await mongoose.connection.close();
});

const checkOrigin = (options, origin) => new Promise((resolve) => {
  options.origin(origin, (error, allowed) => resolve({ error, allowed }));
});

test('CORS requires exact configured origins and rejects wildcard production policy', async () => {
  const productionOptions = createCorsOptions({
    NODE_ENV: 'production',
    CORS_ALLOWED_ORIGINS: 'https://microgrow.example, https://admin.microgrow.example',
  });
  const allowedOrigin = await checkOrigin(productionOptions, 'https://microgrow.example');
  const deniedOrigin = await checkOrigin(productionOptions, 'https://untrusted.example');
  const noProductionOrigins = await checkOrigin(
    createCorsOptions({ NODE_ENV: 'production' }),
    'https://microgrow.example'
  );
  const actualDeniedOrigin = await request(app)
    .get('/')
    .set('Origin', 'https://security-test.invalid');

  assert.deepEqual(allowedOrigin, { error: null, allowed: true });
  assert.equal(deniedOrigin.error.statusCode, 403);
  assert.equal(noProductionOrigins.error.statusCode, 403);
  assert.throws(() => createCorsOptions({ NODE_ENV: 'production', CORS_ALLOWED_ORIGINS: '*' }));
  assert.equal(actualDeniedOrigin.status, 403);
  assert.equal(actualDeniedOrigin.headers['access-control-allow-origin'], undefined);
});

test('Helmet security headers are present and production errors hide internals', async () => {
  const response = await request(app).get('/');
  assert.equal(response.status, 200);
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  assert.ok(response.headers['x-frame-options']);
  assert.ok(response.headers['referrer-policy']);

  const originalEnvironment = process.env.NODE_ENV;
  const mockResponse = {
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  process.env.NODE_ENV = 'production';
  try {
    errorHandler(new Error('mongodb://private-host/internal-stack'), {}, mockResponse, () => {});
  } finally {
    if (originalEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalEnvironment;
  }

  assert.equal(mockResponse.statusCode, 500);
  assert.deepEqual(mockResponse.body, { success: false, message: 'Internal Server Error' });
});

test('signed frontend role claims and malformed token IDs cannot authorize access', async () => {
  const email = `${new mongoose.Types.ObjectId()}@security.microgrow.test`;
  const registration = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Security Investor', email, password: 'Password123!' });
  assert.equal(registration.status, 201);
  testUserIds.push(registration.body.user.id);

  const forgedRoleToken = jwt.sign({
    id: registration.body.user.id,
    role: 'admin',
    tokenVersion: 0,
  }, getJwtSecret(), { expiresIn: '1h', algorithm: 'HS256' });
  const forgedRoleResponse = await request(app)
    .get('/api/admin/overview')
    .set('Authorization', `Bearer ${forgedRoleToken}`);
  const malformedSubjectToken = jwt.sign({ id: 'not-a-user-id', role: 'admin' }, getJwtSecret(), { expiresIn: '1h' });
  const malformedSubjectResponse = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${malformedSubjectToken}`);

  assert.equal(forgedRoleResponse.status, 403);
  assert.equal(malformedSubjectResponse.status, 401);
});

test('login attempts are rate limited with a JSON 429 response', async () => {
  const responses = [];
  for (let attempt = 0; attempt < 11; attempt += 1) {
    responses.push(await request(app)
      .post('/api/auth/login')
      .send({ email: 'rate-limit@example.test', password: 'WrongPassword123!' }));
  }

  assert.ok(responses.slice(0, 10).every((response) => response.status === 401));
  assert.equal(responses[10].status, 429);
  assert.equal(responses[10].body.success, false);
  assert.match(responses[10].body.message, /too many login attempts/i);
});