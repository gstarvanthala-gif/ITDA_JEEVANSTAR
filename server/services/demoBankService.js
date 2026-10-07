import BankAccount from '../models/BankAccount.js';
import Transaction from '../models/Transaction.js';

const DEMO_TRANSACTIONS = [
  { syncKey: 'coffee-shop-47', merchant: 'Coffee Shop', amount: 47, category: 'food', daysAgo: 0 },
  { syncKey: 'bus-18', merchant: 'Bus', amount: 18, category: 'transport', daysAgo: 1 },
  { syncKey: 'grocery-126', merchant: 'Grocery', amount: 126, category: 'groceries', daysAgo: 2 },
  { syncKey: 'restaurant-83', merchant: 'Restaurant', amount: 83, category: 'dining', daysAgo: 3 },
  { syncKey: 'fuel-241', merchant: 'Fuel', amount: 241, category: 'fuel', daysAgo: 4 },
];

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

export const getBankAccount = (userId) => BankAccount.findOne({ userId });

export const connectDemoBank = async (userId) => {
  const existingAccount = await BankAccount.findOne({ userId });

  if (existingAccount) {
    existingAccount.status = 'connected';
    await existingAccount.save();
    return { bankAccount: existingAccount, created: false };
  }

  const suffix = Math.floor(1000 + Math.random() * 9000);

  try {
    const bankAccount = await BankAccount.create({
      userId,
      bankName: 'MicroGrow Demo Bank',
      maskedAccountNumber: `DEMO-****-${suffix}`,
    });

    return { bankAccount, created: true };
  } catch (error) {
    if (error.code !== 11000) throw error;

    const bankAccount = await BankAccount.findOne({ userId });
    return { bankAccount, created: false };
  }
};

export const disconnectDemoBank = (accountId, userId) =>
  BankAccount.findOneAndUpdate(
    { _id: accountId, userId },
    { $set: { status: 'disconnected' } },
    { new: true, runValidators: true }
  );

export const listTransactions = (userId) =>
  Transaction.find({ userId }).sort({ transactionDate: -1, _id: -1 });

export const syncDemoTransactions = async (userId) => {
  const bankAccount = await BankAccount.findOne({ userId, status: 'connected' });

  if (!bankAccount) {
    throw createHttpError('Connect a demo bank before syncing transactions', 409);
  }

  const now = new Date();
  const operations = DEMO_TRANSACTIONS.map((transaction) => {
    const transactionDate = new Date(now);
    transactionDate.setDate(transactionDate.getDate() - transaction.daysAgo);
    transactionDate.setHours(12, 0, 0, 0);

    return {
      updateOne: {
        filter: { userId, source: 'demo', syncKey: transaction.syncKey },
        update: {
          $setOnInsert: {
            userId,
            bankAccountId: bankAccount._id,
            merchant: transaction.merchant,
            amount: transaction.amount,
            category: transaction.category,
            transactionDate,
            source: 'demo',
            syncKey: transaction.syncKey,
          },
        },
        upsert: true,
      },
    };
  });

  let addedCount = 0;

  try {
    const result = await Transaction.bulkWrite(operations, { ordered: false });
    addedCount = result.upsertedCount;
  } catch (error) {
    const writeErrors = Array.isArray(error.writeErrors) ? error.writeErrors : [];
    const onlyDuplicateKeyErrors = writeErrors.length > 0
      ? writeErrors.every((item) => item.code === 11000)
      : error.code === 11000;

    if (!onlyDuplicateKeyErrors) {
      throw error;
    }
  }

  return {
    addedCount,
    transactions: await listTransactions(userId),
  };
};