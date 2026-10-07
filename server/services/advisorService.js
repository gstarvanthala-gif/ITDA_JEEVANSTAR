import mongoose from 'mongoose';

import Goal from '../models/Goal.js';
import RiskProfile from '../models/RiskProfile.js';
import User from '../models/User.js';
import { getPortfolioHistory, getPortfolioSnapshot } from './portfolioService.js';
import { serializeGoal } from './goalService.js';

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const serializeRiskProfile = (riskProfile) => riskProfile && ({
  score: riskProfile.score,
  profile: riskProfile.profile,
  completedAt: riskProfile.completedAt,
  updatedAt: riskProfile.updatedAt,
});

const serializeHistoryItem = (item) => ({
  date: item.date,
  investedValue: item.investedValue.toString(),
  portfolioValue: item.portfolioValue.toString(),
  profitLoss: item.profitLoss.toString(),
});

const buildClientView = async (client) => {
  const [riskProfile, portfolio, history, goals] = await Promise.all([
    RiskProfile.findOne({ userId: client._id }),
    getPortfolioSnapshot(client._id),
    getPortfolioHistory(client._id),
    Goal.find({ userId: client._id }).sort({ targetDate: 1, createdAt: -1 }),
  ]);

  const portfolioSummary = {
    totalInvested: portfolio.totalInvested,
    currentValue: portfolio.currentValue,
    totalProfitLoss: portfolio.totalProfitLoss,
    profitLossPercent: portfolio.profitLossPercent,
    holdingCount: portfolio.holdings.length,
    simulationLabel: 'DEMO simulation values',
  };

  return {
    id: client._id,
    name: client.name,
    email: client.email,
    kycStatus: client.kycStatus,
    riskProfile: serializeRiskProfile(riskProfile),
    portfolio: portfolioSummary,
    performance: {
      history: history.map(serializeHistoryItem),
      profitLossPercent: portfolio.profitLossPercent,
      simulationLabel: 'DEMO simulation values',
    },
    goals: goals.map(serializeGoal),
  };
};

export const getAssignedClients = async (advisorId) => {
  const clients = await User.find({
    advisorId,
    role: 'investor',
    isActive: true,
  })
    .select('name email kycStatus')
    .sort({ name: 1, _id: 1 });

  return Promise.all(clients.map(buildClientView));
};

export const getAssignedClient = async (advisorId, clientId) => {
  if (!mongoose.isValidObjectId(clientId)) {
    throw createHttpError('Invalid client id', 400);
  }

  const client = await User.findOne({
    _id: clientId,
    advisorId,
    role: 'investor',
    isActive: true,
  }).select('name email kycStatus');

  if (!client) throw createHttpError('Assigned client not found', 404);
  return buildClientView(client);
};