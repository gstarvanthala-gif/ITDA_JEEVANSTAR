import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';

import app from '../app.js';
import connectDB from '../config/db.js';
import Goal from '../models/Goal.js';
import User from '../models/User.js';

const testUserIds = [];

before(async () => {
  await connectDB();
});

after(async () => {
  if (testUserIds.length > 0) {
    await Goal.deleteMany({ userId: { $in: testUserIds } });
    await User.deleteMany({ _id: { $in: testUserIds } });
  }
  await mongoose.connection.close();
});

const createInvestor = async () => {
  const email = `${new mongoose.Types.ObjectId()}@phase9.microgrow.test`;
  const response = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Phase 9 Investor', email, password: 'Password123!' });
  assert.equal(response.status, 201);

  const investor = { userId: response.body.user.id, token: response.body.token };
  testUserIds.push(investor.userId);
  return investor;
};

const auth = (token) => ({ Authorization: `Bearer ${token}` });

const validGoal = {
  name: 'Emergency fund',
  targetAmount: 1000,
  currentAmount: 250.5,
  targetDate: '2030-01-01',
};

test('goal endpoints require an authenticated investor', async () => {
  const response = await request(app).get('/api/goals');
  assert.equal(response.status, 401);
});

test('investor can create, list, and read only their goals', async () => {
  const investor = await createInvestor();
  const createResponse = await request(app)
    .post('/api/goals')
    .set(auth(investor.token))
    .send(validGoal);

  assert.equal(createResponse.status, 201);
  assert.equal(createResponse.body.goal.name, validGoal.name);
  assert.equal(createResponse.body.goal.targetAmount, '1000.00');
  assert.equal(createResponse.body.goal.currentAmount, '250.50');
  assert.equal(createResponse.body.goal.progress, 25.05);
  assert.equal(createResponse.body.goal.status, 'active');

  const goalId = createResponse.body.goal.id;
  const listResponse = await request(app).get('/api/goals').set(auth(investor.token));
  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.body.goals.length, 1);

  const getResponse = await request(app)
    .get(`/api/goals/${goalId}`)
    .set(auth(investor.token));
  assert.equal(getResponse.status, 200);
  assert.equal(getResponse.body.goal.id, goalId);
});

test('goal update derives completed state and supports archiving', async () => {
  const investor = await createInvestor();
  const created = await request(app)
    .post('/api/goals')
    .set(auth(investor.token))
    .send(validGoal);
  const goalId = created.body.goal.id;

  const completed = await request(app)
    .put(`/api/goals/${goalId}`)
    .set(auth(investor.token))
    .send({ currentAmount: 1000 });
  assert.equal(completed.status, 200);
  assert.equal(completed.body.goal.status, 'completed');
  assert.equal(completed.body.goal.progress, 100);

  const reopened = await request(app)
    .put(`/api/goals/${goalId}`)
    .set(auth(investor.token))
    .send({ targetAmount: 1200 });
  assert.equal(reopened.status, 200);
  assert.equal(reopened.body.goal.status, 'active');
  assert.equal(reopened.body.goal.progress, 83.33);

  const archived = await request(app)
    .put(`/api/goals/${goalId}`)
    .set(auth(investor.token))
    .send({ status: 'archived' });
  assert.equal(archived.status, 200);
  assert.equal(archived.body.goal.status, 'archived');
});

test('goal validation rejects invalid amounts, dates, status, and overfunding', async () => {
  const investor = await createInvestor();

  const invalidGoals = [
    { ...validGoal, targetAmount: 0 },
    { ...validGoal, currentAmount: -1 },
    { ...validGoal, targetAmount: 100, currentAmount: 101 },
    { ...validGoal, targetAmount: '1.005' },
    { ...validGoal, targetDate: 'not-a-date' },
    { ...validGoal, targetDate: '2030-02-30' },
  ];

  for (const payload of invalidGoals) {
    const response = await request(app)
      .post('/api/goals')
      .set(auth(investor.token))
      .send(payload);
    assert.equal(response.status, 400);
  }

  const invalidCompletion = await request(app)
    .post('/api/goals')
    .set(auth(investor.token))
    .send({ ...validGoal, status: 'completed' });
  assert.equal(invalidCompletion.status, 201);
  assert.equal(invalidCompletion.body.goal.status, 'active');

  const unknownField = await request(app)
    .post('/api/goals')
    .set(auth(investor.token))
    .send({ ...validGoal, userId: new mongoose.Types.ObjectId() });
  assert.equal(unknownField.status, 400);
});

test('investors cannot read, update, or delete another investor goal', async () => {
  const owner = await createInvestor();
  const otherInvestor = await createInvestor();
  const created = await request(app)
    .post('/api/goals')
    .set(auth(owner.token))
    .send(validGoal);
  const goalId = created.body.goal.id;

  const otherList = await request(app).get('/api/goals').set(auth(otherInvestor.token));
  assert.deepEqual(otherList.body.goals, []);

  const otherGet = await request(app)
    .get(`/api/goals/${goalId}`)
    .set(auth(otherInvestor.token));
  assert.equal(otherGet.status, 404);

  const otherUpdate = await request(app)
    .put(`/api/goals/${goalId}`)
    .set(auth(otherInvestor.token))
    .send({ name: 'Changed goal' });
  assert.equal(otherUpdate.status, 404);

  const otherDelete = await request(app)
    .delete(`/api/goals/${goalId}`)
    .set(auth(otherInvestor.token));
  assert.equal(otherDelete.status, 404);
});

test('investor can delete a goal and invalid ids are rejected', async () => {
  const investor = await createInvestor();
  const created = await request(app)
    .post('/api/goals')
    .set(auth(investor.token))
    .send(validGoal);
  const goalId = created.body.goal.id;

  const invalidId = await request(app)
    .get('/api/goals/not-an-id')
    .set(auth(investor.token));
  assert.equal(invalidId.status, 400);

  const deleted = await request(app)
    .delete(`/api/goals/${goalId}`)
    .set(auth(investor.token));
  assert.equal(deleted.status, 200);

  const missing = await request(app)
    .get(`/api/goals/${goalId}`)
    .set(auth(investor.token));
  assert.equal(missing.status, 404);
});