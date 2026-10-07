import mongoose from 'mongoose';

const allowedTypes = ['DEMO-ID', 'DEMO-BILL', 'DEMO-UTILITY', 'DEMO-PASSPORT'];

export const validateKycSubmission = (req, res, next) => {
  const { fullName, demoDocumentType, demoDocumentNumber } = req.body || {};

  if (typeof fullName !== 'string' || !fullName.trim() || fullName.trim().length > 120) {
    return res.status(400).json({ success: false, message: 'Full name is required and must be shorter than 120 characters' });
  }

  if (typeof demoDocumentType !== 'string' || !allowedTypes.includes(demoDocumentType.trim().toUpperCase())) {
    return res.status(400).json({ success: false, message: 'demoDocumentType must be one of DEMO-ID, DEMO-BILL, DEMO-UTILITY, or DEMO-PASSPORT' });
  }

  if (typeof demoDocumentNumber !== 'string' || !demoDocumentNumber.trim() || demoDocumentNumber.trim().length > 80) {
    return res.status(400).json({ success: false, message: 'demoDocumentNumber is required and must be shorter than 80 characters' });
  }

  req.body.fullName = fullName.trim();
  req.body.demoDocumentType = demoDocumentType.trim().toUpperCase();
  req.body.demoDocumentNumber = demoDocumentNumber.trim();

  return next();
};

export const validateKycReview = (req, res, next) => {
  const { reviewNote } = req.body || {};

  if (typeof reviewNote !== 'string' || !reviewNote.trim() || reviewNote.trim().length > 500) {
    return res.status(400).json({ success: false, message: 'A review note is required and must be shorter than 500 characters' });
  }

  req.body.reviewNote = reviewNote.trim();
  return next();
};

export const validateKycRecordId = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid KYC record id' });
  }

  return next();
};

export const validateUserId = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.userId)) {
    return res.status(400).json({ success: false, message: 'Invalid user id' });
  }

  return next();
};
