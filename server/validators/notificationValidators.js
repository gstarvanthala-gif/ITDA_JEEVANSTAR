import mongoose from 'mongoose';

export const validateNotificationId = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid notification id' });
  }

  return next();
};

export const rejectNotificationBody = (req, res, next) => {
  if (req.body && Object.keys(req.body).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Notification state is managed by the server',
    });
  }

  return next();
};