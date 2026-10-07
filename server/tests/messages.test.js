import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';

import app from '../app.js';
import connectDB from '../config/db.js';
import Message from '../models/Message.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

const testUserIds = [];

before(async () => {
  await connectDB();
});

after(async () => {
  if (testUserIds.length > 0) {
    await Message.deleteMany({ $or: [
      { senderId: { $in: testUserIds } },
      { receiverId: { $in: testUserIds } },
    ] });
    await Notification.deleteMany({ userId: { $in: testUserIds } });
    await User.deleteMany({ _id: { $in: testUserIds } });
  }
  await mongoose.connection.close();
});

const createUser = async (name) => {
  const email = `${new mongoose.Types.ObjectId()}@phase12.microgrow.test`;
  const response = await request(app)
    .post('/api/auth/register')
    .send({ name, email, password: 'Password123!' });
  assert.equal(response.status, 201);
  const user = { id: response.body.user.id, token: response.body.token };
  testUserIds.push(user.id);
  return user;
};

const auth = (token) => ({ Authorization: `Bearer ${token}` });

const createAssignedPair = async () => {
  const advisor = await createUser('Assigned Advisor');
  const investor = await createUser('Assigned Investor');
  await User.updateOne({ _id: advisor.id }, { $set: { role: 'advisor' } });
  await User.updateOne({ _id: investor.id }, { $set: { advisorId: advisor.id } });
  return { advisor, investor };
};

test('only investors and advisors may access messaging endpoints', async () => {
  const admin = await createUser('Admin');
  await User.updateOne({ _id: admin.id }, { $set: { role: 'admin' } });

  const response = await request(app)
    .get(`/api/messages/${admin.id}`)
    .set(auth(admin.token));
  assert.equal(response.status, 403);
});

test('assigned investor and advisor can exchange messages in their private conversation', async () => {
  const { advisor, investor } = await createAssignedPair();

  const sent = await request(app)
    .post('/api/messages')
    .set(auth(investor.token))
    .send({ receiverId: advisor.id, message: 'Hello, advisor.' });
  assert.equal(sent.status, 201);
  assert.equal(sent.body.message.message, 'Hello, advisor.');
  assert.equal(sent.body.message.isRead, false);
  assert.equal(String(sent.body.message.senderId._id), investor.id);

  const advisorInbox = await request(app)
    .get(`/api/messages/${investor.id}`)
    .set(auth(advisor.token));
  assert.equal(advisorInbox.status, 200);
  assert.equal(advisorInbox.body.messages.length, 1);
  assert.equal(advisorInbox.body.participant.id, investor.id);

  const reply = await request(app)
    .post('/api/messages')
    .set(auth(advisor.token))
    .send({ receiverId: investor.id, message: 'I received your message.' });
  assert.equal(reply.status, 201);

  const investorInbox = await request(app)
    .get(`/api/messages/${advisor.id}`)
    .set(auth(investor.token));
  assert.equal(investorInbox.body.messages.length, 2);
});

test('message length and request fields are validated', async () => {
  const { advisor, investor } = await createAssignedPair();

  const tooLong = await request(app)
    .post('/api/messages')
    .set(auth(investor.token))
    .send({ receiverId: advisor.id, message: 'x'.repeat(2001) });
  assert.equal(tooLong.status, 400);

  const extraField = await request(app)
    .post('/api/messages')
    .set(auth(investor.token))
    .send({ receiverId: advisor.id, message: 'Hello', senderId: advisor.id });
  assert.equal(extraField.status, 400);

  const emptyMessage = await request(app)
    .post('/api/messages')
    .set(auth(investor.token))
    .send({ receiverId: advisor.id, message: '   ' });
  assert.equal(emptyMessage.status, 400);
});

test('unassigned parties and other advisor clients cannot open or send in a conversation', async () => {
  const { advisor, investor } = await createAssignedPair();
  const otherAdvisor = await createUser('Other Advisor');
  const otherInvestor = await createUser('Other Investor');
  await User.updateOne({ _id: otherAdvisor.id }, { $set: { role: 'advisor' } });
  await User.updateOne({ _id: otherInvestor.id }, { $set: { advisorId: otherAdvisor.id } });

  const unassignedConversation = await request(app)
    .get(`/api/messages/${otherInvestor.id}`)
    .set(auth(advisor.token));
  assert.equal(unassignedConversation.status, 403);

  const unassignedSend = await request(app)
    .post('/api/messages')
    .set(auth(investor.token))
    .send({ receiverId: otherAdvisor.id, message: 'Not assigned.' });
  assert.equal(unassignedSend.status, 403);

  const wrongClientForAdvisor = await request(app)
    .get(`/api/messages/${investor.id}`)
    .set(auth(otherAdvisor.token));
  assert.equal(wrongClientForAdvisor.status, 403);
});

test('recipient can mark a message read; only sender can delete it', async () => {
  const { advisor, investor } = await createAssignedPair();
  const sent = await request(app)
    .post('/api/messages')
    .set(auth(investor.token))
    .send({ receiverId: advisor.id, message: 'Please review my plan.' });
  const messageId = sent.body.message._id;

  const senderRead = await request(app)
    .put(`/api/messages/${messageId}/read`)
    .set(auth(investor.token));
  assert.equal(senderRead.status, 404);

  const recipientRead = await request(app)
    .put(`/api/messages/${messageId}/read`)
    .set(auth(advisor.token));
  assert.equal(recipientRead.status, 200);
  assert.equal(recipientRead.body.message.isRead, true);

  const recipientDelete = await request(app)
    .delete(`/api/messages/${messageId}`)
    .set(auth(advisor.token));
  assert.equal(recipientDelete.status, 404);

  const senderDelete = await request(app)
    .delete(`/api/messages/${messageId}`)
    .set(auth(investor.token));
  assert.equal(senderDelete.status, 200);
});

test('sending a message notifies the recipient exactly once', async () => {
  const { advisor, investor } = await createAssignedPair();
  await request(app)
    .post('/api/messages')
    .set(auth(investor.token))
    .send({ receiverId: advisor.id, message: 'Notification test.' })
    .expect(201);

  const notifications = await request(app)
    .get('/api/notifications')
    .set(auth(advisor.token));
  assert.equal(notifications.status, 200);
  assert.equal(notifications.body.notifications.length, 1);
  assert.equal(notifications.body.notifications[0].type, 'advisor_message');
});