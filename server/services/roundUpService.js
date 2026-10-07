import mongoose from 'mongoose';

import RoundUp from '../models/RoundUp.js';
import Transaction from '../models/Transaction.js';
import { notifyRoundUpInvested } from './notificationService.js';

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const parsePaise = (amount) => {
  const amountText = String(amount);
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(amountText);

  if (!match) {
    throw createHttpError('Transaction amounts must be non-negative with up to two decimal places', 400);
  }

  return BigInt(match[1]) * 100n + BigInt((match[2] || '').padEnd(2, '0') || '0');
};

const formatPaise = (amountPaise) => {
  const rupees = amountPaise / 100n;
  const paise = String(amountPaise % 100n).padStart(2, '0');
  return `${rupees}.${paise}`;
};

const toDecimal128 = (amount) => mongoose.Types.Decimal128.fromString(amount);

export const calculateRoundUp = (amount) => {
  const originalPaise = parsePaise(amount);
  const roundedPaise = originalPaise === 0n
    ? 0n
    : ((originalPaise + 999n) / 1000n) * 1000n;
  const roundUpPaise = roundedPaise - originalPaise;

  return {
    originalAmount: formatPaise(originalPaise),
    roundedAmount: formatPaise(roundedPaise),
    roundUpAmount: formatPaise(roundUpPaise),
    hasRoundUp: roundUpPaise > 0n,
  };
};

export const listRoundUps = (userId) =>
  RoundUp.find({ userId })
    .populate('transactionId', 'merchant amount category transactionDate')
    .sort({ createdAt: -1, _id: -1 });

export const calculateAndStoreRoundUps = async (userId) => {
  const transactions = await Transaction.find({ userId }).sort({ transactionDate: 1, _id: 1 });

  if (transactions.length === 0) return [];

  const operations = transactions.map((transaction) => {
    const calculation = calculateRoundUp(transaction.amount);

    return {
      updateOne: {
        filter: { userId, transactionId: transaction._id },
        update: {
          $setOnInsert: {
            userId,
            transactionId: transaction._id,
            originalAmount: toDecimal128(calculation.originalAmount),
            roundedAmount: toDecimal128(calculation.roundedAmount),
            roundUpAmount: toDecimal128(calculation.roundUpAmount),
            status: calculation.hasRoundUp ? 'pending' : 'skipped',
          },
        },
        upsert: true,
      },
    };
  });

  try {
    await RoundUp.bulkWrite(operations, { ordered: false });
  } catch (error) {
    const writeErrors = Array.isArray(error.writeErrors) ? error.writeErrors : [];
    const onlyDuplicateKeyErrors = writeErrors.length > 0
      ? writeErrors.every((item) => item.code === 11000)
      : error.code === 11000;

    if (!onlyDuplicateKeyErrors) throw error;
  }

  return listRoundUps(userId);
};

export const summarizeRoundUps = async (userId) => {
  const roundUps = await RoundUp.find({ userId }).select('status roundUpAmount').lean();
  const summary = {
    totalCount: roundUps.length,
    pendingCount: 0,
    investedCount: 0,
    skippedCount: 0,
    totalRoundUpAmount: 0n,
    pendingAmount: 0n,
    investedAmount: 0n,
    skippedAmount: 0n,
  };

  for (const roundUp of roundUps) {
    const amountPaise = parsePaise(roundUp.roundUpAmount.toString());
    summary.totalRoundUpAmount += amountPaise;

    if (roundUp.status === 'pending') {
      summary.pendingCount += 1;
      summary.pendingAmount += amountPaise;
    } else if (roundUp.status === 'invested') {
      summary.investedCount += 1;
      summary.investedAmount += amountPaise;
    } else {
      summary.skippedCount += 1;
      summary.skippedAmount += amountPaise;
    }
  }

  return {
    ...summary,
    totalRoundUpAmount: formatPaise(summary.totalRoundUpAmount),
    pendingAmount: formatPaise(summary.pendingAmount),
    investedAmount: formatPaise(summary.investedAmount),
    skippedAmount: formatPaise(summary.skippedAmount),
  };
};

export const getRoundUpHistory = (userId) =>
  RoundUp.find({ userId, status: { $in: ['invested', 'skipped'] } })
    .populate('transactionId', 'merchant amount category transactionDate')
    .sort({ updatedAt: -1, _id: -1 });

export const investRoundUp = async (userId, roundUpId) => {
  const roundUp = await RoundUp.findOneAndUpdate(
    {
      _id: roundUpId,
      userId,
      status: 'pending',
      roundUpAmount: { $gt: toDecimal128('0.00') },
    },
    { $set: { status: 'invested', investedAt: new Date() } },
    { new: true, runValidators: true }
  ).populate('transactionId', 'merchant amount category transactionDate');

  if (roundUp) {
    await notifyRoundUpInvested(userId, roundUp);
    return roundUp;
  }

  const existingRoundUp = await RoundUp.findOne({ _id: roundUpId, userId });

  if (!existingRoundUp) {
    throw createHttpError('Round-up not found', 404);
  }

  if (existingRoundUp.status === 'invested') {
    throw createHttpError('Round-up has already been invested', 409);
  }

  if (existingRoundUp.status === 'skipped') {
    throw createHttpError('A zero-value round-up cannot be invested', 409);
  }

  throw createHttpError('Round-up is not available for investment', 409);
};