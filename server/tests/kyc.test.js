import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';

import app from '../app.js';
import connectDB from '../config/db.js';
import KYCRecord from '../models/KYCRecord.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

const createdIds = [];

before(async () => {
  await connectDB();
});

after(async () => {
  if (createdIds.length > 0) {
    await KYCRecord.deleteMany({ userId: { $in: createdIds } });
    await Notification.deleteMany({ userId: { $in: createdIds } });
    await User.deleteMany({ _id: { $in: createdIds } });
  }
  await mongoose.connection.close();
});

const createUser = async ({ role = 'investor', name = 'Demo User' } = {}) => {
  const email = `${new mongoose.Types.ObjectId()}@phase14.microgrow.test`;
  const response = await request(app)
    .post('/api/auth/register')
    .send({ name, email, password: 'Password123!' });
  assert.equal(response.status, 201);

  const userId = response.body.user.id;
  createdIds.push(userId);

  await User.updateOne({ _id: userId }, { $set: { role } });

  return { id: userId, token: response.body.token };
};

const auth = (token) => ({ Authorization: `Bearer ${token}` });

test('investor can submit KYC and fetch own KYC status', async () => {
  const investor = await createUser({ role: 'investor', name: 'Investor KYC' });

  const initialStatus = await request(app).get('/api/kyc/status').set(auth(investor.token));
  assert.equal(initialStatus.status, 200);
  assert.equal(initialStatus.body.kyc.status, 'not_submitted');

  const nonDemoSubmission = await request(app)
    .post('/api/kyc/submit')
    .set(auth(investor.token))
    .send({
      fullName: 'Investor KYC',
      demoDocumentType: 'DEMO-ID',
      demoDocumentNumber: 'REAL-ID-123456',
    });
  assert.equal(nonDemoSubmission.status, 400);

  const submit = await request(app)
    .post('/api/kyc/submit')
    .set(auth(investor.token))
    .send({
      fullName: 'Investor KYC',
      demoDocumentType: 'DEMO-ID',
      demoDocumentNumber: 'DEMO-123456',
    });

  assert.equal(submit.status, 201);
  assert.equal(submit.body.kyc.status, 'pending');
  assert.equal(submit.body.kyc.userId, investor.id);

  const status = await request(app).get('/api/kyc/status').set(auth(investor.token));
  assert.equal(status.status, 200);
  assert.equal(status.body.kyc.status, 'pending');
});

test('pending KYC cannot be resubmitted and rejected KYC can be revised', async () => {
  const investor = await createUser({ role: 'investor', name: 'Investor Resubmission' });
  const admin = await createUser({ role: 'admin', name: 'KYC Admin' });
  const submission = {
    fullName: 'Fictional Demo User',
    demoDocumentType: 'DEMO-ID',
    demoDocumentNumber: 'DEMO-ONLY-4321',
  };

  const first = await request(app)
    .post('/api/kyc/submit')
    .set(auth(investor.token))
    .send(submission);
  assert.equal(first.status, 201);

  const duplicate = await request(app)
    .post('/api/kyc/submit')
    .set(auth(investor.token))
    .send(submission);
  assert.equal(duplicate.status, 409);

  const rejection = await request(app)
    .put(`/api/kyc/${first.body.kyc._id}/reject`)
    .set(auth(admin.token))
    .send({ reviewNote: 'Please revise the fictional demo code.' });
  assert.equal(rejection.status, 200);
  assert.equal(rejection.body.kyc.reviewerId, admin.id);
  assert.ok(rejection.body.kyc.reviewedAt);

  const rejectedStatus = await request(app).get('/api/kyc/status').set(auth(investor.token));
  assert.equal(rejectedStatus.body.kyc.status, 'rejected');
  assert.equal(rejectedStatus.body.kyc.reviewNote, 'Please revise the fictional demo code.');

  const revised = await request(app)
    .post('/api/kyc/submit')
    .set(auth(investor.token))
    .send({ ...submission, demoDocumentNumber: 'DEMO-ONLY-4322' });
  assert.equal(revised.status, 201);
  assert.equal(revised.body.kyc.status, 'pending');
  assert.equal(revised.body.kyc.demoDocumentNumber, 'DEMO-ONLY-4322');
});

test('admin can verify or reject KYC, advisor cannot approve', async () => {
  const investor = await createUser({ role: 'investor', name: 'Investor Review' });
  const rejectedInvestor = await createUser({ role: 'investor', name: 'Investor Rejection' });
  const admin = await createUser({ role: 'admin', name: 'Admin Reviewer' });
  const advisor = await createUser({ role: 'advisor', name: 'Advisor Reviewer' });

  const submit = await request(app)
    .post('/api/kyc/submit')
    .set(auth(investor.token))
    .send({
      fullName: 'Investor Review',
      demoDocumentType: 'DEMO-ID',
      demoDocumentNumber: 'DEMO-654321',
    });

  const verify = await request(app)
    .put(`/api/kyc/${submit.body.kyc._id}/verify`)
    .set(auth(admin.token))
    .send({ reviewNote: 'Approved for demo review' });
  assert.equal(verify.status, 200);
  assert.equal(verify.body.kyc.status, 'verified');
  assert.equal(verify.body.kyc.reviewerId, admin.id);

  const rejected = await request(app)
    .post('/api/kyc/submit')
    .set(auth(rejectedInvestor.token))
    .send({
      fullName: 'Investor Review 2',
      demoDocumentType: 'DEMO-BILL',
      demoDocumentNumber: 'DEMO-111111',
    });

  const advisorAttempt = await request(app)
    .put(`/api/kyc/${rejected.body.kyc._id}/verify`)
    .set(auth(advisor.token))
    .send({ reviewNote: 'Nope' });
  assert.equal(advisorAttempt.status, 403);

  const adminReject = await request(app)
    .put(`/api/kyc/${rejected.body.kyc._id}/reject`)
    .set(auth(admin.token))
    .send({ reviewNote: 'Need clearer demo document image' });
  assert.equal(adminReject.status, 200);
  assert.equal(adminReject.body.kyc.status, 'rejected');
});

test('investor can only view own KYC and admin can view any user KYC record', async () => {
  const investorA = await createUser({ role: 'investor', name: 'Investor A' });
  const investorB = await createUser({ role: 'investor', name: 'Investor B' });
  const admin = await createUser({ role: 'admin', name: 'Admin View' });

  const first = await request(app)
    .post('/api/kyc/submit')
    .set(auth(investorA.token))
    .send({
      fullName: 'Investor A',
      demoDocumentType: 'DEMO-ID',
      demoDocumentNumber: 'DEMO-AAA',
    });

  const ownRecord = await request(app).get(`/api/kyc/${investorA.id}`).set(auth(investorA.token));
  assert.equal(ownRecord.status, 200);
  assert.equal(ownRecord.body.kyc.userId, investorA.id);

  const otherUserRecord = await request(app).get(`/api/kyc/${investorB.id}`).set(auth(investorA.token));
  assert.equal(otherUserRecord.status, 403);

  const adminView = await request(app).get(`/api/kyc/${investorA.id}`).set(auth(admin.token));
  assert.equal(adminView.status, 200);
  assert.equal(adminView.body.kyc.userId, investorA.id);
});
