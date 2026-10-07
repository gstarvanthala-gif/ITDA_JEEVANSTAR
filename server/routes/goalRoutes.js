import express from 'express';

import {
  createGoal,
  deleteGoal,
  getGoal,
  getGoals,
  updateGoal,
} from '../controllers/goalController.js';
import { protect, authorize } from '../middleware/auth.js';
import {
  validateGoalBody,
  validateGoalId,
  validateNewGoalBody,
} from '../validators/goalValidators.js';

const router = express.Router();

router.use(protect, authorize('investor'));
router.route('/')
  .post(validateNewGoalBody, createGoal)
  .get(getGoals);
router.route('/:id')
  .get(validateGoalId, getGoal)
  .put(validateGoalId, validateGoalBody, updateGoal)
  .delete(validateGoalId, deleteGoal);

export default router;