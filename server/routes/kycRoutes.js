import express from 'express';

import {
  getCurrentKycStatus,
  getKycByUser,
  rejectKyc,
  submitKyc,
  verifyKyc,
} from '../controllers/kycController.js';
import { protect, authorize } from '../middleware/auth.js';
import {
  validateKycRecordId,
  validateKycReview,
  validateKycSubmission,
  validateUserId,
} from '../validators/kycValidators.js';

const router = express.Router();

router.get('/status', protect, authorize('investor', 'admin'), getCurrentKycStatus);
router.post('/submit', protect, authorize('investor'), validateKycSubmission, submitKyc);
router.get('/:userId', protect, authorize('investor', 'admin'), validateUserId, getKycByUser);
router.put('/:id/verify', protect, authorize('admin'), validateKycRecordId, validateKycReview, verifyKyc);
router.put('/:id/reject', protect, authorize('admin'), validateKycRecordId, validateKycReview, rejectKyc);

export default router;
