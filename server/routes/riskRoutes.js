import express from 'express';

import {
  getProfile,
  getQuestions,
  recalculate,
  submitAssessment,
} from '../controllers/riskController.js';
import { protect, authorize } from '../middleware/auth.js';
import {
  rejectRiskRecalculationBody,
  validateRiskSubmission,
} from '../validators/riskValidators.js';

const router = express.Router();

router.use(protect, authorize('investor'));
router.get('/questions', getQuestions);
router.post('/submit', validateRiskSubmission, submitAssessment);
router.get('/profile', getProfile);
router.put('/recalculate', rejectRiskRecalculationBody, recalculate);

export default router;