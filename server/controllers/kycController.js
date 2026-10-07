import {
  getKycRecordByUser,
  getKycStatus,
  submitKYC,
  updateKycStatus,
} from '../services/kycService.js';

export const submitKyc = async (req, res, next) => {
  try {
    const kyc = await submitKYC(req.user._id, req.body || {});
    return res.status(201).json({ success: true, kyc });
  } catch (error) {
    return next(error);
  }
};

export const getCurrentKycStatus = async (req, res, next) => {
  try {
    const result = await getKycStatus(req.user._id);
    return res.json({
      success: true,
      kyc: {
        userId: result.userId,
        status: result.status,
        _id: result.record?._id || null,
        fullName: result.record?.fullName || null,
        demoDocumentType: result.record?.demoDocumentType || null,
        demoDocumentNumber: result.record?.demoDocumentNumber || null,
        reviewNote: result.record?.reviewNote || '',
        reviewedAt: result.record?.reviewedAt || null,
        submittedAt: result.record?.submittedAt || null,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const getKycByUser = async (req, res, next) => {
  try {
    const kyc = await getKycRecordByUser(req.user, req.params.userId);
    return res.json({ success: true, kyc });
  } catch (error) {
    return next(error);
  }
};

export const verifyKyc = async (req, res, next) => {
  try {
    const result = await updateKycStatus({
      reviewerId: req.user._id,
      recordId: req.params.id,
      status: 'verified',
      reviewNote: req.body?.reviewNote,
    });
    return res.json({ success: true, kyc: result });
  } catch (error) {
    return next(error);
  }
};

export const rejectKyc = async (req, res, next) => {
  try {
    const result = await updateKycStatus({
      reviewerId: req.user._id,
      recordId: req.params.id,
      status: 'rejected',
      reviewNote: req.body?.reviewNote,
    });
    return res.json({ success: true, kyc: result });
  } catch (error) {
    return next(error);
  }
};
