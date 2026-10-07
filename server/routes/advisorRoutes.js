import express from 'express';

import { getAdvisorClient, listAdvisorClients } from '../controllers/advisorController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect, authorize('advisor'));
router.get('/', listAdvisorClients);
router.get('/:id', getAdvisorClient);

export default router;