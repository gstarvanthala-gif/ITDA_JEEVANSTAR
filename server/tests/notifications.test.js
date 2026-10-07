import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';

import app from '../app.js';
import connectDB from '../config/db.js';
import Allocation from '../models/Allocation.js';
import BankAccount from '../models/BankAccount.js';
import Goal from '../models/Goal.js';
import Notification from '../models/Notification.js';
import RiskProfile from '../models/RiskProfile.js';
import RoundUp from '../models/RoundUp.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import { createNotification } from '../services/notificationService.js';

const testUserIds = [];

before(async () => {
  await connectDB();
});

after(async () => {
  if (testUserIds.length > 0) {
    await Notification.deleteMany({ userId: { $in: testUserIds } });
    await Goal.deleteMany({ userId: { $in: testUserIds } });
    await RoundUp.deleteMany({ userId: { $in: testUserIds } });
    await Allocation.deleteMany({ userId: { $in: testUserIds } });
    await RiskProfile.deleteMany({ userId: { $in: testUserIds } });
    await Transaction.deleteMany({ userId: { $in: testUserIds } });
    await BankAccount.deleteMany({ userId: { $in: testUserIds } });
    await User.deleteMany({ _id: { $in: testUserIds } });
  }
  await mongoose.connection.close();
});

const createInvestor = async () => {
  const email = `${new mongoose.Types.ObjectId()}@phase10.microgrow.test`;
  const response = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Phase 10 Investor', email, password: 'Password123!' });
  assert.equal(response.status, 201);
  const investor = { id: response.body.user.id, token: response.body.token };
  testUserIds.push(investor.id);
  return investor;
};

const auth = (token) => ({ Authorization: `Bearer ${token}` });

const riskAnswers = {
  investmentHorizon: 'threeToFiveYears',
  marketDrop: 'wait',
  priority: 'balanced',
  experience: 'some',
  volatilityComfort: 'neutral',
};

test('notification endpoints require authentication', async () => {
  const response = await request(app).get('/api/notifications');
  assert.equal(response.status, 401);
});

test('notification event keys deduplicate per user and unread count is returned', async () => {
  const investor = await createInvestor();
  const first = await createNotification({
    userId: investor.id,
    title: 'Round-up invested',
    message: 'A demo round-up was invested.',
    type: 'roundup_invested',
    eventKey: 'roundup:phase10:one',
  });
  const duplicate = await createNotification({
    userId: investor.id,
    title: 'Another title',
    message: 'Duplicate event should not create another notification.',
    type: 'roundup_invested',
    eventKey: 'roundup:phase10:one',
  });
  assert.equal(first.created, true);
  assert.equal(duplicate.created, false);
  assert.equal(String(first.notification._id), String(duplicate.notification._id));

  const response = await request(app).get('/api/notifications').set(auth(investor.token));
  assert.equal(response.status, 200);
  assert.equal(response.body.notifications.length, 1);
  assert.equal(response.body.unreadCount, 1);
});

test('investor can mark one or all notifications read and delete their notification', async () => {
  const investor = await createInvestor();
  const first = await createNotification({
    userId: investor.id,
    title: 'First',
    message: 'First test notification.',
    type: 'portfolio_updated',
    eventKey: 'portfolio:phase10:first',
  });
  await createNotification({
    userId: investor.id,
    title: 'Second',
    message: 'Second test notification.',
    type: 'advisor_message',
    eventKey: 'message:phase10:second',
  });

  const marked = await request(app)
    .put(`/api/notifications/${first.notification._id}/read`)
    .set(auth(investor.token));
  assert.equal(marked.status, 200);
  assert.equal(marked.body.notification.isRead, true);
  assert.equal(marked.body.unreadCount, 1);

  const markedAll = await request(app)
    .put('/api/notifications/read-all')
    .set(auth(investor.token));
  assert.equal(markedAll.status, 200);
  assert.equal(markedAll.body.unreadCount, 0);
  assert.equal(markedAll.body.modifiedCount, 1);

  const deleted = await request(app)
    .delete(`/api/notifications/${first.notification._id}`)
    .set(auth(investor.token));
  assert.equal(deleted.status, 200);
  assert.equal(deleted.body.unreadCount, 0);
});

test('a user cannot read or delete another user notification', async () => {
  const owner = await createInvestor();
  const otherInvestor = await createInvestor();
  const notification = await createNotification({
    userId: owner.id,
    title: 'Private',
    message: 'This belongs to another investor.',
    type: 'goal_completed',
    eventKey: 'goal:phase10:private',
  });

  const read = await request(app)
    .put(`/api/notifications/${notification.notification._id}/read`)
    .set(auth(otherInvestor.token));
  assert.equal(read.status, 404);

  const deletion = await request(app)
    .delete(`/api/notifications/${notification.notification._id}`)
    .set(auth(otherInvestor.token));
  assert.equal(deletion.status, 404);

  const ownerList = await request(app).get('/api/notifications').set(auth(owner.token));
  assert.equal(ownerList.body.unreadCount, 1);
});

test('round-up investment creates one notification shared by invest and allocation events', async () => {
  const investor = await createInvestor();
  await request(app).post('/api/risk/submit').set(auth(investor.token)).send({ answers: riskAnswers }).expect(201);
  await request(app).post('/api/bank/connect').set(auth(investor.token)).expect(201);
  await request(app).post('/api/transactions/sync').set(auth(investor.token)).expect(200);
  const roundUps = await request(app).post('/api/roundups/calculate').set(auth(investor.token));
  const coffee = roundUps.body.roundUps.find(({ transactionId }) => transactionId.merchant === 'Coffee Shop');

  await request(app)
    .post('/api/roundups/invest')
    .set(auth(investor.token))
    .send({ roundUpId: coffee._id })
    .expect(200);

  await request(app).post('/api/allocation/calculate').set(auth(investor.token)).expect(200);
  await request(app)
    .post('/api/allocation/execute')
    .set(auth(investor.token))
    .send({ roundUpId: coffee._id })
    .expect(200);

  const notifications = await request(app).get('/api/notifications').set(auth(investor.token));
  assert.equal(notifications.body.notifications.length, 1);
  assert.equal(notifications.body.notifications[0].type, 'roundup_invested');
});

test('reaching a goal creates one notification per completion transition', async () => {
  const investor = await createInvestor();
  const goal = await request(app)
    .post('/api/goals')
    .set(auth(investor.token))
    .send({ name: 'Laptop', targetAmount: 500, currentAmount: 0, targetDate: '2030-01-01' });
  assert.equal(goal.status, 201);

  await request(app)
    .put(`/api/goals/${goal.body.goal.id}`)
    .set(auth(investor.token))
    .send({ currentAmount: 500 })
    .expect(200);

  const duplicateUpdate = await request(app)
    .put(`/api/goals/${goal.body.goal.id}`)
    .set(auth(investor.token))
    .send({ name: 'Laptop goal' });
  assert.equal(duplicateUpdate.status, 200);

  const notifications = await request(app).get('/api/notifications').set(auth(investor.token));
  assert.equal(notifications.body.notifications.length, 1);
  assert.equal(notifications.body.notifications[0].type, 'goal_completed');
  assert.equal(notifications.body.unreadCount, 1);
});