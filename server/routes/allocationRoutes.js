import express from 'express';

import {
  calculate,
  execute,
  getCurrentAllocation,
  history,
  reset,
  update,
} from '../controllers/allocationController.js';
import { protect, authorize } from '../middleware/auth.js';
import {
  rejectAllocationBody,
  validateAllocationExecution,
} from '../validators/allocationValidators.js';

const router = express.Router();

router.use(protect, authorize('investor'));
router.get('/', getCurrentAllocation);
router.post('/calculate', rejectAllocationBody, calculate);
router.put('/', rejectAllocationBody, update);
router.post('/execute', validateAllocationExecution, execute);
router.get('/history', history);
router.post('/reset', rejectAllocationBody, reset);

export default router;