import express from 'express';

import {
  getHistory,
  getHoldings,
  getPerformance,
  getPortfolio,
  getSummary,
  getTransactions,
  getValue,
} from '../controllers/portfolioController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect, authorize('investor'));
router.get('/', getPortfolio);
router.get('/holdings', getHoldings);
router.get('/value', getValue);
router.get('/history', getHistory);
router.get('/performance', getPerformance);
router.get('/transactions', getTransactions);
router.get('/summary', getSummary);

export default router;