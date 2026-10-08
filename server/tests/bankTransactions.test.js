import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';

import app from '../app.js';
import connectDB from '../config/db.js';
import BankAccount from '../models/BankAccount.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';

const testUserIds = [];
const testBankAccountIds = [];

before(async () => {
  await connectDB();
});

after(async () => {
  if (testUserIds.length > 0) {
    await Transaction.deleteMany({ userId: { $in: testUserIds } });
    await BankAccount.deleteMany({ userId: { $in: testUserIds } });
    await User.deleteMany({ _id: { $in: testUserIds } });
  }

  if (testBankAccountIds.length > 0) {
    await BankAccount.deleteMany({ _id: { $in: testBankAccountIds } });
  }

  await mongoose.connection.close();
});

const createUser = async (role = 'investor') => {
  const email = `${new mongoose.Types.ObjectId()}@phase4.microgrow.test`;
  const response = await request(app)
    .post('/api/auth/register')
    .send({ name: `Phase 4 ${role}`, email, password: 'Password123!', role });

  assert.equal(response.status, 201);
  const userId = response.body.user.id;
  testUserIds.push(userId);

  if (role !== 'investor') {
    await User.updateOne({ _id: userId }, { $set: { role } });
  }

  return { token: response.body.token, userId };
};

const authorized = (token) => ({ Authorization: `Bearer ${token}` });

test('bank and transaction endpoints require an investor token', async () => {
  const response = await request(app).get('/api/transactions');
  assert.equal(response.status, 401);
});

test('only investors can access demo bank and transaction endpoints', async () => {
  const advisor = await createUser('advisor');
  const response = await request(app)
    .get('/api/bank')
    .set(authorized(advisor.token));

  assert.equal(response.status, 403);
});

test('investor can connect once, sync five demo transactions idempotently, and list them', async () => {
  const investor = await createUser();

  const connectResponse = await request(app)
    .post('/api/bank/connect')
    .set(authorized(investor.token));

  assert.equal(connectResponse.status, 201);
  assert.equal(connectResponse.body.bankAccount.bankName, 'MicroGrow Demo Bank');
  assert.match(connectResponse.body.bankAccount.maskedAccountNumber, /^DEMO-\*{4}-\d{4}$/);
  testBankAccountIds.push(connectResponse.body.bankAccount._id);

  const reconnectResponse = await request(app)
    .post('/api/bank/connect')
    .set(authorized(investor.token));
  assert.equal(reconnectResponse.status, 200);
  assert.equal(reconnectResponse.body.bankAccount._id, connectResponse.body.bankAccount._id);

  const firstSync = await request(app)
    .post('/api/transactions/sync')
    .set(authorized(investor.token));

  assert.equal(firstSync.status, 200);
  assert.equal(firstSync.body.addedCount, 5);
  assert.deepEqual(
    firstSync.body.transactions.map(({ merchant, amount }) => [merchant, amount]).sort(),
    [
      ['Bus', 18],
      ['Coffee Shop', 47],
      ['Fuel', 241],
      ['Grocery', 126],
      ['Restaurant', 83],
    ].sort()
  );

  const secondSync = await request(app)
    .post('/api/transactions/sync')
    .set(authorized(investor.token));
  assert.equal(secondSync.status, 200);
  assert.equal(secondSync.body.addedCount, 0);
  assert.equal(secondSync.body.transactions.length, 5);

  const listResponse = await request(app)
    .get('/api/transactions')
    .set(authorized(investor.token));
  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.body.transactions.length, 5);
});

test('investors cannot read or disconnect another investor bank data', async () => {
  const owner = await createUser();
  const otherInvestor = await createUser();
  const connectResponse = await request(app)
    .post('/api/bank/connect')
    .set(authorized(owner.token));
  const bankId = connectResponse.body.bankAccount._id;
  testBankAccountIds.push(bankId);

  const disconnectResponse = await request(app)
    .delete(`/api/bank/${bankId}`)
    .set(authorized(otherInvestor.token));

  assert.equal(disconnectResponse.status, 404);

  const otherTransactions = await request(app)
    .get('/api/transactions')
    .set(authorized(otherInvestor.token));
  assert.equal(otherTransactions.status, 200);
  assert.deepEqual(otherTransactions.body.transactions, []);
});

test('investor can read, disconnect, and reconnect their own demo bank', async () => {
  const investor = await createUser();
  const connectResponse = await request(app)
    .post('/api/bank/connect')
    .set(authorized(investor.token));
  const bankId = connectResponse.body.bankAccount._id;
  testBankAccountIds.push(bankId);

  const getResponse = await request(app)
    .get('/api/bank')
    .set(authorized(investor.token));
  assert.equal(getResponse.status, 200);
  assert.equal(getResponse.body.bankAccount._id, bankId);

  const disconnectResponse = await request(app)
    .delete(`/api/bank/${bankId}`)
    .set(authorized(investor.token));
  assert.equal(disconnectResponse.status, 200);
  assert.equal(disconnectResponse.body.bankAccount.status, 'disconnected');

  const syncResponse = await request(app)
    .post('/api/transactions/sync')
    .set(authorized(investor.token));
  assert.equal(syncResponse.status, 409);

  const reconnectResponse = await request(app)
    .post('/api/bank/connect')
    .set(authorized(investor.token));
  assert.equal(reconnectResponse.status, 200);
  assert.equal(reconnectResponse.body.bankAccount._id, bankId);
  assert.equal(reconnectResponse.body.bankAccount.status, 'connected');
});

test('demo sync rejects request data and requires a connected demo bank', async () => {
  const investor = await createUser();

  const credentialsResponse = await request(app)
    .post('/api/bank/connect')
    .set(authorized(investor.token))
    .send({ password: 'not-collected' });
  assert.equal(credentialsResponse.status, 400);

  const nullTransactionPayload = await request(app)
    .post('/api/transactions/sync')
    .set(authorized(investor.token))
    .set('Content-Type', 'application/json')
    .send('null');
  assert.equal(nullTransactionPayload.status, 400);

  const syncResponse = await request(app)
    .post('/api/transactions/sync')
    .set(authorized(investor.token));
  assert.equal(syncResponse.status, 409);
});