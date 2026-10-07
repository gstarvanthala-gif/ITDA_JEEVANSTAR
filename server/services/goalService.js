import mongoose from 'mongoose';

import Goal from '../models/Goal.js';
import { createNotification } from './notificationService.js';

const MAX_AMOUNT_PAISE = BigInt(Number.MAX_SAFE_INTEGER);
const AMOUNT_PATTERN = /^(\d+)(?:\.(\d{1,2}))?$/;
const GOAL_STATUSES = ['active', 'completed', 'archived'];

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const parseAmountPaise = (value, fieldName) => {
  if (typeof value !== 'number' && typeof value !== 'string') {
    throw createHttpError(`${fieldName} must be a valid amount`, 400);
  }

  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw createHttpError(`${fieldName} must be a valid amount`, 400);
  }

  const match = AMOUNT_PATTERN.exec(String(value));
  if (!match) {
    throw createHttpError(`${fieldName} must be non-negative with at most two decimal places`, 400);
  }

  const amountPaise = BigInt(match[1]) * 100n + BigInt((match[2] || '').padEnd(2, '0') || '0');
  if (amountPaise > MAX_AMOUNT_PAISE) {
    throw createHttpError(`${fieldName} is too large`, 400);
  }

  return amountPaise;
};

const formatPaise = (amountPaise) =>
  `${amountPaise / 100n}.${String(amountPaise % 100n).padStart(2, '0')}`;

const parseTargetDate = (value) => {
  if (typeof value !== 'string' && !(value instanceof Date)) {
    throw createHttpError('targetDate must be a valid date', 400);
  }

  const targetDate = new Date(value);
  if (Number.isNaN(targetDate.getTime())) {
    throw createHttpError('targetDate must be a valid date', 400);
  }

  if (typeof value === 'string') {
    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch.map(Number);
      if (
        targetDate.getUTCFullYear() !== year ||
        targetDate.getUTCMonth() + 1 !== month ||
        targetDate.getUTCDate() !== day
      ) {
        throw createHttpError('targetDate must be a valid date', 400);
      }
    }
  }

  return targetDate;
};

const normalizeGoal = ({ name, targetAmount, currentAmount = '0.00', targetDate, status = 'active' }) => {
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 80) {
    throw createHttpError('name must contain between 1 and 80 characters', 400);
  }

  const targetPaise = parseAmountPaise(targetAmount, 'targetAmount');
  const currentPaise = parseAmountPaise(currentAmount, 'currentAmount');

  if (targetPaise <= 0n) {
    throw createHttpError('targetAmount must be greater than zero', 400);
  }
  if (currentPaise > targetPaise) {
    throw createHttpError('currentAmount cannot exceed targetAmount', 400);
  }
  if (!GOAL_STATUSES.includes(status)) {
    throw createHttpError('status must be active, completed, or archived', 400);
  }
  const derivedStatus = status === 'archived'
    ? 'archived'
    : currentPaise === targetPaise
      ? 'completed'
      : 'active';

  return {
    name: name.trim(),
    targetAmount: mongoose.Types.Decimal128.fromString(formatPaise(targetPaise)),
    currentAmount: mongoose.Types.Decimal128.fromString(formatPaise(currentPaise)),
    targetDate: parseTargetDate(targetDate),
    status: derivedStatus,
  };
};

export const serializeGoal = (goal) => {
  const targetPaise = parseAmountPaise(goal.targetAmount.toString(), 'targetAmount');
  const currentPaise = parseAmountPaise(goal.currentAmount.toString(), 'currentAmount');
  const progress = targetPaise === 0n
    ? 0
    : Math.max(0, Math.min(100, Number((currentPaise * 10000n) / targetPaise) / 100));

  return {
    id: goal._id,
    name: goal.name,
    targetAmount: formatPaise(targetPaise),
    currentAmount: formatPaise(currentPaise),
    targetDate: goal.targetDate,
    status: goal.status,
    progress,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
  };
};

export const createGoal = async (userId, payload) => {
  const goal = await Goal.create({ userId, ...normalizeGoal(payload) });
  if (goal.status === 'completed') {
    goal.completedAt = new Date();
    await goal.save();
    await createNotification({
      userId,
      title: 'Goal reached',
      message: `You reached your virtual savings goal: ${goal.name}.`,
      type: 'goal_completed',
      eventKey: `goal-completed:${goal._id}:${goal.completedAt.toISOString()}`,
      metadata: { goalId: String(goal._id) },
    });
  }
  return serializeGoal(goal);
};

export const listGoals = async (userId) => {
  const goals = await Goal.find({ userId }).sort({ targetDate: 1, createdAt: -1 });
  return goals.map(serializeGoal);
};

export const getGoal = async (userId, goalId) => {
  const goal = await Goal.findOne({ _id: goalId, userId });
  if (!goal) throw createHttpError('Goal not found', 404);
  return serializeGoal(goal);
};

export const updateGoal = async (userId, goalId, payload) => {
  const goal = await Goal.findOne({ _id: goalId, userId });
  if (!goal) throw createHttpError('Goal not found', 404);
  const wasCompleted = goal.status === 'completed';

  const normalized = normalizeGoal({
    name: payload.name ?? goal.name,
    targetAmount: payload.targetAmount ?? goal.targetAmount.toString(),
    currentAmount: payload.currentAmount ?? goal.currentAmount.toString(),
    targetDate: payload.targetDate ?? goal.targetDate,
    status: payload.status ?? goal.status,
  });

  goal.set(normalized);
  if (goal.status === 'completed' && !wasCompleted) goal.completedAt = new Date();
  if (goal.status !== 'completed' && goal.status !== 'archived') goal.completedAt = null;
  await goal.save();

  if (goal.status === 'completed' && !wasCompleted) {
    await createNotification({
      userId,
      title: 'Goal reached',
      message: `You reached your virtual savings goal: ${goal.name}.`,
      type: 'goal_completed',
      eventKey: `goal-completed:${goal._id}:${goal.completedAt.toISOString()}`,
      metadata: { goalId: String(goal._id) },
    });
  }

  return serializeGoal(goal);
};

export const deleteGoal = async (userId, goalId) => {
  const goal = await Goal.findOneAndDelete({ _id: goalId, userId });
  if (!goal) throw createHttpError('Goal not found', 404);
  return { id: goal._id, message: 'Goal deleted' };
};