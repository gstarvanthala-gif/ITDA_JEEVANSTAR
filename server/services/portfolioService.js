import mongoose from 'mongoose';

import MarketData from '../models/MarketData.js';
import Portfolio from '../models/Portfolio.js';
import PortfolioHistory from '../models/PortfolioHistory.js';
import RoundUp from '../models/RoundUp.js';

const SIMULATION_EPOCH = Date.UTC(2026, 0, 1);
const DAY_MS = 24 * 60 * 60 * 1000;
const HISTORY_DAYS = 30;

const SIMULATED_ASSETS = {
  equity: { basePricePaise: 10000, dailyDriftBps: 1.5, waveBps: 35, cycleDays: 37, phase: 0 },
  gold: { basePricePaise: 5000, dailyDriftBps: 0.8, waveBps: 18, cycleDays: 53, phase: 11 },
  debt: { basePricePaise: 1000, dailyDriftBps: 0.25, waveBps: 5, cycleDays: 71, phase: 23 },
};

const amountToPaise = (value) => {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(value));
  if (!match) throw new Error('Portfolio amounts must have at most two decimal places');
  return BigInt(match[1]) * 100n + BigInt((match[2] || '').padEnd(2, '0') || '0');
};

const paiseToAmount = (value) =>
  `${value / 100n}.${String(value % 100n).padStart(2, '0')}`;

const toDecimal128 = (value) => mongoose.Types.Decimal128.fromString(value);

const dateDay = (date) => Math.floor(Date.UTC(
  date.getUTCFullYear(),
  date.getUTCMonth(),
  date.getUTCDate()
) / DAY_MS);

const dayStart = (date) => new Date(Date.UTC(
  date.getUTCFullYear(),
  date.getUTCMonth(),
  date.getUTCDate()
));

export const simulatePricePaise = (assetType, date) => {
  const asset = SIMULATED_ASSETS[assetType];
  if (!asset) throw new Error(`Unknown simulated asset: ${assetType}`);

  const dayIndex = dateDay(date) - Math.floor(SIMULATION_EPOCH / DAY_MS);
  const wave = Math.round(
    Math.sin(((dayIndex + asset.phase) / asset.cycleDays) * Math.PI * 2) * asset.waveBps
  );
  const factorBps = Math.max(100, 10000 + Math.round(dayIndex * asset.dailyDriftBps) + wave);
  return Math.round((asset.basePricePaise * factorBps) / 10000);
};

const makeEmptyPortfolio = (userId, asOf) => ({
  userId,
  totalInvested: '0.00',
  currentValue: '0.00',
  totalProfitLoss: '0.00',
  profitLossPercent: 0,
  holdings: [],
  updatedAt: asOf,
  simulationLabel: 'DEMO simulation values',
});

const resolveMarketPricePaise = (assetType, asOf, marketPrices = {}) => {
  const marketPrice = marketPrices[assetType];
  if (typeof marketPrice === 'number' && Number.isFinite(marketPrice) && marketPrice > 0) {
    return Math.round(marketPrice * 100);
  }
  return simulatePricePaise(assetType, asOf);
};

const getCurrentMarketPricesByAssetType = async () => {
  const items = await MarketData.find({
    assetType: { $in: ['equity', 'gold', 'debt'] },
  }).sort({ updatedAt: 1 }).lean();

  const marketPrices = {};
  for (const item of items) {
    if (!item || !['equity', 'gold', 'debt'].includes(item.assetType)) continue;
    const nextPrice = Number(item.price);
    if (!Number.isFinite(nextPrice) || nextPrice <= 0) continue;
    marketPrices[item.assetType] = nextPrice;
  }

  return marketPrices;
};

export const calculatePortfolioSnapshot = (userId, executions, asOf = new Date(), marketPrices = {}) => {
  const assets = Object.fromEntries(
    Object.keys(SIMULATED_ASSETS).map((assetType) => [
      assetType,
      { investedPaise: 0n, units: 0 },
    ])
  );

  for (const roundUp of executions) {
    const execution = roundUp.allocationExecution;
    if (!execution || new Date(execution.executedAt) > asOf) continue;

    for (const assetType of Object.keys(assets)) {
      const amountPaise = amountToPaise(execution[`${assetType}Amount`].toString());
      const purchasePricePaise = simulatePricePaise(assetType, new Date(execution.executedAt));
      assets[assetType].investedPaise += amountPaise;
      assets[assetType].units += Number(amountPaise) / purchasePricePaise;
    }
  }

  const totals = { investedPaise: 0n, currentPaise: 0n };
  const holdings = [];

  for (const [assetType, position] of Object.entries(assets)) {
    if (position.investedPaise === 0n) continue;

    const currentPricePaise = resolveMarketPricePaise(assetType, asOf, marketPrices);
    const currentValuePaise = BigInt(Math.round(position.units * currentPricePaise));
    const investedAmount = Number(position.investedPaise) / 100;
    const currentValue = Number(currentValuePaise) / 100;
    totals.investedPaise += position.investedPaise;
    totals.currentPaise += currentValuePaise;

    holdings.push({
      assetType,
      units: position.units.toFixed(8),
      averagePrice: (investedAmount / position.units).toFixed(4),
      currentPrice: paiseToAmount(BigInt(currentPricePaise)),
      investedAmount: paiseToAmount(position.investedPaise),
      currentValue: paiseToAmount(currentValuePaise),
      allocationPercent: 0,
    });
  }

  const profitLossPaise = totals.currentPaise - totals.investedPaise;
  const totalInvested = Number(totals.investedPaise) / 100;
  const currentValue = Number(totals.currentPaise) / 100;

  let allocatedBasisPoints = 0;
  holdings.forEach((holding, index) => {
    if (index === holdings.length - 1) {
      holding.allocationPercent = Number(10000 - allocatedBasisPoints) / 100;
      return;
    }

    const holdingValuePaise = amountToPaise(holding.currentValue);
    const basisPoints = totals.currentPaise === 0n
      ? 0
      : Number((holdingValuePaise * 10000n) / totals.currentPaise);
    holding.allocationPercent = basisPoints / 100;
    allocatedBasisPoints += basisPoints;
  });

  return {
    userId,
    totalInvested: paiseToAmount(totals.investedPaise),
    currentValue: paiseToAmount(totals.currentPaise),
    totalProfitLoss: paiseToAmount(profitLossPaise),
    profitLossPercent: totalInvested === 0 ? 0 : Number((((currentValue - totalInvested) / totalInvested) * 100).toFixed(2)),
    holdings,
    updatedAt: asOf,
    simulationLabel: 'DEMO simulation values',
  };
};

const listAllocationExecutions = (userId) =>
  RoundUp.find({ userId, 'allocationExecution.executedAt': { $exists: true } })
    .populate('transactionId', 'merchant amount category transactionDate')
    .sort({ 'allocationExecution.executedAt': 1, _id: 1 });

const persistPortfolioSnapshot = async (snapshot) => {
  return Portfolio.findOneAndUpdate(
    { userId: snapshot.userId },
    {
      $set: {
        totalInvested: toDecimal128(snapshot.totalInvested),
        currentValue: toDecimal128(snapshot.currentValue),
        totalProfitLoss: toDecimal128(snapshot.totalProfitLoss),
        holdings: snapshot.holdings.map((holding) => ({
          ...holding,
          units: toDecimal128(holding.units),
          averagePrice: toDecimal128(holding.averagePrice),
          currentPrice: toDecimal128(holding.currentPrice),
          investedAmount: toDecimal128(holding.investedAmount),
          currentValue: toDecimal128(holding.currentValue),
        })),
      },
      $setOnInsert: { userId: snapshot.userId },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
};

const makeHistorySnapshots = (userId, executions, asOf) => {
  if (executions.length === 0) return [];

  const currentDay = dayStart(asOf);
  const windowStart = new Date(currentDay.getTime() - (HISTORY_DAYS - 1) * DAY_MS);
  const firstExecutionDay = dayStart(new Date(executions[0].allocationExecution.executedAt));
  const beforeFirstExecution = new Date(firstExecutionDay.getTime() - DAY_MS);
  const start = beforeFirstExecution > windowStart ? beforeFirstExecution : windowStart;
  const snapshots = [];

  for (let date = start; date <= currentDay; date = new Date(date.getTime() + DAY_MS)) {
    const endOfDay = new Date(date.getTime() + DAY_MS - 1);
    const snapshot = calculatePortfolioSnapshot(userId, executions, endOfDay);
    snapshots.push({
      userId,
      date,
      investedValue: toDecimal128(snapshot.totalInvested),
      portfolioValue: toDecimal128(snapshot.currentValue),
      profitLoss: toDecimal128(snapshot.totalProfitLoss),
    });
  }

  return snapshots;
};

export const getPortfolioSnapshot = async (userId, asOf = new Date()) => {
  const executions = await listAllocationExecutions(userId);
  const marketPrices = await getCurrentMarketPricesByAssetType();
  const snapshot = calculatePortfolioSnapshot(userId, executions, asOf, marketPrices);
  await persistPortfolioSnapshot(snapshot);
  return snapshot;
};

export const getPortfolioHistory = async (userId, asOf = new Date()) => {
  const executions = await listAllocationExecutions(userId);
  if (executions.length === 0) return [];

  const snapshots = makeHistorySnapshots(userId, executions, asOf);
  const operations = snapshots.map((snapshot) => ({
    updateOne: {
      filter: { userId, date: snapshot.date },
      update: { $set: snapshot },
      upsert: true,
    },
  }));

  try {
    await PortfolioHistory.bulkWrite(operations, { ordered: false });
  } catch (error) {
    const writeErrors = Array.isArray(error.writeErrors) ? error.writeErrors : [];
    const onlyDuplicateKeyErrors = writeErrors.length > 0
      ? writeErrors.every((item) => item.code === 11000)
      : error.code === 11000;
    if (!onlyDuplicateKeyErrors) throw error;
  }

  return PortfolioHistory.find({ userId }).sort({ date: 1 });
};

export const getPortfolioTransactions = (userId) => listAllocationExecutions(userId);