import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';

import app from '../app.js';
import connectDB from '../config/db.js';
import Allocation from '../models/Allocation.js';
import BankAccount from '../models/BankAccount.js';
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
    await RoundUp.deleteMany({ userId: { $in: testUserIds } });
    await Allocation.deleteMany({ userId: { $in: testUserIds } });
    await RiskProfile.deleteMany({ userId: { $in: testUserIds } });
    await Transaction.deleteMany({ userId: { $in: testUserIds } });
    await BankAccount.deleteMany({ userId: { $in: testUserIds } });
    await User.deleteMany({ _id: { $in: testUserIds } });
  }

  await mongoose.connection.close();
});

const answersForLevel = (level) => ({
  investmentHorizon: ['underOneYear', 'oneToThreeYears', 'threeToFiveYears', 'fiveToTenYears', 'overTenYears'][level],
  marketDrop: ['sellAll', 'sellSome', 'wait', 'stayInvested', 'addMore'][level],
  priority: ['preserve', 'steady', 'balanced', 'growth', 'maximumGrowth'][level],
  experience: ['none', 'basic', 'some', 'good', 'advanced'][level],
  volatilityComfort: ['veryUncomfortable', 'uncomfortable', 'neutral', 'comfortable', 'veryComfortable'][level],
});

const createInvestor = async (riskLevel = null) => {
  const email = `${new mongoose.Types.ObjectId()}@phase7.microgrow.test`;
  const registerResponse = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Phase 7 Investor', email, password: 'Password123!' });

  assert.equal(registerResponse.status, 201);
  const investor = {
    token: registerResponse.body.token,
    userId: registerResponse.body.user.id,
  };
  testUserIds.push(investor.userId);

  if (riskLevel !== null) {
    const level = { conservative: 0, moderate: 2, aggressive: 4 }[riskLevel];
    const riskResponse = await request(app)
      .post('/api/risk/submit')
      .set({ Authorization: `Bearer ${investor.token}` })
      .send({ answers: answersForLevel(level) });
    assert.equal(riskResponse.status, 201);
    assert.equal(riskResponse.body.riskProfile.profile, riskLevel);
  }

  return investor;
};

const auth = (token) => ({ Authorization: `Bearer ${token}` });

test('allocation endpoints require an authenticated investor', async () => {
  const response = await request(app).get('/api/allocation');
  assert.equal(response.status, 401);
});

test('allocation is derived from each saved risk profile and totals exactly 100', async () => {
  const rules = {
    conservative: [15, 25, 60],
    moderate: [50, 20, 30],
    aggressive: [80, 10, 10],
  };

  for (const [riskLevel, expected] of Object.entries(rules)) {
    const investor = await createInvestor(riskLevel);
    const response = await request(app)
      .post('/api/allocation/calculate')
      .set(auth(investor.token));

    assert.equal(response.status, 200);
    const { equityPercent, goldPercent, debtPercent } = response.body.allocation;
    assert.deepEqual([equityPercent, goldPercent, debtPercent], expected);
    assert.equal(equityPercent + goldPercent + debtPercent, 100);

    const getResponse = await request(app)
      .get('/api/allocation')
      .set(auth(investor.token));
    assert.equal(getResponse.body.allocation.riskLevel, riskLevel);
  }
});

test('allocation cannot be calculated without a stored risk profile or overridden by the client', async () => {
  const investor = await createInvestor();

  const missingRisk = await request(app)
    .post('/api/allocation/calculate')
    .set(auth(investor.token));
  assert.equal(missingRisk.status, 409);

  const suppliedPercentages = await request(app)
    .put('/api/allocation')
    .set(auth(investor.token))
    .send({ equityPercent: 100, goldPercent: 0, debtPercent: 0 });
  assert.equal(suppliedPercentages.status, 400);
});

test('execution requires recalculating allocation after the risk profile changes', async () => {
  const investor = await createInvestor('moderate');
  await request(app).post('/api/bank/connect').set(auth(investor.token)).expect(201);
  await request(app).post('/api/transactions/sync').set(auth(investor.token)).expect(200);
  const roundUps = await request(app)
    .post('/api/roundups/calculate')
    .set(auth(investor.token));
  await request(app).post('/api/allocation/calculate').set(auth(investor.token)).expect(200);

  await request(app)
    .post('/api/risk/submit')
    .set(auth(investor.token))
    .send({ answers: answersForLevel(4) })
    .expect(201);

  const staleExecution = await request(app)
    .post('/api/allocation/execute')
    .set(auth(investor.token))
    .send({ roundUpId: roundUps.body.roundUps[0]._id });
  assert.equal(staleExecution.status, 409);

  const refreshed = await request(app)
    .post('/api/allocation/calculate')
    .set(auth(investor.token));
  assert.equal(refreshed.body.allocation.riskLevel, 'aggressive');

  const execution = await request(app)
    .post('/api/allocation/execute')
    .set(auth(investor.token))
    .send({ roundUpId: roundUps.body.roundUps[0]._id });
  assert.equal(execution.status, 200);
  assert.equal(execution.body.roundUp.allocationExecution.riskLevel, 'aggressive');
});

test('round-up execution uses saved risk allocation and atomically prevents concurrent duplicates', async () => {
  const investor = await createInvestor('moderate');
  await request(app).post('/api/bank/connect').set(auth(investor.token)).expect(201);
  await request(app).post('/api/transactions/sync').set(auth(investor.token)).expect(200);

  const roundUpResponse = await request(app)
    .post('/api/roundups/calculate')
    .set(auth(investor.token));
  const coffeeRoundUp = roundUpResponse.body.roundUps.find(
    ({ transactionId }) => transactionId.merchant === 'Coffee Shop'
  );
  await request(app).post('/api/allocation/calculate').set(auth(investor.token)).expect(200);

  const executionRequests = [0, 1].map(() =>
    request(app)
      .post('/api/allocation/execute')
      .set(auth(investor.token))
      .send({ roundUpId: coffeeRoundUp._id })
  );
  const executions = await Promise.all(executionRequests);
  assert.deepEqual(executions.map(({ status }) => status).sort(), [200, 409]);

  const success = executions.find(({ status }) => status === 200);
  const execution = success.body.roundUp.allocationExecution;
  assert.equal(success.body.roundUp.status, 'invested');
  assert.equal(execution.riskLevel, 'moderate');
  assert.equal(execution.equityPercent, 50);
  assert.equal(execution.goldPercent, 20);
  assert.equal(execution.debtPercent, 30);
  assert.equal(execution.equityAmount, '1.50');
  assert.equal(execution.goldAmount, '0.60');
  assert.equal(execution.debtAmount, '0.90');

  const history = await request(app)
    .get('/api/allocation/history')
    .set(auth(investor.token));
  assert.equal(history.status, 200);
  assert.equal(history.body.history.length, 1);
  assert.equal(history.body.history[0].allocationExecution.executedAt !== null, true);

  await request(app).post('/api/allocation/reset').set(auth(investor.token)).expect(200);
  const allocationAfterReset = await request(app)
    .get('/api/allocation')
    .set(auth(investor.token));
  assert.equal(allocationAfterReset.body.allocation, null);

  const historyAfterReset = await request(app)
    .get('/api/allocation/history')
    .set(auth(investor.token));
  assert.equal(historyAfterReset.body.history.length, 1);
});

test('investors cannot execute or view another investor allocation history', async () => {
  const owner = await createInvestor('conservative');
  const otherInvestor = await createInvestor('aggressive');
  await request(app).post('/api/bank/connect').set(auth(owner.token)).expect(201);
  await request(app).post('/api/transactions/sync').set(auth(owner.token)).expect(200);
  const roundUps = await request(app)
    .post('/api/roundups/calculate')
    .set(auth(owner.token));
  const roundUpId = roundUps.body.roundUps[0]._id;
  await request(app).post('/api/allocation/calculate').set(auth(owner.token)).expect(200);
  await request(app).post('/api/allocation/calculate').set(auth(otherInvestor.token)).expect(200);

  const attempt = await request(app)
    .post('/api/allocation/execute')
    .set(auth(otherInvestor.token))
    .send({ roundUpId });
  assert.equal(attempt.status, 404);

  const history = await request(app)
    .get('/api/allocation/history')
    .set(auth(otherInvestor.token));
  assert.deepEqual(history.body.history, []);
});