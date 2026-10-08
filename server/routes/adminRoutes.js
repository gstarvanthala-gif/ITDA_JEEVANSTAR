import express from 'express';

import {
  createAdminNotification,
  deleteAdminNotification,
  getAdvisors,
  getKycRecords,
  getMarketData,
  getNotifications,
  getOverview,
  getTransactions,
  getUserDetails,
  getUsers,
  removeInvestorAdvisor,
  updateInvestorAdvisor,
  updateUserStatus,
} from '../controllers/adminController.js';
import { authorize, protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect, authorize('admin'));
router.get('/overview', getOverview);
router.get('/users', getUsers);
router.get('/users/:userId', getUserDetails);
router.put('/users/:userId/status', updateUserStatus);
router.get('/advisors', getAdvisors);
router.put('/investors/:investorId/advisor', updateInvestorAdvisor);
router.delete('/investors/:investorId/advisor', removeInvestorAdvisor);
router.get('/transactions', getTransactions);
router.get('/kyc', getKycRecords);
router.get('/market', getMarketData);
router.get('/notifications', getNotifications);
router.post('/notifications', createAdminNotification);
router.delete('/notifications/:id', deleteAdminNotification);

export default router;