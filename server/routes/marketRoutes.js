import express from 'express';

import {
  createMarket,
  deleteMarket,
  getSingleMarketItem,
  listMarket,
  updateMarket,
} from '../controllers/marketController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, authorize('investor', 'admin'), listMarket);
router.get('/:symbol', protect, authorize('investor', 'admin'), getSingleMarketItem);
router.post('/', protect, authorize('admin'), createMarket);
router.put('/:id', protect, authorize('admin'), updateMarket);
router.delete('/:id', protect, authorize('admin'), deleteMarket);

export default router;
