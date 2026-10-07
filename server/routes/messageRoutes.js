import express from 'express';

import {
  deleteMessage,
  getMessages,
  markRead,
  postMessage,
} from '../controllers/messageController.js';
import { protect, authorize } from '../middleware/auth.js';
import {
  rejectMessageRequestBody,
  validateConversationUserId,
  validateMessageBody,
  validateMessageId,
} from '../validators/messageValidators.js';

const router = express.Router();

router.use(protect, authorize('investor', 'advisor'));
router.get('/:userId', validateConversationUserId, getMessages);
router.post('/', validateMessageBody, postMessage);
router.put('/:id/read', validateMessageId, rejectMessageRequestBody, markRead);
router.delete('/:id', validateMessageId, rejectMessageRequestBody, deleteMessage);

export default router;