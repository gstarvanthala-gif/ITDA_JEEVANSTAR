import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';

import app from '../app.js';
import connectDB from '../config/db.js';
import Allocation from '../models/Allocation.js';
import BankAccount from '../models/BankAccount.js';
import Portfolio from '../models/Portfolio.js';
import PortfolioHistory from '../models/PortfolioHistory.js';
import RiskProfile from '../models/RiskProfile.js';
import RoundUp from '../models/RoundUp.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import { simulatePricePaise } from '../services/portfolioService.js';

const testUserIds = [];

before(async () => {
  await connectDB();
});

after(async () => {
  if (testUserIds.length > 0) {
    await PortfolioHistory.deleteMany({ userId: { $in: testUserIds } });
    await Portfolio.deleteMany({ userId: { $in: testUserIds } });
    await RoundUp.deleteMany({ userId: { $in: testUserIds } });
    await Allocation.deleteMany({ userId: { $in: testUserIds } });
    await RiskProfile.deleteMany({ userId: { $in: testUserIds } });
    await Transaction.deleteMany({ userId: { $in: testUserIds } });
    await BankAccount.deleteMany({ userId: { $in: testUserIds } });
    await User.deleteMany({ _id: { $in: testUserIds } });
  }
  await mongoose.connection.close();
});

const answers = {
  investmentHorizon: 'threeToFiveYears',
  marketDrop: 'wait',
  priority: 'balanced',
  experience: 'some',
  volatilityComfort: 'neutral',
};

const createInvestor = async () => {
  const email = `${new mongoose.Types.ObjectId()}@phase8.microgrow.test`;
  const response = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Phase 8 Investor', email, password: 'Password123!' });
  assert.equal(response.status, 201);
  const user = { id: response.body.user.id, token: response.body.token };
  testUserIds.push(user.id);
  return user;
};

const auth = (token) => ({ Authorization: `Bearer ${token}` });

const createPortfolioInvestment = async (token) => {
  await request(app).post('/api/risk/submit').set(auth(token)).send({ answers }).expect(201);
  await request(app).post('/api/bank/connect').set(auth(token)).expect(201);
  await request(app).post('/api/transactions/sync').set(auth(token)).expect(200);
  const roundUps = await request(app).post('/api/roundups/calculate').set(auth(token));
  const coffeeRoundUp = roundUps.body.roundUps.find(
    ({ transactionId }) => transactionId.merchant === 'Coffee Shop'
  );
  await request(app).post('/api/allocation/calculate').set(auth(token)).expect(200);
  await request(app)
    .post('/api/allocation/execute')
    .set(auth(token))
    .send({ roundUpId: coffeeRoundUp._id })
    .expect(200);
};

test('simulated asset prices are deterministic for a given date', () => {
  const date = new Date('2026-10-06T12:00:00.000Z');
  assert.equal(simulatePricePaise('equity', date), simulatePricePaise('equity', date));
  assert.notEqual(
    simulatePricePaise('equity', new Date('2026-09-01T12:00:00.000Z')),
    simulatePricePaise('equity', date)
  );
});

test('empty investor portfolio has zero value and no holdings or history', async () => {
  const investor = await createInvestor();
  const portfolio = await request(app).get('/api/portfolio').set(auth(investor.token));
  assert.equal(portfolio.status, 200);
  assert.equal(portfolio.body.portfolio.totalInvested, '0.00');
  assert.equal(portfolio.body.portfolio.currentValue, '0.00');
  assert.equal(portfolio.body.portfolio.totalProfitLoss, '0.00');
  assert.deepEqual(portfolio.body.portfolio.holdings, []);

  const history = await request(app).get('/api/portfolio/history').set(auth(investor.token));
  assert.deepEqual(history.body.history, []);
});

test('portfolio endpoints summarize virtual holdings, deterministic value, and persisted history', async () => {
  const investor = await createInvestor();
  await createPortfolioInvestment(investor.token);

  const portfolio = await request(app).get('/api/portfolio').set(auth(investor.token));
  assert.equal(portfolio.status, 200);
  assert.equal(portfolio.body.portfolio.totalInvested, '3.00');
  assert.equal(portfolio.body.portfolio.holdings.length, 3);
  assert.equal(portfolio.body.portfolio.simulationLabel, 'DEMO simulation values');
  assert.equal(
    portfolio.body.portfolio.holdings.reduce((sum, holding) => sum + Number(holding.investedAmount), 0),
    3
  );
  assert.equal(
    portfolio.body.portfolio.holdings.reduce((sum, holding) => sum + holding.allocationPercent, 0),
    100
  );

  const secondRead = await request(app).get('/api/portfolio').set(auth(investor.token));
  assert.equal(secondRead.body.portfolio.currentValue, portfolio.body.portfolio.currentValue);

  const value = await request(app).get('/api/portfolio/value').set(auth(investor.token));
  assert.equal(value.body.currentValue, portfolio.body.portfolio.currentValue);

  const holdings = await request(app).get('/api/portfolio/holdings').set(auth(investor.token));
  assert.equal(holdings.body.holdings.length, 3);

  const summary = await request(app).get('/api/portfolio/summary').set(auth(investor.token));
  assert.equal(summary.body.summary.totalInvested, '3.00');

  const history = await request(app).get('/api/portfolio/history').set(auth(investor.token));
  assert.ok(history.body.history.length >= 2);
  const today = new Date().toISOString().slice(0, 10);
  const todaySnapshot = history.body.history.find((item) => new Date(item.date).toISOString().slice(0, 10) === today);
  assert.equal(todaySnapshot.investedValue, '3.00');

  const roundUps = await request(app).get('/api/roundups').set(auth(investor.token));
  const busRoundUp = roundUps.body.roundUps.find(({ transactionId }) => transactionId.merchant === 'Bus');
  await request(app)
    .post('/api/allocation/execute')
    .set(auth(investor.token))
    .send({ roundUpId: busRoundUp._id })
    .expect(200);

  const refreshedHistory = await request(app).get('/api/portfolio/history').set(auth(investor.token));
  const refreshedToday = refreshedHistory.body.history.find(
    (item) => new Date(item.date).toISOString().slice(0, 10) === today
  );
  assert.equal(refreshedToday.investedValue, '5.00');

  const performance = await request(app).get('/api/portfolio/performance').set(auth(investor.token));
  assert.deepEqual(performance.body.history, refreshedHistory.body.history);

  const transactions = await request(app).get('/api/portfolio/transactions').set(auth(investor.token));
  assert.equal(transactions.body.transactions.length, 2);
});

test('portfolio endpoints scope holdings and transactions to the authenticated investor', async () => {
  const owner = await createInvestor();
  const otherInvestor = await createInvestor();
  await createPortfolioInvestment(owner.token);

  const otherPortfolio = await request(app).get('/api/portfolio').set(auth(otherInvestor.token));
  assert.equal(otherPortfolio.body.portfolio.totalInvested, '0.00');

  const otherTransactions = await request(app)
    .get('/api/portfolio/transactions')
    .set(auth(otherInvestor.token));
  assert.deepEqual(otherTransactions.body.transactions, []);
});

test('portfolio endpoints require an authenticated investor', async () => {
  const response = await request(app).get('/api/portfolio');
  assert.equal(response.status, 401);
});