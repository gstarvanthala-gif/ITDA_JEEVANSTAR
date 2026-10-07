import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';

import app from '../app.js';
import connectDB from '../config/db.js';
import MarketData from '../models/MarketData.js';
import User from '../models/User.js';

const testUserIds = [];

before(async () => {
  await connectDB();
});

after(async () => {
  if (testUserIds.length > 0) {
    await MarketData.deleteMany({ symbol: { $in: ['DEMO-EQ', 'DEMO-GOLD', 'DEMO-DEBT', 'TEST-AAA'] } });
    await User.deleteMany({ _id: { $in: testUserIds } });
  }
  await mongoose.connection.close();
});

const createUser = async ({ role = 'investor', name = 'Demo' } = {}) => {
  const email = `${new mongoose.Types.ObjectId()}@phase13.microgrow.test`;
  const response = await request(app)
    .post('/api/auth/register')
    .send({ name, email, password: 'Password123!' });
  assert.equal(response.status, 201);

  const userId = response.body.user.id;
  testUserIds.push(userId);
  await User.updateOne({ _id: userId }, { $set: { role } });

  return { id: userId, token: response.body.token };
};

const auth = (token) => ({ Authorization: `Bearer ${token}` });

test('investor can read market data and demo assets are seeded', async () => {
  const investor = await createUser({ role: 'investor', name: 'Market Investor' });
  const response = await request(app).get('/api/market').set(auth(investor.token));

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.marketData));
  assert.ok(response.body.marketData.some((item) => item.symbol === 'DEMO-EQ'));
  assert.ok(response.body.marketData.some((item) => item.symbol === 'DEMO-GOLD'));
  assert.ok(response.body.marketData.some((item) => item.symbol === 'DEMO-DEBT'));
  assert.ok(response.body.marketData.every((item) => item.source === 'simulation'));

  const symbolResponse = await request(app).get('/api/market/DEMO-EQ').set(auth(investor.token));
  assert.equal(symbolResponse.status, 200);
  assert.equal(symbolResponse.body.marketItem.symbol, 'DEMO-EQ');
});

test('admin can create, update, and delete market data records', async () => {
  const admin = await createUser({ role: 'admin', name: 'Market Admin' });

  const create = await request(app)
    .post('/api/market')
    .set(auth(admin.token))
    .send({ symbol: 'TEST-AAA', name: 'Test Asset', assetType: 'equity', price: 101.5, changePercent: 3.25 });
  assert.equal(create.status, 201);
  assert.equal(create.body.marketItem.symbol, 'TEST-AAA');

  const list = await request(app).get('/api/market').set(auth(admin.token));
  assert.equal(list.status, 200);
  assert.ok(list.body.marketData.some((item) => item.symbol === 'TEST-AAA'));

  const update = await request(app)
    .put(`/api/market/${create.body.marketItem._id}`)
    .set(auth(admin.token))
    .send({ price: 105.5, changePercent: 5.75 });
  assert.equal(update.status, 200);
  assert.equal(String(update.body.marketItem.price), '105.5');

  const remove = await request(app)
    .delete(`/api/market/${create.body.marketItem._id}`)
    .set(auth(admin.token));
  assert.equal(remove.status, 200);
  assert.equal(remove.body.message, 'Market data deleted');
});

test('investor cannot create or mutate market data', async () => {
  const investor = await createUser({ role: 'investor', name: 'Restricted Investor' });

  const create = await request(app)
    .post('/api/market')
    .set(auth(investor.token))
    .send({ symbol: 'TEST-BBB', name: 'Blocked Asset', assetType: 'gold', price: 99.5, changePercent: -2.5 });
  assert.equal(create.status, 403);

  const list = await request(app).get('/api/market').set(auth(investor.token));
  assert.equal(list.status, 200);
  assert.ok(Array.isArray(list.body.marketData));
});
