import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';

import app from '../app.js';
import connectDB from '../config/db.js';
import BankAccount from '../models/BankAccount.js';
import RoundUp from '../models/RoundUp.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import { calculateRoundUp } from '../services/roundUpService.js';

const testUserIds = [];

before(async () => {
  await connectDB();
});

after(async () => {
  if (testUserIds.length > 0) {
    const userTransactions = await Transaction.find({ userId: { $in: testUserIds } }).select('_id');
    const transactionIds = userTransactions.map(({ _id }) => _id);

    await RoundUp.deleteMany({ userId: { $in: testUserIds } });
    await Transaction.deleteMany({ userId: { $in: testUserIds } });
    await BankAccount.deleteMany({ userId: { $in: testUserIds } });
    await User.deleteMany({ _id: { $in: testUserIds } });

    if (transactionIds.length > 0) {
      await RoundUp.deleteMany({ transactionId: { $in: transactionIds } });
    }
  }

  await mongoose.connection.close();
});

const createInvestor = async () => {
  const email = `${new mongoose.Types.ObjectId()}@phase5.microgrow.test`;
  const response = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Phase 5 Investor', email, password: 'Password123!' });

  assert.equal(response.status, 201);
  const userId = response.body.user.id;
  testUserIds.push(userId);
  return { token: response.body.token, userId };
};

const authorized = (token) => ({ Authorization: `Bearer ${token}` });

test('round-up calculation uses whole-rupee integer-safe math', () => {
  assert.deepEqual(calculateRoundUp(47), {
    originalAmount: '47.00',
    roundedAmount: '50.00',
    roundUpAmount: '3.00',
    hasRoundUp: true,
  });
  assert.deepEqual(calculateRoundUp(83), {
    originalAmount: '83.00',
    roundedAmount: '90.00',
    roundUpAmount: '7.00',
    hasRoundUp: true,
  });
  assert.deepEqual(calculateRoundUp(120), {
    originalAmount: '120.00',
    roundedAmount: '120.00',
    roundUpAmount: '0.00',
    hasRoundUp: false,
  });
  assert.deepEqual(calculateRoundUp(0), {
    originalAmount: '0.00',
    roundedAmount: '0.00',
    roundUpAmount: '0.00',
    hasRoundUp: false,
  });
  assert.equal(calculateRoundUp('47.35').roundUpAmount, '2.65');
  assert.throws(() => calculateRoundUp('47.355'), { statusCode: 400 });
});

test('round-up endpoints require an authenticated investor', async () => {
  const response = await request(app).get('/api/roundups');
  assert.equal(response.status, 401);
});

test('round-ups are calculated from persisted transactions and calculate is idempotent', async () => {
  const investor = await createInvestor();
  const connectResponse = await request(app)
    .post('/api/bank/connect')
    .set(authorized(investor.token));
  assert.equal(connectResponse.status, 201);

  const syncResponse = await request(app)
    .post('/api/transactions/sync')
    .set(authorized(investor.token));
  assert.equal(syncResponse.status, 200);

  const calculation = await request(app)
    .post('/api/roundups/calculate')
    .set(authorized(investor.token));
  assert.equal(calculation.status, 200);
  assert.equal(calculation.body.count, 5);
  assert.equal(calculation.body.roundUps.length, 5);

  const coffeeRoundUp = calculation.body.roundUps.find(
    ({ transactionId }) => transactionId.merchant === 'Coffee Shop'
  );
  assert.equal(coffeeRoundUp.originalAmount, '47.00');
  assert.equal(coffeeRoundUp.roundedAmount, '50.00');
  assert.equal(coffeeRoundUp.roundUpAmount, '3.00');
  assert.equal(coffeeRoundUp.status, 'pending');

  const secondCalculation = await request(app)
    .post('/api/roundups/calculate')
    .set(authorized(investor.token));
  assert.equal(secondCalculation.status, 200);
  assert.equal(secondCalculation.body.count, 5);

  const summaryResponse = await request(app)
    .get('/api/roundups/summary')
    .set(authorized(investor.token));
  assert.equal(summaryResponse.status, 200);
  assert.equal(summaryResponse.body.summary.totalCount, 5);
  assert.equal(summaryResponse.body.summary.pendingCount, 5);
  assert.equal(summaryResponse.body.summary.pendingAmount, '25.00');

  const clientSuppliedAmount = await request(app)
    .post('/api/roundups/calculate')
    .set(authorized(investor.token))
    .send({ amount: 0 });
  assert.equal(clientSuppliedAmount.status, 400);
});

test('invest marks a pending round-up once and repeated investment is rejected', async () => {
  const investor = await createInvestor();
  await request(app).post('/api/bank/connect').set(authorized(investor.token)).expect(201);
  await request(app).post('/api/transactions/sync').set(authorized(investor.token)).expect(200);

  const calculation = await request(app)
    .post('/api/roundups/calculate')
    .set(authorized(investor.token));
  const coffeeRoundUp = calculation.body.roundUps.find(
    ({ transactionId }) => transactionId.merchant === 'Coffee Shop'
  );

  const firstInvestment = await request(app)
    .post('/api/roundups/invest')
    .set(authorized(investor.token))
    .send({ roundUpId: coffeeRoundUp._id });
  assert.equal(firstInvestment.status, 200);
  assert.equal(firstInvestment.body.roundUp.status, 'invested');
  assert.ok(firstInvestment.body.roundUp.investedAt);

  const repeatedInvestment = await request(app)
    .post('/api/roundups/invest')
    .set(authorized(investor.token))
    .send({ roundUpId: coffeeRoundUp._id });
  assert.equal(repeatedInvestment.status, 409);

  const historyResponse = await request(app)
    .get('/api/roundups/history')
    .set(authorized(investor.token));
  assert.equal(historyResponse.status, 200);
  assert.equal(historyResponse.body.roundUps.length, 1);
  assert.equal(historyResponse.body.roundUps[0].status, 'invested');
});

test('investors can only list or invest their own round-ups', async () => {
  const owner = await createInvestor();
  const otherInvestor = await createInvestor();
  await request(app).post('/api/bank/connect').set(authorized(owner.token)).expect(201);
  await request(app).post('/api/transactions/sync').set(authorized(owner.token)).expect(200);

  const calculation = await request(app)
    .post('/api/roundups/calculate')
    .set(authorized(owner.token));
  const roundUpId = calculation.body.roundUps[0]._id;

  const otherList = await request(app)
    .get('/api/roundups')
    .set(authorized(otherInvestor.token));
  assert.equal(otherList.status, 200);
  assert.deepEqual(otherList.body.roundUps, []);

  const otherInvest = await request(app)
    .post('/api/roundups/invest')
    .set(authorized(otherInvestor.token))
    .send({ roundUpId });
  assert.equal(otherInvest.status, 404);
});