import Allocation from '../models/Allocation.js';
import RiskProfile from '../models/RiskProfile.js';
import RoundUp from '../models/RoundUp.js';
import Transaction from '../models/Transaction.js';
import { notifyRoundUpInvested } from './notificationService.js';
import mongoose from 'mongoose';

const ALLOCATION_RULES = {
  conservative: { equityPercent: 15, goldPercent: 25, debtPercent: 60 },
  moderate: { equityPercent: 50, goldPercent: 20, debtPercent: 30 },
  aggressive: { equityPercent: 80, goldPercent: 10, debtPercent: 10 },
};

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const formatPaise = (amountPaise) =>
  `${amountPaise / 100n}.${String(amountPaise % 100n).padStart(2, '0')}`;

const toPaise = (amount) => {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(amount));
  if (!match) throw createHttpError('Round-up amount must have at most two decimal places', 400);
  return BigInt(match[1]) * 100n + BigInt((match[2] || '').padEnd(2, '0') || '0');
};

export const getAllocation = (userId) => Allocation.findOne({ userId });

export const calculateAllocation = async (userId) => {
  const riskProfile = await RiskProfile.findOne({ userId });

  if (!riskProfile) {
    throw createHttpError('Complete the risk assessment before calculating allocation', 409);
  }

  const rule = ALLOCATION_RULES[riskProfile.profile];
  if (!rule || rule.equityPercent + rule.goldPercent + rule.debtPercent !== 100) {
    throw createHttpError('Stored risk profile does not have a valid allocation rule', 409);
  }

  const update = {
    $set: {
      riskProfile: riskProfile._id,
      riskLevel: riskProfile.profile,
      ...rule,
    },
    $setOnInsert: { userId },
  };

  try {
    return await Allocation.findOneAndUpdate({ userId }, update, {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    });
  } catch (error) {
    if (error.code !== 11000) throw error;
    return Allocation.findOneAndUpdate({ userId }, { $set: update.$set }, {
      new: true,
      runValidators: true,
    });
  }
};

export const resetAllocation = (userId) => Allocation.findOneAndDelete({ userId });

export const getAllocationHistory = (userId) =>
  RoundUp.find({ userId, 'allocationExecution.executedAt': { $exists: true } })
    .populate('transactionId', 'merchant amount category transactionDate')
    .sort({ 'allocationExecution.executedAt': -1, _id: -1 });

const allocationAmounts = (amountPaise, allocation) => {
  const equity = (amountPaise * BigInt(allocation.equityPercent)) / 100n;
  const gold = (amountPaise * BigInt(allocation.goldPercent)) / 100n;
  return { equity, gold, debt: amountPaise - equity - gold };
};

export const executeAllocation = async (userId, roundUpId) => {
  const riskProfile = await RiskProfile.findOne({ userId });
  if (!riskProfile) {
    throw createHttpError('Complete the risk assessment before executing round-ups', 409);
  }

  const allocation = await Allocation.findOne({ userId });
  if (!allocation) {
    throw createHttpError('Calculate an allocation before executing round-ups', 409);
  }
  if (
    String(allocation.riskProfile) !== String(riskProfile._id) ||
    allocation.riskLevel !== riskProfile.profile
  ) {
    throw createHttpError('Risk profile changed; recalculate your allocation before executing', 409);
  }

  const roundUp = await RoundUp.findOne({ _id: roundUpId, userId });
  if (!roundUp) throw createHttpError('Round-up not found', 404);
  if (roundUp.status === 'skipped') {
    throw createHttpError('A zero-value round-up cannot be allocated', 409);
  }

  const amountPaise = toPaise(roundUp.roundUpAmount.toString());
  if (amountPaise <= 0n) {
    throw createHttpError('A zero-value round-up cannot be allocated', 409);
  }

  const amounts = allocationAmounts(amountPaise, allocation);
  const execution = {
    allocationId: allocation._id,
    riskProfileId: allocation.riskProfile,
    riskLevel: allocation.riskLevel,
    equityPercent: allocation.equityPercent,
    goldPercent: allocation.goldPercent,
    debtPercent: allocation.debtPercent,
    equityAmount: mongoose.Types.Decimal128.fromString(formatPaise(amounts.equity)),
    goldAmount: mongoose.Types.Decimal128.fromString(formatPaise(amounts.gold)),
    debtAmount: mongoose.Types.Decimal128.fromString(formatPaise(amounts.debt)),
    executedAt: new Date(),
  };

  const updatedRoundUp = await RoundUp.findOneAndUpdate(
    {
      _id: roundUpId,
      userId,
      status: { $in: ['pending', 'invested'] },
      allocationExecution: null,
    },
    {
      $set: {
        status: 'invested',
        investedAt: roundUp.investedAt || execution.executedAt,
        allocationExecution: execution,
      },
    },
    { new: true, runValidators: true }
  ).populate('transactionId', 'merchant amount category transactionDate');

  if (updatedRoundUp) {
    await notifyRoundUpInvested(userId, updatedRoundUp);
    return updatedRoundUp;
  }

  const currentRoundUp = await RoundUp.findOne({ _id: roundUpId, userId });
  if (!currentRoundUp) throw createHttpError('Round-up not found', 404);
  if (currentRoundUp.allocationExecution) {
    throw createHttpError('Round-up has already been allocated', 409);
  }
  throw createHttpError('Round-up is not available for allocation', 409);
};

export const serializeAllocationHistoryItem = (roundUp) => {
  const result = roundUp.toObject();
  for (const field of ['originalAmount', 'roundedAmount', 'roundUpAmount']) {
    result[field] = result[field].toString();
  }
  for (const field of ['equityAmount', 'goldAmount', 'debtAmount']) {
    result.allocationExecution[field] = result.allocationExecution[field].toString();
  }
  return result;
};