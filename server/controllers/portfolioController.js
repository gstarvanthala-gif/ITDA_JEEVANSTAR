import {
  getPortfolioHistory as fetchPortfolioHistory,
  getPortfolioSnapshot,
  getPortfolioTransactions as fetchPortfolioTransactions,
} from '../services/portfolioService.js';

const serializePortfolio = (portfolio) => ({
  totalInvested: portfolio.totalInvested,
  currentValue: portfolio.currentValue,
  totalProfitLoss: portfolio.totalProfitLoss,
  profitLossPercent: portfolio.profitLossPercent,
  holdings: portfolio.holdings,
  updatedAt: portfolio.updatedAt,
  simulationLabel: portfolio.simulationLabel,
});

const serializeHistory = (item) => ({
  date: item.date,
  investedValue: item.investedValue.toString(),
  portfolioValue: item.portfolioValue.toString(),
  profitLoss: item.profitLoss.toString(),
});

const serializePortfolioTransaction = (roundUp) => {
  const result = roundUp.toObject();
  for (const field of ['originalAmount', 'roundedAmount', 'roundUpAmount']) {
    result[field] = result[field].toString();
  }
  for (const field of ['equityAmount', 'goldAmount', 'debtAmount']) {
    result.allocationExecution[field] = result.allocationExecution[field].toString();
  }
  return result;
};

export const getPortfolio = async (req, res, next) => {
  try {
    const snapshot = await getPortfolioSnapshot(req.user._id);
    return res.json({ success: true, portfolio: snapshot });
  } catch (error) {
    return next(error);
  }
};

export const getHoldings = async (req, res, next) => {
  try {
    const snapshot = await getPortfolioSnapshot(req.user._id);
    return res.json({ success: true, holdings: snapshot.holdings, simulationLabel: snapshot.simulationLabel });
  } catch (error) {
    return next(error);
  }
};

export const getValue = async (req, res, next) => {
  try {
    const snapshot = await getPortfolioSnapshot(req.user._id);
    return res.json({
      success: true,
      totalInvested: snapshot.totalInvested,
      currentValue: snapshot.currentValue,
      totalProfitLoss: snapshot.totalProfitLoss,
      profitLossPercent: snapshot.profitLossPercent,
      simulationLabel: snapshot.simulationLabel,
    });
  } catch (error) {
    return next(error);
  }
};

export const getHistory = async (req, res, next) => {
  try {
    const history = await fetchPortfolioHistory(req.user._id);
    return res.json({ success: true, history: history.map(serializeHistory), simulationLabel: 'DEMO simulation values' });
  } catch (error) {
    return next(error);
  }
};

export const getPerformance = getHistory;

export const getTransactions = async (req, res, next) => {
  try {
    const transactions = await fetchPortfolioTransactions(req.user._id);
    return res.json({ success: true, transactions: transactions.map(serializePortfolioTransaction) });
  } catch (error) {
    return next(error);
  }
};

export const getSummary = async (req, res, next) => {
  try {
    const snapshot = await getPortfolioSnapshot(req.user._id);
    return res.json({
      success: true,
      summary: serializePortfolio(snapshot),
    });
  } catch (error) {
    return next(error);
  }
};