import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';

import app from '../app.js';
import connectDB from '../config/db.js';
import User from '../models/User.js';

const testUserIds = [];

before(async () => {
  await connectDB();
});

after(async () => {
  if (testUserIds.length > 0) {
    await User.deleteMany({ _id: { $in: testUserIds } });
  }
  await mongoose.connection.close();
});

const createUser = async (role) => {
  const email = `${new mongoose.Types.ObjectId()}@admin.microgrow.test`;
  const response = await request(app)
    .post('/api/auth/register')
    .send({ name: `Admin test ${role}`, email, password: 'Password123!' });
  assert.equal(response.status, 201);

  const userId = response.body.user.id;
  testUserIds.push(userId);
  await User.updateOne({ _id: userId }, { $set: { role } });
  return { id: userId, token: response.body.token };
};

const auth = (token) => ({ Authorization: `Bearer ${token}` });

test('admin reporting routes deny non-admins and unauthenticated requests', async () => {
  const investor = await createUser('investor');
  const advisor = await createUser('advisor');

  const anonymousResponse = await request(app).get('/api/admin/overview');
  const investorResponse = await request(app).get('/api/admin/overview').set(auth(investor.token));
  const advisorResponse = await request(app).get('/api/admin/users').set(auth(advisor.token));

  assert.equal(anonymousResponse.status, 401);
  assert.equal(investorResponse.status, 403);
  assert.equal(advisorResponse.status, 403);
});

test('admin overview and paginated user list return protected data safely', async () => {
  const admin = await createUser('admin');

  const overviewResponse = await request(app).get('/api/admin/overview').set(auth(admin.token));
  const usersResponse = await request(app)
    .get('/api/admin/users?page=1&limit=500')
    .set(auth(admin.token));

  assert.equal(overviewResponse.status, 200);
  assert.equal(typeof overviewResponse.body.summary.totalInvestors, 'number');
  assert.equal(typeof overviewResponse.body.summary.virtualPortfolioValue, 'number');
  assert.equal(usersResponse.status, 200);
  assert.equal(usersResponse.body.pagination.limit, 50);
  assert.ok(usersResponse.body.items.some((user) => user._id === admin.id));
  assert.ok(usersResponse.body.items.every((user) => !Object.hasOwn(user, 'passwordHash')));
});
