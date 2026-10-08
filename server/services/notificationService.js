import mongoose from 'mongoose';

import Notification from '../models/Notification.js';

const ALLOWED_TYPES = [
  'roundup_invested',
  'goal_completed',
  'kyc_verified',
  'advisor_message',
  'portfolio_updated',
];

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

export const createNotification = async (payload = {}) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw createHttpError('Notification request is invalid', 400);
  }
  const { userId, title, message, type, eventKey, metadata = {} } = payload;
  if (!mongoose.isValidObjectId(userId)) {
    throw createHttpError('Invalid notification user id', 400);
  }
  if (typeof title !== 'string' || !title.trim() || title.trim().length > 120) {
    throw createHttpError('Notification title is invalid', 400);
  }
  if (typeof message !== 'string' || !message.trim() || message.trim().length > 500) {
    throw createHttpError('Notification message is invalid', 400);
  }
  if (!ALLOWED_TYPES.includes(type)) {
    throw createHttpError('Notification type is invalid', 400);
  }
  if (typeof eventKey !== 'string' || !eventKey.trim() || eventKey.trim().length > 200) {
    throw createHttpError('Notification event key is invalid', 400);
  }
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw createHttpError('Notification metadata is invalid', 400);
  }

  const notificationData = {
    userId,
    title: title.trim(),
    message: message.trim(),
    type,
    eventKey: eventKey.trim(),
    metadata,
  };

  try {
    const notification = await Notification.create(notificationData);
    return { notification, created: true };
  } catch (error) {
    if (error.code !== 11000) throw error;

    const notification = await Notification.findOne({ userId, eventKey: eventKey.trim() });
    if (!notification) throw error;
    return { notification, created: false };
  }
};

export const notifyRoundUpInvested = async (userId, roundUp) => {
  const merchant = roundUp.transactionId?.merchant || 'a simulated transaction';
  return createNotification({
    userId,
    title: 'Round-up invested',
    message: `A ${roundUp.roundUpAmount.toString()} virtual round-up from ${merchant} was invested.`,
    type: 'roundup_invested',
    eventKey: `roundup-invested:${roundUp._id}`,
    metadata: { roundUpId: String(roundUp._id), transactionId: String(roundUp.transactionId?._id || roundUp.transactionId) },
  });
};

export const listNotifications = (userId) =>
  Notification.find({ userId }).sort({ createdAt: -1, _id: -1 });

export const countUnreadNotifications = (userId) => Notification.countDocuments({ userId, isRead: false });

export const markNotificationRead = (userId, notificationId) =>
  Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { $set: { isRead: true } },
    { new: true, runValidators: true }
  );

export const markAllNotificationsRead = async (userId) => {
  const result = await Notification.updateMany(
    { userId, isRead: false },
    { $set: { isRead: true } }
  );
  return result.modifiedCount;
};

export const deleteNotification = (userId, notificationId) =>
  Notification.findOneAndDelete({ _id: notificationId, userId });