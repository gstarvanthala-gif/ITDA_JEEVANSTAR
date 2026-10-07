import express from 'express';

import {
  deleteNotification,
  getNotifications,
  markAllRead,
  markRead,
} from '../controllers/notificationController.js';
import { protect } from '../middleware/auth.js';
import {
  rejectNotificationBody,
  validateNotificationId,
} from '../validators/notificationValidators.js';

const router = express.Router();

router.use(protect);
router.get('/', getNotifications);
router.put('/read-all', rejectNotificationBody, markAllRead);
router.put('/:id/read', validateNotificationId, rejectNotificationBody, markRead);
router.delete('/:id', validateNotificationId, deleteNotification);

export default router;