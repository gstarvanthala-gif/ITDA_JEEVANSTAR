import express from 'express';

import {
  getAdvisors,
  getKycRecords,
  getMarketData,
  getNotifications,
  getOverview,
  getTransactions,
  getUsers,
} from '../controllers/adminController.js';
import { authorize, protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect, authorize('admin'));
router.get('/overview', getOverview);
router.get('/users', getUsers);
router.get('/advisors', getAdvisors);
router.get('/transactions', getTransactions);
router.get('/kyc', getKycRecords);
router.get('/market', getMarketData);
router.get('/notifications', getNotifications);

export default router;