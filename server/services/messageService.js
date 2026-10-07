import mongoose from 'mongoose';

import Message from '../models/Message.js';
import User from '../models/User.js';
import { createNotification } from './notificationService.js';

const MESSAGE_MAX_LENGTH = 2000;

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const loadParticipants = async (userId, otherUserId) => {
  if (!mongoose.isValidObjectId(otherUserId) || String(userId) === String(otherUserId)) {
    throw createHttpError('Invalid conversation participant', 400);
  }

  const [user, otherUser] = await Promise.all([
    User.findById(userId).select('name email role advisorId isActive'),
    User.findById(otherUserId).select('name email role advisorId isActive'),
  ]);

  if (!user || !otherUser || !user.isActive || !otherUser.isActive) {
    throw createHttpError('Assigned conversation not found', 404);
  }

  if (user.role === 'investor') {
    if (otherUser.role !== 'advisor' || String(user.advisorId || '') !== String(otherUser._id)) {
      throw createHttpError('You can only message your assigned advisor', 403);
    }
    return { user, otherUser, investor: user, advisor: otherUser };
  }

  if (user.role === 'advisor') {
    if (otherUser.role !== 'investor' || String(otherUser.advisorId || '') !== String(user._id)) {
      throw createHttpError('You can only message your assigned investors', 403);
    }
    return { user, otherUser, investor: otherUser, advisor: user };
  }

  throw createHttpError('Only investors and advisors may use messaging', 403);
};

const populateMessageUsers = (query) =>
  query.populate('senderId', 'name role').populate('receiverId', 'name role');

export const getConversation = async (userId, otherUserId) => {
  const { user, otherUser } = await loadParticipants(userId, otherUserId);
  const messages = await populateMessageUsers(
    Message.find({
      $or: [
        { senderId: user._id, receiverId: otherUser._id },
        { senderId: otherUser._id, receiverId: user._id },
      ],
    }).sort({ createdAt: 1, _id: 1 })
  );

  return {
    participant: { id: otherUser._id, name: otherUser.name, role: otherUser.role },
    messages,
  };
};

export const sendMessage = async (senderId, receiverId, rawMessage) => {
  const { user: sender, otherUser: receiver, investor } = await loadParticipants(senderId, receiverId);
  if (typeof rawMessage !== 'string') {
    throw createHttpError('Message must be text', 400);
  }

  const messageText = rawMessage.trim();
  if (!messageText || messageText.length > MESSAGE_MAX_LENGTH) {
    throw createHttpError(`Message must contain between 1 and ${MESSAGE_MAX_LENGTH} characters`, 400);
  }

  const message = await Message.create({
    senderId: sender._id,
    receiverId: receiver._id,
    message: messageText,
  });

  try {
    await createNotification({
      userId: receiver._id,
      title: 'Advisor message received',
      message: `New message from ${sender.name}.`,
      type: 'advisor_message',
      eventKey: `advisor-message:${message._id}`,
      metadata: { messageId: String(message._id), investorId: String(investor._id) },
    });
  } catch (error) {
    await Message.deleteOne({ _id: message._id });
    throw error;
  }

  return populateMessageUsers(Message.findById(message._id));
};

export const markMessageRead = async (userId, messageId) => {
  if (!mongoose.isValidObjectId(messageId)) throw createHttpError('Invalid message id', 400);

  const message = await Message.findOne({ _id: messageId, receiverId: userId });
  if (!message) throw createHttpError('Message not found', 404);
  await loadParticipants(userId, message.senderId);

  if (!message.isRead) {
    message.isRead = true;
    await message.save();
  }

  return populateMessageUsers(Message.findById(message._id));
};

export const deleteMessage = async (userId, messageId) => {
  if (!mongoose.isValidObjectId(messageId)) throw createHttpError('Invalid message id', 400);

  const message = await Message.findOne({ _id: messageId, senderId: userId });
  if (!message) throw createHttpError('Message not found', 404);
  await loadParticipants(userId, message.receiverId);
  await Message.deleteOne({ _id: message._id, senderId: userId });
  return { id: message._id, message: 'Message deleted' };
};