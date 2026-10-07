import mongoose from 'mongoose';

export const rejectRoundUpCalculationBody = (req, res, next) => {
  if (req.body && Object.keys(req.body).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Round-ups are calculated from your saved transactions; request data is not accepted',
    });
  }

  return next();
};

export const validateInvestRoundUp = (req, res, next) => {
  const body = req.body || {};

  if (
    Object.keys(body).length !== 1 ||
    typeof body.roundUpId !== 'string' ||
    !mongoose.isValidObjectId(body.roundUpId)
  ) {
    return res.status(400).json({
      success: false,
      message: 'A valid roundUpId is required',
    });
  }

  return next();
};