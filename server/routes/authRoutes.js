import express from 'express';

import {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser,
} from '../controllers/authController.js';
import { loginRateLimiter } from '../middleware/authRateLimit.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginRateLimiter, loginUser);
router.get('/me', protect, getCurrentUser);
router.post('/logout', protect, logoutUser);

export default router;
