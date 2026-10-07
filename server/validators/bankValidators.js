import mongoose from 'mongoose';

export const validateBankId = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid bank account id' });
  }

  return next();
};

export const rejectRequestBody = (req, res, next) => {
  if (req.body && Object.keys(req.body).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'This demo endpoint does not accept bank credentials or transaction data',
    });
  }

  return next();
};