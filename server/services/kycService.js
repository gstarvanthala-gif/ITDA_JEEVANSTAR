import mongoose from 'mongoose';

import KYCRecord from '../models/KYCRecord.js';
import User from '../models/User.js';
import { createNotification } from './notificationService.js';

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeDemoDocument = (value) => String(value || '').trim();

export const submitKYC = async (userId, payload = {}) => {
  if (!mongoose.isValidObjectId(userId)) {
    throw createHttpError('Invalid user id', 400);
  }

  const user = await User.findById(userId);
  if (!user) throw createHttpError('User not found', 404);
  if (user.role !== 'investor') {
    throw createHttpError('Only investors can submit KYC', 403);
  }

  const fullName = normalizeDemoDocument(payload.fullName);
  const demoDocumentType = normalizeDemoDocument(payload.demoDocumentType).toUpperCase();
  const demoDocumentNumber = normalizeDemoDocument(payload.demoDocumentNumber);

  if (!fullName || fullName.length > 120) {
    throw createHttpError('Full name is required and must be shorter than 120 characters', 400);
  }
  if (!demoDocumentType || !['DEMO-ID', 'DEMO-BILL', 'DEMO-UTILITY', 'DEMO-PASSPORT'].includes(demoDocumentType)) {
    throw createHttpError('demoDocumentType must be one of DEMO-ID, DEMO-BILL, DEMO-UTILITY, or DEMO-PASSPORT', 400);
  }
  if (!/^DEMO-[A-Z0-9][A-Z0-9-]{0,74}$/i.test(demoDocumentNumber)) {
    throw createHttpError('demoDocumentNumber must be a fictional DEMO-prefixed value of at most 80 characters', 400);
  }

  const existingRecord = await KYCRecord.findOne({ userId }).select('_id status');
  if (existingRecord && existingRecord.status !== 'rejected') {
    throw createHttpError('A KYC submission is already active or verified', 409);
  }

  const submission = {
    fullName,
    demoDocumentType,
    demoDocumentNumber,
    status: 'pending',
    reviewerId: null,
    reviewNote: '',
    reviewedAt: null,
    submittedAt: new Date(),
  };
  let kyc;

  if (existingRecord) {
    kyc = await KYCRecord.findOneAndUpdate(
      { _id: existingRecord._id, status: 'rejected' },
      { $set: submission },
      { new: true, runValidators: true }
    );

    if (!kyc) {
      throw createHttpError('A KYC submission is already active or verified', 409);
    }
  } else {
    try {
      kyc = await KYCRecord.create({ userId, ...submission });
    } catch (error) {
      if (error.code !== 11000) throw error;
      throw createHttpError('A KYC submission is already active or verified', 409);
    }
  }

  await User.findByIdAndUpdate(userId, { $set: { kycStatus: 'pending' } });
  return kyc;
};

export const getKycStatus = async (userId) => {
  const record = await KYCRecord.findOne({ userId }).sort({ submittedAt: -1 });
  const currentStatus = record?.status || 'not_submitted';

  if (record) {
    await User.findByIdAndUpdate(userId, { $set: { kycStatus: currentStatus } });
  }

  return {
    userId,
    status: currentStatus,
    record,
  };
};

export const getKycRecordByUser = async (requester, targetUserId) => {
  if (!mongoose.isValidObjectId(targetUserId)) {
    throw createHttpError('Invalid user id', 400);
  }

  if (requester.role === 'admin') {
    const record = await KYCRecord.findOne({ userId: targetUserId }).sort({ submittedAt: -1 });
    if (!record) throw createHttpError('KYC record not found', 404);
    return record;
  }

  if (requester.role === 'investor' && String(requester._id) === String(targetUserId)) {
    const record = await KYCRecord.findOne({ userId: targetUserId }).sort({ submittedAt: -1 });
    if (!record) throw createHttpError('KYC record not found', 404);
    return record;
  }

  throw createHttpError('You can only view your own KYC record', 403);
};

export const updateKycStatus = async ({ reviewerId, recordId, status, reviewNote }) => {
  if (!mongoose.isValidObjectId(recordId)) {
    throw createHttpError('Invalid KYC record id', 400);
  }

  const reviewer = await User.findById(reviewerId);
  if (!reviewer || reviewer.role !== 'admin') {
    throw createHttpError('Only admins can review KYC records', 403);
  }

  if (!['verified', 'rejected'].includes(status)) {
    throw createHttpError('KYC review status is invalid', 400);
  }

  const normalizedReview = String(reviewNote || '').trim();
  if (!normalizedReview) {
    throw createHttpError('A review note is required', 400);
  }

  const record = await KYCRecord.findOneAndUpdate(
    { _id: recordId, status: 'pending' },
    {
      $set: {
        status,
        reviewerId: reviewer._id,
        reviewNote: normalizedReview,
        reviewedAt: new Date(),
      },
    },
    { new: true, runValidators: true }
  );
  if (!record) {
    const existingRecord = await KYCRecord.exists({ _id: recordId });
    if (!existingRecord) throw createHttpError('KYC record not found', 404);
    throw createHttpError('Only pending KYC submissions can be reviewed', 409);
  }

  await User.findByIdAndUpdate(record.userId, { $set: { kycStatus: status } });

  if (status === 'verified') {
    await createNotification({
      userId: record.userId,
      title: 'KYC verified',
      message: 'Your mock KYC was approved and your account is now verified.',
      type: 'kyc_verified',
      eventKey: `kyc-verified:${record._id}`,
      metadata: { kycId: String(record._id) },
    });
  }

  return record;
};
