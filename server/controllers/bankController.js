import {
  connectDemoBank,
  disconnectDemoBank,
  getBankAccount,
  listTransactions,
  syncDemoTransactions,
} from '../services/demoBankService.js';

export const getBank = async (req, res, next) => {
  try {
    const bankAccount = await getBankAccount(req.user._id);
    return res.json({ success: true, bankAccount });
  } catch (error) {
    return next(error);
  }
};

export const connectBank = async (req, res, next) => {
  try {
    const { bankAccount, created } = await connectDemoBank(req.user._id);
    return res.status(created ? 201 : 200).json({
      success: true,
      bankAccount,
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteBank = async (req, res, next) => {
  try {
    const bankAccount = await disconnectDemoBank(req.params.id, req.user._id);

    if (!bankAccount) {
      return res.status(404).json({ success: false, message: 'Demo bank account not found' });
    }

    return res.json({ success: true, bankAccount });
  } catch (error) {
    return next(error);
  }
};

export const getTransactions = async (req, res, next) => {
  try {
    const transactions = await listTransactions(req.user._id);
    return res.json({ success: true, transactions });
  } catch (error) {
    return next(error);
  }
};

export const syncTransactions = async (req, res, next) => {
  try {
    const { addedCount, transactions } = await syncDemoTransactions(req.user._id);
    return res.json({ success: true, addedCount, transactions });
  } catch (error) {
    return next(error);
  }
};