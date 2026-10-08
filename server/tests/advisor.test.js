import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';

import app from '../app.js';
import connectDB from '../config/db.js';
import Allocation from '../models/Allocation.js';
import BankAccount from '../models/BankAccount.js';
import Goal from '../models/Goal.js';
import Portfolio from '../models/Portfolio.js';
import PortfolioHistory from '../models/PortfolioHistory.js';
import RiskProfile from '../models/RiskProfile.js';
import RoundUp from '../models/RoundUp.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';

const testUserIds = [];

before(async () => {
  await connectDB();
});

after(async () => {
  if (testUserIds.length > 0) {
    await PortfolioHistory.deleteMany({ userId: { $in: testUserIds } });
    await Portfolio.deleteMany({ userId: { $in: testUserIds } });
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

const createUser = async ({ role = 'investor', advisorId = null, name = role } = {}) => {
  const email = `${new mongoose.Types.ObjectId()}@phase11.microgrow.test`;
  const response = await request(app)
    .post('/api/auth/register')
    .send({ name, email, password: 'Password123!' });
  assert.equal(response.status, 201);

  const userId = response.body.user.id;
  testUserIds.push(userId);
  const updates = { role, advisorId };
  await User.updateOne({ _id: userId }, { $set: updates });

  return { id: userId, token: response.body.token };
};

const auth = (token) => ({ Authorization: `Bearer ${token}` });

const riskAnswers = {
  investmentHorizon: 'threeToFiveYears',
  marketDrop: 'wait',
  priority: 'balanced',
  experience: 'some',
  volatilityComfort: 'neutral',
};

const addInvestorData = async (investor) => {
  await User.updateOne({ _id: investor.id }, { $set: { kycStatus: 'verified' } });
  await request(app).post('/api/risk/submit').set(auth(investor.token)).send({ answers: riskAnswers }).expect(201);
  await request(app).post('/api/bank/connect').set(auth(investor.token)).expect(201);
  await request(app).post('/api/transactions/sync').set(auth(investor.token)).expect(200);
  const roundUps = await request(app).post('/api/roundups/calculate').set(auth(investor.token));
  const coffee = roundUps.body.roundUps.find(({ transactionId }) => transactionId.merchant === 'Coffee Shop');
  await request(app).post('/api/allocation/calculate').set(auth(investor.token)).expect(200);
  await request(app)
    .post('/api/allocation/execute')
    .set(auth(investor.token))
    .send({ roundUpId: coffee._id })
    .expect(200);
  await request(app)
    .post('/api/goals')
    .set(auth(investor.token))
    .send({ name: 'Education fund', targetAmount: 1000, currentAmount: 250, targetDate: '2030-01-01' })
    .expect(201);
};

test('advisor endpoints require advisor authorization', async () => {
  const investor = await createUser({ role: 'investor' });
  const response = await request(app).get('/api/advisor/clients').set(auth(investor.token));
  assert.equal(response.status, 403);

  const unauthorized = await request(app).get('/api/advisor/clients');
  assert.equal(unauthorized.status, 401);
});

test('advisor sees only assigned active investors with read-only profile, portfolio, history, and goals', async () => {
  const admin = await createUser({ role: 'admin', name: 'Assignment Admin' });
  const advisor = await createUser({ role: 'advisor', name: 'Assigned Advisor' });
  const otherAdvisor = await createUser({ role: 'advisor', name: 'Other Advisor' });
  const assigned = await createUser({ role: 'investor', name: 'Assigned Investor' });
  const otherAssigned = await createUser({ role: 'investor', name: 'Private Investor' });
  const unassigned = await createUser({ role: 'investor', name: 'Unassigned Investor' });

  await request(app)
    .put(`/api/admin/investors/${assigned.id}/advisor`)
    .set(auth(admin.token))
    .send({ advisorId: advisor.id })
    .expect(200);
  await request(app)
    .put(`/api/admin/investors/${otherAssigned.id}/advisor`)
    .set(auth(admin.token))
    .send({ advisorId: otherAdvisor.id })
    .expect(200);

  await addInvestorData(assigned);
  await addInvestorData(otherAssigned);

  const list = await request(app).get('/api/advisor/clients').set(auth(advisor.token));
  assert.equal(list.status, 200);
  assert.equal(list.body.count, 1);
  assert.equal(list.body.clients[0].id, assigned.id);
  assert.equal(list.body.clients[0].name, 'Assigned Investor');
  assert.equal(list.body.clients[0].kycStatus, 'verified');
  assert.equal(list.body.clients[0].riskProfile.profile, 'moderate');
  assert.equal(list.body.clients[0].portfolio.totalInvested, '3.00');
  assert.equal(list.body.clients[0].performance.simulationLabel, 'DEMO simulation values');
  assert.equal(list.body.clients[0].goals.length, 1);
  assert.equal(list.body.clients.some(({ id }) => id === otherAssigned.id || id === unassigned.id), false);

  const detail = await request(app)
    .get(`/api/advisor/clients/${assigned.id}`)
    .set(auth(advisor.token));
  assert.equal(detail.status, 200);
  assert.equal(detail.body.client.id, assigned.id);
  assert.equal(detail.body.client.performance.history.length > 0, true);
  assert.equal(Object.hasOwn(detail.body.client, 'passwordHash'), false);

  const wrongAdvisor = await request(app)
    .get(`/api/advisor/clients/${assigned.id}`)
    .set(auth(otherAdvisor.token));
  assert.equal(wrongAdvisor.status, 404);

  const unassignedDetail = await request(app)
    .get(`/api/advisor/clients/${unassigned.id}`)
    .set(auth(advisor.token));
  assert.equal(unassignedDetail.status, 404);

  const attemptedUpdate = await request(app)
    .put(`/api/advisor/clients/${assigned.id}`)
    .set(auth(advisor.token))
    .send({ name: 'Changed by advisor' });
  assert.equal(attemptedUpdate.status, 404);
});