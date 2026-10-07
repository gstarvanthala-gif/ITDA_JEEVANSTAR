import express from 'express';

import {
  connectBank,
  deleteBank,
  getBank,
  getTransactions,
  syncTransactions,
} from '../controllers/bankController.js';
import { protect, authorize } from '../middleware/auth.js';
import { rejectRequestBody, validateBankId } from '../validators/bankValidators.js';

const bankRouter = express.Router();
const transactionRouter = express.Router();

bankRouter.use(protect, authorize('investor'));
bankRouter.get('/', getBank);
bankRouter.post('/connect', rejectRequestBody, connectBank);
bankRouter.delete('/:id', validateBankId, deleteBank);

transactionRouter.use(protect, authorize('investor'));
transactionRouter.get('/', getTransactions);
transactionRouter.post('/sync', rejectRequestBody, syncTransactions);

export { bankRouter, transactionRouter };