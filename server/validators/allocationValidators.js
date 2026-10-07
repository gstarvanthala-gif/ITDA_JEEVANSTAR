import mongoose from 'mongoose';

export const rejectAllocationBody = (req, res, next) => {
  if (req.body && Object.keys(req.body).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Allocation percentages are derived from your saved risk profile',
    });
  }

  return next();
};

export const validateAllocationExecution = (req, res, next) => {
  const body = req.body || {};
  if (
    Object.keys(body).length !== 1 ||
    typeof body.roundUpId !== 'string' ||
    !mongoose.isValidObjectId(body.roundUpId)
  ) {
    return res.status(400).json({ success: false, message: 'A valid roundUpId is required' });
  }

  return next();
};