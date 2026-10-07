import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';

import app from '../app.js';
import connectDB from '../config/db.js';
import RiskProfile from '../models/RiskProfile.js';
import User from '../models/User.js';
import { calculateRiskScore, classifyRiskScore } from '../services/riskService.js';

const testUserIds = [];

before(async () => {
  await connectDB();
});

after(async () => {
  if (testUserIds.length > 0) {
    await RiskProfile.deleteMany({ userId: { $in: testUserIds } });
    await User.deleteMany({ _id: { $in: testUserIds } });
  }

  await mongoose.connection.close();
});

const createInvestor = async () => {
  const email = `${new mongoose.Types.ObjectId()}@phase6.microgrow.test`;
  const response = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Phase 6 Investor', email, password: 'Password123!' });

  assert.equal(response.status, 201);
  const userId = response.body.user.id;
  testUserIds.push(userId);
  return { token: response.body.token, userId };
};

const authorized = (token) => ({ Authorization: `Bearer ${token}` });
const answerSet = (level) => ({
  investmentHorizon: ['underOneYear', 'oneToThreeYears', 'threeToFiveYears', 'fiveToTenYears', 'overTenYears'][level],
  marketDrop: ['sellAll', 'sellSome', 'wait', 'stayInvested', 'addMore'][level],
  priority: ['preserve', 'steady', 'balanced', 'growth', 'maximumGrowth'][level],
  experience: ['none', 'basic', 'some', 'good', 'advanced'][level],
  volatilityComfort: ['veryUncomfortable', 'uncomfortable', 'neutral', 'comfortable', 'veryComfortable'][level],
});

test('risk score boundaries map to the documented profiles', () => {
  assert.equal(classifyRiskScore(0), 'conservative');
  assert.equal(classifyRiskScore(30), 'conservative');
  assert.equal(classifyRiskScore(31), 'moderate');
  assert.equal(classifyRiskScore(60), 'moderate');
  assert.equal(classifyRiskScore(61), 'aggressive');
  assert.equal(classifyRiskScore(100), 'aggressive');
  assert.throws(() => classifyRiskScore(101), { statusCode: 400 });
});

test('risk score is calculated from valid answers only', () => {
  assert.equal(calculateRiskScore(answerSet(0)), 0);
  assert.equal(calculateRiskScore(answerSet(4)), 100);
  assert.throws(() => calculateRiskScore({}), { statusCode: 400 });
  assert.throws(() => calculateRiskScore(answerSet('not-an-option')), { statusCode: 400 });
});

test('investor can retrieve questions and receives no scoring weights', async () => {
  const investor = await createInvestor();
  const response = await request(app)
    .get('/api/risk/questions')
    .set(authorized(investor.token));

  assert.equal(response.status, 200);
  assert.equal(response.body.questions.length, 5);
  assert.ok(response.body.questions.every((question) =>
    question.options.every((option) => !Object.hasOwn(option, 'score'))
  ));
});

test('submission stores server-computed conservative and aggressive profiles', async () => {
  const investor = await createInvestor();

  const lowScore = await request(app)
    .post('/api/risk/submit')
    .set(authorized(investor.token))
    .send({ answers: answerSet(0) });
  assert.equal(lowScore.status, 201);
  assert.equal(lowScore.body.riskProfile.score, 0);
  assert.equal(lowScore.body.riskProfile.profile, 'conservative');

  const highScore = await request(app)
    .post('/api/risk/submit')
    .set(authorized(investor.token))
    .send({ answers: answerSet(4) });
  assert.equal(highScore.status, 201);
  assert.equal(highScore.body.riskProfile.score, 100);
  assert.equal(highScore.body.riskProfile.profile, 'aggressive');

  const savedUser = await User.findById(investor.userId);
  assert.equal(String(savedUser.riskProfile), highScore.body.riskProfile.id);
});

test('submission rejects incomplete answers and client-provided scores or profiles', async () => {
  const investor = await createInvestor();

  const incomplete = await request(app)
    .post('/api/risk/submit')
    .set(authorized(investor.token))
    .send({ answers: { investmentHorizon: 'overTenYears' } });
  assert.equal(incomplete.status, 400);

  const tampered = await request(app)
    .post('/api/risk/submit')
    .set(authorized(investor.token))
    .send({ answers: answerSet(0), score: 100, profile: 'aggressive' });
  assert.equal(tampered.status, 400);

  const invalidOption = await request(app)
    .post('/api/risk/submit')
    .set(authorized(investor.token))
    .send({ answers: Object.fromEntries(Object.entries(answerSet(0)).map(([key]) => [key, 'arbitrary'])) });
  assert.equal(invalidOption.status, 400);
});

test('profile retrieval and recalculation use only the current investor saved answers', async () => {
  const owner = await createInvestor();
  const otherInvestor = await createInvestor();

  await request(app)
    .post('/api/risk/submit')
    .set(authorized(owner.token))
    .send({ answers: answerSet(1) })
    .expect(201);

  const otherProfile = await request(app)
    .get('/api/risk/profile')
    .set(authorized(otherInvestor.token));
  assert.equal(otherProfile.status, 200);
  assert.equal(otherProfile.body.riskProfile, null);

  const recalculated = await request(app)
    .put('/api/risk/recalculate')
    .set(authorized(owner.token));
  assert.equal(recalculated.status, 200);
  assert.equal(recalculated.body.riskProfile.score, 25);
  assert.equal(recalculated.body.riskProfile.profile, 'conservative');

  const suppliedScore = await request(app)
    .put('/api/risk/recalculate')
    .set(authorized(owner.token))
    .send({ score: 100 });
  assert.equal(suppliedScore.status, 400);
});

test('risk endpoints require investor authorization', async () => {
  const response = await request(app).get('/api/risk/profile');
  assert.equal(response.status, 401);
});