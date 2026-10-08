import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';

import app from '../app.js';
import connectDB from '../config/db.js';
import MarketData from '../models/MarketData.js';
import Notification from '../models/Notification.js';
import Portfolio from '../models/Portfolio.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';

const testUserIds = [];
const testNotificationTitles = [];

before(async () => {
  await connectDB();
});

after(async () => {
  await MarketData.deleteMany({ symbol: { $in: ['ADMIN-TEST-ASSET', 'ADMIN-SUMMARY-EQ'] } });
  if (testUserIds.length > 0) {
    await Transaction.deleteMany({ userId: { $in: testUserIds } });
    await Notification.deleteMany({ userId: { $in: testUserIds } });
    await User.deleteMany({ _id: { $in: testUserIds } });
  }
  if (testNotificationTitles.length > 0) {
    await Notification.deleteMany({ title: { $in: testNotificationTitles } });
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
  const forbiddenMutation = await request(app)
    .put(`/api/admin/users/${investor.id}/status`)
    .set(auth(investor.token))
    .send({ isActive: false });
  const forbiddenNotification = await request(app)
    .post('/api/admin/notifications')
    .set(auth(advisor.token))
    .send({ audience: 'all-users', title: 'Forbidden', message: 'Forbidden', type: 'portfolio_updated' });

  assert.equal(anonymousResponse.status, 401);
  assert.equal(investorResponse.status, 403);
  assert.equal(advisorResponse.status, 403);
  assert.equal(forbiddenMutation.status, 403);
  assert.equal(forbiddenNotification.status, 403);
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

test('admin market listing serializes simulated decimal values as strings', async () => {
  const admin = await createUser('admin');
  await MarketData.create({
    symbol: 'ADMIN-TEST-ASSET',
    name: 'Admin Test Asset',
    assetType: 'equity',
    price: mongoose.Types.Decimal128.fromString('42.75'),
    changePercent: mongoose.Types.Decimal128.fromString('-1.25'),
  });

  const response = await request(app)
    .get('/api/admin/market?search=ADMIN-TEST-ASSET')
    .set(auth(admin.token));
  const [item] = response.body.items;

  assert.equal(response.status, 200);
  assert.equal(typeof item.price, 'string');
  assert.equal(item.price, '42.75');
  assert.equal(typeof item.changePercent, 'string');
  assert.equal(item.changePercent, '-1.25');
});

test('admin can filter users and view safe details while protecting account access', async () => {
  const admin = await createUser('admin');
  const investor = await createUser('investor');

  const list = await request(app)
    .get('/api/admin/users?role=investor&assignment=unassigned')
    .set(auth(admin.token));
  const details = await request(app)
    .get(`/api/admin/users/${investor.id}`)
    .set(auth(admin.token));
  const invalidFilter = await request(app)
    .get('/api/admin/users?role=superuser')
    .set(auth(admin.token));
  const selfDeactivate = await request(app)
    .put(`/api/admin/users/${admin.id}/status`)
    .set(auth(admin.token))
    .send({ isActive: false });
  const deactivate = await request(app)
    .put(`/api/admin/users/${investor.id}/status`)
    .set(auth(admin.token))
    .send({ isActive: false });
  const revokedSession = await request(app)
    .get('/api/auth/me')
    .set(auth(investor.token));
  const reactivate = await request(app)
    .put(`/api/admin/users/${investor.id}/status`)
    .set(auth(admin.token))
    .send({ isActive: true });
  const oldSessionAfterReactivation = await request(app)
    .get('/api/auth/me')
    .set(auth(investor.token));

  assert.equal(list.status, 200);
  assert.ok(list.body.items.some((user) => user._id === investor.id));
  assert.equal(details.status, 200);
  assert.equal(details.body.data.user._id, investor.id);
  assert.equal(details.body.data.activity.transactionCount, 0);
  assert.equal(Object.hasOwn(details.body.data.user, 'passwordHash'), false);
  assert.equal(invalidFilter.status, 400);
  assert.equal(selfDeactivate.status, 409);
  assert.equal(deactivate.status, 200);
  assert.equal(revokedSession.status, 401);
  assert.equal(reactivate.status, 200);
  assert.equal(oldSessionAfterReactivation.status, 401);
});

test('admin can list available advisors and assign or safely reassign investors', async () => {
  const admin = await createUser('admin');
  const investor = await createUser('investor');
  const advisor = await createUser('advisor');
  const replacementAdvisor = await createUser('advisor');

  const availableAdvisors = await request(app)
    .get('/api/admin/advisors')
    .set(auth(admin.token));
  const unassignedInvestors = await request(app)
    .get('/api/admin/users?role=investor&assignment=unassigned')
    .set(auth(admin.token));
  const assign = await request(app)
    .put(`/api/admin/investors/${investor.id}/advisor`)
    .set(auth(admin.token))
    .send({ advisorId: advisor.id });
  const reassign = await request(app)
    .put(`/api/admin/investors/${investor.id}/advisor`)
    .set(auth(admin.token))
    .send({ advisorId: replacementAdvisor.id });
  const assignedInvestors = await request(app)
    .get('/api/admin/users?role=investor&assignment=assigned')
    .set(auth(admin.token));
  const forbidden = await request(app)
    .put(`/api/admin/investors/${investor.id}/advisor`)
    .set(auth(investor.token))
    .send({ advisorId: advisor.id });

  assert.equal(availableAdvisors.status, 200);
  assert.ok(availableAdvisors.body.items.some((item) => item._id === advisor.id));
  assert.ok(unassignedInvestors.body.items.some((item) => item._id === investor.id));
  assert.equal(assign.status, 200);
  assert.equal(reassign.status, 200);
  const assignedInvestor = assignedInvestors.body.items.find((item) => item._id === investor.id);
  assert.ok(assignedInvestor);
  assert.equal(assignedInvestor.advisorId._id, replacementAdvisor.id);
  assert.equal(forbidden.status, 403);
});

test('admin transactions support user and inclusive date filters with validation', async () => {
  const admin = await createUser('admin');
  const investor = await createUser('investor');
  const bankAccountId = new mongoose.Types.ObjectId();
  await Transaction.create([
    {
      userId: investor.id,
      bankAccountId,
      merchant: 'Priority Four In Range',
      amount: 15,
      category: 'food',
      transactionDate: new Date('2026-08-10T13:30:00.000Z'),
      syncKey: `priority4-in-range-${investor.id}`,
    },
    {
      userId: investor.id,
      bankAccountId,
      merchant: 'Priority Four Out Of Range',
      amount: 25,
      category: 'food',
      transactionDate: new Date('2026-08-11T00:00:00.000Z'),
      syncKey: `priority4-out-range-${investor.id}`,
    },
  ]);

  const filtered = await request(app)
    .get(`/api/admin/transactions?userId=${investor.id}&dateFrom=2026-08-10&dateTo=2026-08-10`)
    .set(auth(admin.token));
  const invalidDate = await request(app)
    .get('/api/admin/transactions?dateFrom=2026-02-30')
    .set(auth(admin.token));
  const invalidUser = await request(app)
    .get('/api/admin/transactions?userId=not-an-id')
    .set(auth(admin.token));

  assert.equal(filtered.status, 200);
  assert.equal(filtered.body.items.length, 1);
  assert.equal(filtered.body.items[0].merchant, 'Priority Four In Range');
  assert.equal(invalidDate.status, 400);
  assert.equal(invalidUser.status, 400);
});

test('admin notifications can be broadcast and only admin-created notifications can be removed', async () => {
  const admin = await createUser('admin');
  const title = `Priority Four Broadcast ${new mongoose.Types.ObjectId()}`;
  testNotificationTitles.push(title);

  const created = await request(app)
    .post('/api/admin/notifications')
    .set(auth(admin.token))
    .send({ audience: 'all-users', title, message: 'A platform simulation update.', type: 'portfolio_updated' });
  const listed = await request(app)
    .get(`/api/admin/notifications?search=${encodeURIComponent(title)}`)
    .set(auth(admin.token));
  const platformNotification = await Notification.findOne({ title, 'metadata.createdBy': 'admin' });
  const removed = await request(app)
    .delete(`/api/admin/notifications/${platformNotification._id}`)
    .set(auth(admin.token));
  const userNotification = await Notification.create({
    userId: admin.id,
    title: 'User-owned notification',
    message: 'Created by an existing user workflow.',
    type: 'portfolio_updated',
    eventKey: `user-owned-${new mongoose.Types.ObjectId()}`,
  });
  const protectedDelete = await request(app)
    .delete(`/api/admin/notifications/${userNotification._id}`)
    .set(auth(admin.token));

  assert.equal(created.status, 201);
  assert.ok(created.body.data.count > 0);
  assert.ok(listed.body.items.some((item) => item.title === title));
  assert.equal(removed.status, 200);
  assert.equal(protectedDelete.status, 404);
});

test('admin overview portfolio value follows the latest persisted market price', async () => {
  const admin = await createUser('admin');
  const decimal = (value) => mongoose.Types.Decimal128.fromString(String(value));
  await MarketData.create({
    symbol: 'ADMIN-SUMMARY-EQ',
    name: 'Admin Summary Equity',
    assetType: 'equity',
    price: decimal(100),
    changePercent: decimal(0),
  });
  await Portfolio.create({
    userId: admin.id,
    totalInvested: decimal(400),
    currentValue: decimal(500),
    totalProfitLoss: decimal(100),
    holdings: [{
      assetType: 'equity',
      units: decimal(5),
      averagePrice: decimal(80),
      currentPrice: decimal(100),
      investedAmount: decimal(400),
      currentValue: decimal(500),
      allocationPercent: 100,
    }],
  });

  const portfolios = await Portfolio.find({}).select('holdings.assetType holdings.units').lean();
  const expectedDeltaPaise = portfolios.reduce((total, portfolio) => total + (portfolio.holdings || [])
    .filter((holding) => holding.assetType === 'equity')
    .reduce((holdingTotal, holding) => {
      const units = Number(holding.units);
      return holdingTotal + Math.round(units * 11000) - Math.round(units * 10000);
    }, 0), 0);
  const firstOverview = await request(app).get('/api/admin/overview').set(auth(admin.token));
  await MarketData.updateOne({ symbol: 'ADMIN-SUMMARY-EQ' }, { $set: { price: decimal(110) } });
  const updatedOverview = await request(app).get('/api/admin/overview').set(auth(admin.token));

  assert.equal(firstOverview.status, 200);
  assert.equal(updatedOverview.status, 200);
  assert.equal(
    Math.round((updatedOverview.body.summary.virtualPortfolioValue - firstOverview.body.summary.virtualPortfolioValue) * 100),
    expectedDeltaPaise
  );
});
