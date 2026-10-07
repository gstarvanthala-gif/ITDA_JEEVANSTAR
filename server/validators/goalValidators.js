import mongoose from 'mongoose';

const ALLOWED_GOAL_FIELDS = new Set([
  'name',
  'targetAmount',
  'currentAmount',
  'targetDate',
  'status',
]);

export const validateGoalId = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid goal id' });
  }

  return next();
};

export const validateGoalBody = (req, res, next) => {
  const body = req.body || {};
  const keys = Object.keys(body);

  if (
    keys.length === 0 ||
    keys.some((key) => !ALLOWED_GOAL_FIELDS.has(key))
  ) {
    return res.status(400).json({
      success: false,
      message: 'Provide goal fields only: name, targetAmount, currentAmount, targetDate, status',
    });
  }

  return next();
};

export const validateNewGoalBody = (req, res, next) => {
  const body = req.body || {};
  const keys = Object.keys(body);

  if (
    !['name', 'targetAmount', 'targetDate'].every((field) => Object.hasOwn(body, field)) ||
    keys.some((key) => !ALLOWED_GOAL_FIELDS.has(key))
  ) {
    return res.status(400).json({
      success: false,
      message: 'name, targetAmount, and targetDate are required; only goal fields are accepted',
    });
  }

  return next();
};