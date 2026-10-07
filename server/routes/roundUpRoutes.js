import express from 'express';

import {
  calculateRoundUps,
  getHistory,
  getRoundUpSummary,
  getRoundUps,
  invest,
} from '../controllers/roundUpController.js';
import { protect, authorize } from '../middleware/auth.js';
import {
  rejectRoundUpCalculationBody,
  validateInvestRoundUp,
} from '../validators/roundUpValidators.js';

const router = express.Router();

router.use(protect, authorize('investor'));
router.post('/calculate', rejectRoundUpCalculationBody, calculateRoundUps);
router.get('/summary', getRoundUpSummary);
router.post('/invest', validateInvestRoundUp, invest);
router.get('/history', getHistory);
router.get('/', getRoundUps);

export default router;