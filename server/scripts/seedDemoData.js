import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import connectDB from '../config/db.js';
import BankAccount from '../models/BankAccount.js';
import Goal from '../models/Goal.js';
import KYCRecord from '../models/KYCRecord.js';
import MarketData from '../models/MarketData.js';
import Message from '../models/Message.js';
import Notification from '../models/Notification.js';
import Portfolio from '../models/Portfolio.js';
import RoundUp from '../models/RoundUp.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import { calculateAllocation, executeAllocation } from '../services/allocationService.js';
import { getPortfolioHistory, getPortfolioSnapshot } from '../services/portfolioService.js';
import { calculateRoundUp } from '../services/roundUpService.js';
import { submitRiskAssessment } from '../services/riskService.js';

const serverDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: resolve(serverDirectory, '.env') });

const SEED_PREFIX = 'seed-demo-v1';
const decimal = (value) => mongoose.Types.Decimal128.fromString(String(value));
const upsertOnInsert = (model, filter, document) => model.findOneAndUpdate(
  filter,
  { $setOnInsert: document },
  { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
);

const demoUsers = [
  { key: 'investor-1', name: 'Mira Rao', email: 'investor@microgrow.demo', role: 'investor' },
  { key: 'investor-2', name: 'Arjun Das', email: 'investor2@microgrow.demo', role: 'investor' },
  { key: 'advisor', name: 'Nila Sen', email: 'advisor@microgrow.demo', role: 'advisor' },
  { key: 'admin', name: 'Dev Admin', email: 'admin@microgrow.demo', role: 'admin' },
];

const transactionFixtures = [
  { merchant: 'Coffee Shop', amount: 47, category: 'food' },
  { merchant: 'City Bus', amount: 18, category: 'transport' },
  { merchant: 'Green Market', amount: 126, category: 'groceries' },
  { merchant: 'Corner Cafe', amount: 83, category: 'dining' },
  { merchant: 'Demo Fuel Stop', amount: 120, category: 'fuel' },
  { merchant: 'Morning Bakery', amount: 63, category: 'food' },
  { merchant: 'Metro Ticket', amount: 32, category: 'transport' },
  { merchant: 'Fresh Basket', amount: 95, category: 'groceries' },
  { merchant: 'Lunch Room', amount: 74, category: 'dining' },
  { merchant: 'Demo Pharmacy', amount: 51, category: 'other' },
];

const riskAnswers = {
  'investor-1': {
    investmentHorizon: 'oneToThreeYears',
    marketDrop: 'wait',
    priority: 'balanced',
    experience: 'some',
    volatilityComfort: 'neutral',
  },
  'investor-2': {
    investmentHorizon: 'fiveToTenYears',
    marketDrop: 'stayInvested',
    priority: 'growth',
    experience: 'good',
    volatilityComfort: 'comfortable',
  },
};

const marketFixtures = [
  { symbol: 'DEMO-EQ', name: 'Demo Equity Basket', assetType: 'equity', price: '102.40', changePercent: '1.25' },
  { symbol: 'DEMO-GOLD', name: 'Demo Gold Basket', assetType: 'gold', price: '58.75', changePercent: '0.42' },
  { symbol: 'DEMO-DEBT', name: 'Demo Debt Basket', assetType: 'debt', price: '10.18', changePercent: '0.08' },
];

const seedUser = async (fixture, passwordHash) => User.findOneAndUpdate(
  { email: fixture.email },
  {
    $set: {
      name: fixture.name,
      role: fixture.role,
      passwordHash,
      isActive: true,
    },
    $setOnInsert: { email: fixture.email, kycStatus: 'pending' },
  },
  { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
);

const seedBank = (userId, suffix) => upsertOnInsert(BankAccount, { userId }, {
  userId,
  bankName: 'MicroGrow Demo Bank',
  maskedAccountNumber: `DEMO-****-${suffix}`,
  virtualBalance: 25000,
  status: 'connected',
});

const seedTransaction = async (userId, bankAccountId, fixture, key, sequence) => {
  const transactionDate = new Date(Date.now() - (10 - sequence) * 24 * 60 * 60 * 1000);
  return upsertOnInsert(Transaction, {
    userId,
    source: 'demo',
    syncKey: `${SEED_PREFIX}-${key}-transaction-${sequence}`,
  }, {
    userId,
    bankAccountId,
    merchant: fixture.merchant,
    amount: fixture.amount,
    category: fixture.category,
    transactionDate,
    source: 'demo',
    syncKey: `${SEED_PREFIX}-${key}-transaction-${sequence}`,
  });
};

const seedMarketData = async () => {
  for (const fixture of marketFixtures) {
    await MarketData.findOneAndUpdate(
      { symbol: fixture.symbol },
      {
        $set: {
          ...fixture,
          price: decimal(fixture.price),
          changePercent: decimal(fixture.changePercent),
          source: 'simulation',
        },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
  }
};

const seedGoal = async (userId, name, targetAmount, daysUntilTarget) => {
  const legacyName = `${SEED_PREFIX} ${name}`;
  const legacyGoal = await Goal.findOne({ userId, name: legacyName });
  const namedGoal = await Goal.findOne({ userId, name });

  if (legacyGoal && !namedGoal) {
    legacyGoal.name = name;
    await legacyGoal.save();
  } else if (legacyGoal && namedGoal) {
    await Goal.deleteOne({ _id: legacyGoal._id });
  }

  return upsertOnInsert(Goal, { userId, name }, {
    userId,
    name,
    targetAmount: decimal(targetAmount),
    currentAmount: decimal('0.00'),
    targetDate: new Date(Date.now() + daysUntilTarget * 24 * 60 * 60 * 1000),
    status: 'active',
  });
};

const seedKycRecord = (user, status, reviewerId = null) => upsertOnInsert(
  KYCRecord,
  { userId: user._id },
  {
    userId: user._id,
    fullName: user.name,
    demoDocumentType: 'Fictional demo card',
    demoDocumentNumber: `DEMO-ONLY-${user._id.toString().slice(-6)}`,
    status,
    reviewerId,
    reviewNote: '',
    submittedAt: new Date(),
  }
);

const seedNotification = (userId, fixture) => upsertOnInsert(
  Notification,
  { userId, eventKey: `${SEED_PREFIX}-${fixture.eventKey}` },
  {
    userId,
    title: fixture.title,
    message: fixture.message,
    type: fixture.type,
    eventKey: `${SEED_PREFIX}-${fixture.eventKey}`,
    isRead: false,
    metadata: { source: 'demo-seed' },
  }
);

const seedMessage = (senderId, receiverId, message, isRead) => upsertOnInsert(
  Message,
  { senderId, receiverId, message },
  { senderId, receiverId, message, isRead }
);

const seedInvestor = async (investor, advisor, reviewerId, investorKey, index) => {
  await User.updateOne({ _id: investor._id }, { $set: { advisorId: advisor._id } });
  await seedBank(investor._id, `10${index}`);
  const bankAccount = await BankAccount.findOne({ userId: investor._id });
  const transactionSet = transactionFixtures.slice((index - 1) * 5, index * 5);
  const transactions = [];

  for (let transactionIndex = 0; transactionIndex < transactionSet.length; transactionIndex += 1) {
    transactions.push(await seedTransaction(
      investor._id,
      bankAccount._id,
      transactionSet[transactionIndex],
      investorKey,
      transactionIndex + 1
    ));
  }

  await submitRiskAssessment(investor._id, riskAnswers[investorKey]);
  await calculateAllocation(investor._id);

  for (const transaction of transactions) {
    const calculation = calculateRoundUp(transaction.amount);
    await upsertOnInsert(RoundUp, { userId: investor._id, transactionId: transaction._id }, {
      userId: investor._id,
      transactionId: transaction._id,
      originalAmount: decimal(calculation.originalAmount),
      roundedAmount: decimal(calculation.roundedAmount),
      roundUpAmount: decimal(calculation.roundUpAmount),
      status: calculation.hasRoundUp ? 'pending' : 'skipped',
    });
  }

  const firstSeededRoundUp = await RoundUp.findOne({
    userId: investor._id,
    transactionId: transactions[0]._id,
  });
  if (firstSeededRoundUp && !firstSeededRoundUp.allocationExecution) {
    await executeAllocation(investor._id, firstSeededRoundUp._id);
  }

  await seedGoal(investor._id, index === 1 ? 'Bike Goal' : 'Learning Fund', index === 1 ? '18000.00' : '9000.00', 210 + index * 30);
  const kycStatus = index === 1 ? 'pending' : 'verified';
  const kycRecord = await seedKycRecord(investor, kycStatus, index === 1 ? null : reviewerId);
  await User.updateOne({ _id: investor._id }, { $set: { kycStatus: kycRecord.status } });
  await seedNotification(investor._id, {
    eventKey: 'welcome',
    title: 'Demo profile ready',
    message: 'Your MicroGrow account is populated with fictional simulation data.',
    type: 'portfolio_updated',
  });

  const portfolio = await getPortfolioSnapshot(investor._id);
  await getPortfolioHistory(investor._id);
  return { transactions, portfolio };
};

const seedDemoData = async () => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Demo seeding is disabled in production.');
  }
  if (process.env.DEMO_SEED_ENABLED !== 'true') {
    throw new Error('Set DEMO_SEED_ENABLED=true in the local environment to enable demo seeding.');
  }

  const password = process.env.DEMO_SEED_PASSWORD;
  if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('Set DEMO_SEED_PASSWORD to a local-only password between 8 and 72 UTF-8 bytes.');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await connectDB();

  const users = {};
  for (const fixture of demoUsers) users[fixture.key] = await seedUser(fixture, passwordHash);

  await seedMarketData();
  const investorOne = await seedInvestor(users['investor-1'], users.advisor, users.admin._id, 'investor-1', 1);
  const investorTwo = await seedInvestor(users['investor-2'], users.advisor, users.admin._id, 'investor-2', 2);

  await seedMessage(
    users.advisor._id,
    users['investor-1']._id,
    'Welcome to the demo workspace. Your portfolio and goals use fictional values.',
    false
  );
  await seedMessage(
    users['investor-1']._id,
    users.advisor._id,
    'Thanks. I have reviewed the simulated round-up and goal examples.',
    true
  );
  await seedMessage(
    users.advisor._id,
    users['investor-2']._id,
    'Your demo risk profile and virtual allocation are ready to explore.',
    false
  );

  const transactionCount = await Transaction.countDocuments({ syncKey: new RegExp(`^${SEED_PREFIX}-`) });
  const roundupCount = await RoundUp.countDocuments({ userId: { $in: [users['investor-1']._id, users['investor-2']._id] } });
  const goalCount = await Goal.countDocuments({
    userId: { $in: [users['investor-1']._id, users['investor-2']._id] },
    name: { $in: ['Bike Goal', 'Learning Fund'] },
  });

  console.log('Demo seed data ensured (safe to rerun):');
  console.log(`- Users: ${demoUsers.length} (1 admin, 1 advisor, 2 investors)`);
  console.log(`- Seed transactions: ${transactionCount}`);
  console.log(`- Round-ups for demo investors: ${roundupCount}`);
  console.log('- Simulated market assets: 3');
  console.log(`- Seed goals: ${goalCount}`);
  console.log(`- Portfolio snapshots: ${[investorOne.portfolio, investorTwo.portfolio].length}`);
  console.log('- Mock KYC records, notifications, and advisor messages ensured');
  console.log('Demo accounts share the password provided in DEMO_SEED_PASSWORD.');
  console.log(`Accounts: ${demoUsers.map(({ email }) => email).join(', ')}`);
};

try {
  await seedDemoData();
} catch (error) {
  console.error(`Demo seeding failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}
