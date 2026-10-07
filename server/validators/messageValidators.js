import mongoose from 'mongoose';

const MAX_MESSAGE_LENGTH = 2000;

export const validateConversationUserId = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.userId)) {
    return res.status(400).json({ success: false, message: 'Invalid conversation user id' });
  }

  return next();
};

export const validateMessageBody = (req, res, next) => {
  const body = req.body || {};
  const keys = Object.keys(body);

  if (
    keys.length !== 2 ||
    !Object.hasOwn(body, 'receiverId') ||
    !Object.hasOwn(body, 'message') ||
    typeof body.receiverId !== 'string' ||
    !mongoose.isValidObjectId(body.receiverId) ||
    typeof body.message !== 'string' ||
    !body.message.trim() ||
    body.message.trim().length > MAX_MESSAGE_LENGTH
  ) {
    return res.status(400).json({
      success: false,
      message: `receiverId and a message of 1-${MAX_MESSAGE_LENGTH} characters are required`,
    });
  }

  return next();
};

export const validateMessageId = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid message id' });
  }

  return next();
};

export const rejectMessageRequestBody = (req, res, next) => {
  if (req.body && Object.keys(req.body).length > 0) {
    return res.status(400).json({ success: false, message: 'This endpoint does not accept request data' });
  }

  return next();
};