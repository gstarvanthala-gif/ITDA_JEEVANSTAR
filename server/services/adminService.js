import mongoose from 'mongoose';

import Goal from '../models/Goal.js';
import KYCRecord from '../models/KYCRecord.js';
import MarketData from '../models/MarketData.js';
import Notification from '../models/Notification.js';
import Portfolio from '../models/Portfolio.js';
import RoundUp from '../models/RoundUp.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';

const PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const parseDateFilter = (value, name) => {
  if (value === undefined) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw createHttpError(`${name} must be a valid YYYY-MM-DD date`, 400);
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw createHttpError(`${name} must be a valid YYYY-MM-DD date`, 400);
  }
  return date;
};

const getPage = (query) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(query.limit, 10) || PAGE_SIZE));
  const search = typeof query.search === 'string' ? query.search.trim().slice(0, 100) : '';

  return { page, limit, search };
};

const pagedResult = async ({ model, filter, page, limit, projection, populate, sort = { createdAt: -1 } }) => {
  const [items, total] = await Promise.all([
    model.find(filter)
      .select(projection)
      .populate(populate || [])
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    model.countDocuments(filter),
  ]);

  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getAdminOverview = async () => {
  const [
    totalUsers,
    investors,
    advisors,
    roundUps,
    portfolioPositions,
    currentMarketPrices,
    pendingKyc,
    verifiedKyc,
    activeGoals,
    activeAdvisors,
    marketAssets,
    transactionCount,
    recentTransactions,
    recentNotifications,
    unreadNotifications,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'investor' }),
    User.countDocuments({ role: 'advisor' }),
    RoundUp.countDocuments(),
    Portfolio.find({}).select('holdings.assetType holdings.units holdings.currentValue').lean(),
    MarketData.find({ assetType: { $in: ['equity', 'gold', 'debt'] } })
      .select('assetType price updatedAt')
      .sort({ updatedAt: 1 })
      .lean(),
    KYCRecord.countDocuments({ status: 'pending' }),
    KYCRecord.countDocuments({ status: 'verified' }),
    Goal.countDocuments({ status: 'active' }),
    User.countDocuments({ role: 'advisor', isActive: true }),
    MarketData.countDocuments(),
    Transaction.countDocuments(),
    Transaction.find({}).sort({ createdAt: -1 }).limit(5).select('merchant amount category transactionDate userId').populate({ path: 'userId', select: 'name email' }).lean(),
    Notification.find({}).sort({ createdAt: -1 }).limit(5).select('title message type isRead createdAt userId').populate({ path: 'userId', select: 'name email' }).lean(),
    Notification.countDocuments({ isRead: false }),
  ]);

  const pricesByAssetType = {};
  for (const item of currentMarketPrices) {
    const price = Number(item.price);
    if (Number.isFinite(price) && price > 0) pricesByAssetType[item.assetType] = price;
  }
  const portfolioValuePaise = portfolioPositions.reduce((total, portfolio) => {
    for (const holding of portfolio.holdings || []) {
      const units = Number(holding.units);
      const price = pricesByAssetType[holding.assetType];
      const currentValue = Number.isFinite(units) && price
        ? units * price
        : Number(holding.currentValue);
      if (Number.isFinite(currentValue) && currentValue >= 0) {
        total += BigInt(Math.round(currentValue * 100));
      }
    }
    return total;
  }, 0n);

  return {
    totalUsers,
    totalInvestors: investors,
    totalAdvisors: advisors,
    totalRoundUps: roundUps,
    totalTransactions: transactionCount,
    virtualPortfolioValue: Number(portfolioValuePaise) / 100,
    pendingKyc,
    verifiedKyc,
    activeAdvisors,
    simulatedAssets: marketAssets,
    recentTransactions: recentTransactions.map((item) => ({
      ...item,
      amount: Number(item.amount),
      userId: item.userId ? { ...item.userId, id: item.userId._id } : null,
    })),
    recentNotifications: recentNotifications.map((item) => ({
      ...item,
      userId: item.userId ? { ...item.userId, id: item.userId._id } : null,
    })),
    activeGoals,
    unreadNotifications,
  };
};

export const listAdminUsers = async (query = {}, role = null) => {
  const { page, limit, search } = getPage(query);
  const filter = {};
  if (query.role !== undefined && !['investor', 'advisor', 'admin'].includes(query.role)) {
    throw createHttpError('role filter is invalid', 400);
  }
  if (query.status !== undefined && !['active', 'inactive'].includes(query.status)) {
    throw createHttpError('status filter is invalid', 400);
  }
  if (query.assignment !== undefined && !['assigned', 'unassigned'].includes(query.assignment)) {
    throw createHttpError('assignment filter is invalid', 400);
  }

  if (role) filter.role = role;
  else if (['investor', 'advisor', 'admin'].includes(query.role)) filter.role = query.role;
  if (query.assignment) {
    if (filter.role && filter.role !== 'investor') {
      throw createHttpError('assignment filter is only available for investors', 400);
    }
    filter.role = 'investor';
    filter.advisorId = query.assignment === 'assigned' ? { $ne: null } : null;
  }
  if (query.status === 'active') filter.isActive = true;
  if (query.status === 'inactive') filter.isActive = false;
  if (search) {
    const matcher = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: matcher }, { email: matcher }];
  }

  const result = await pagedResult({
    model: User,
    filter,
    page,
    limit,
    projection: 'name email role kycStatus isActive advisorId createdAt',
    populate: [{ path: 'advisorId', select: 'name email' }],
    sort: { createdAt: -1 },
  });

  if (role === 'advisor') {
    const advisorIds = result.items.map((item) => item._id);
    const counts = await User.aggregate([
      { $match: { role: 'investor', advisorId: { $in: advisorIds } } },
      { $group: { _id: '$advisorId', count: { $sum: 1 } } },
    ]);
    const countsByAdvisor = Object.fromEntries(counts.map(({ _id, count }) => [String(_id), count]));
    result.items = result.items.map((item) => ({
      ...item,
      assignedInvestorCount: countsByAdvisor[String(item._id)] || 0,
    }));
  }

  return result;
};

export const getAdminUserDetails = async (userId) => {
  if (!mongoose.isValidObjectId(userId)) {
    throw createHttpError('Valid user ID is required', 400);
  }

  const user = await User.findById(userId)
    .select('name email role kycStatus isActive advisorId createdAt updatedAt')
    .populate({ path: 'advisorId', select: 'name email isActive' })
    .lean();
  if (!user) throw createHttpError('User not found', 404);

  const [transactionCount, portfolio, unreadNotifications] = await Promise.all([
    Transaction.countDocuments({ userId }),
    Portfolio.findOne({ userId }).select('totalInvested currentValue totalProfitLoss').lean(),
    Notification.countDocuments({ userId, isRead: false }),
  ]);

  return {
    user,
    activity: {
      transactionCount,
      unreadNotifications,
      portfolio: portfolio ? {
        totalInvested: String(portfolio.totalInvested),
        currentValue: String(portfolio.currentValue),
        totalProfitLoss: String(portfolio.totalProfitLoss),
      } : null,
    },
  };
};

export const assignInvestorAdvisor = async (investorId, advisorId) => {
  if (!mongoose.isValidObjectId(investorId)) {
    const error = new Error('Valid investor ID is required');
    error.statusCode = 400;
    throw error;
  }

  const investor = await User.findById(investorId).select('role isActive advisorId');
  if (!investor || investor.role !== 'investor') {
    const error = new Error('Investor not found');
    error.statusCode = 404;
    throw error;
  }

  if (advisorId === null || advisorId === undefined || String(advisorId).trim() === '') {
    investor.advisorId = null;
    await investor.save();
    return investor;
  }

  if (!mongoose.isValidObjectId(advisorId)) {
    const error = new Error('Valid advisor ID is required');
    error.statusCode = 400;
    throw error;
  }

  const advisor = await User.findOne({ _id: advisorId, role: 'advisor', isActive: true }).select('_id role isActive');
  if (!advisor) {
    const error = new Error('Advisor not found or inactive');
    error.statusCode = 404;
    throw error;
  }

  investor.advisorId = advisor._id;
  await investor.save();

  return investor;
};

export const setUserStatus = async (userId, isActive, actorId) => {
  if (!mongoose.isValidObjectId(userId)) {
    const error = new Error('Valid user ID is required');
    error.statusCode = 400;
    throw error;
  }

  if (typeof isActive !== 'boolean') {
    const error = new Error('isActive must be a boolean');
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findById(userId).select('name email role isActive');
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  if (!isActive && String(user._id) === String(actorId)) {
    throw createHttpError('Admins cannot deactivate their own account', 409);
  }

  if (!isActive && user.role === 'admin') {
    const activeAdminCount = await User.countDocuments({ role: 'admin', isActive: true });
    if (activeAdminCount <= 1) {
      throw createHttpError('The last active admin cannot be deactivated', 409);
    }
  }

  if (user.isActive && !isActive) user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  user.isActive = isActive;
  await user.save();
  return user;
};

export const createPlatformNotification = async (payload = {}) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw createHttpError('A notification request is required', 400);
  }
  const { audience, title, message, type = 'portfolio_updated' } = payload;
  if (!['all-investors', 'all-advisors', 'all-users'].includes(audience)) {
    const error = new Error('Audience is invalid');
    error.statusCode = 400;
    throw error;
  }

  if (typeof title !== 'string' || !title.trim()) {
    const error = new Error('Notification title is required');
    error.statusCode = 400;
    throw error;
  }

  if (typeof message !== 'string' || !message.trim()) {
    const error = new Error('Notification message is required');
    error.statusCode = 400;
    throw error;
  }
  if (title.trim().length > 120 || message.trim().length > 500) {
    throw createHttpError('Notification title or message exceeds the allowed length', 400);
  }

  if (!['portfolio_updated', 'goal_completed', 'roundup_invested', 'kyc_verified', 'advisor_message'].includes(type)) {
    const error = new Error('Notification type is invalid');
    error.statusCode = 400;
    throw error;
  }

  const roleFilter = {
    'all-investors': { role: 'investor' },
    'all-advisors': { role: 'advisor' },
    'all-users': {},
  }[audience];

  const users = await User.find(roleFilter).select('_id').lean();
  if (!users.length) {
    return { count: 0, notifications: [] };
  }

  const eventKey = `admin-broadcast:${Date.now()}`;
  const notifications = await Promise.all(users.map((user) => Notification.create({
    userId: user._id,
    title: title.trim(),
    message: message.trim(),
    type,
    eventKey: `${eventKey}:${user._id}`,
    metadata: { audience, createdBy: 'admin' },
  })));

  return { count: notifications.length, notifications };
};

export const deletePlatformNotification = async (notificationId) => {
  if (!mongoose.isValidObjectId(notificationId)) {
    const error = new Error('Valid notification ID is required');
    error.statusCode = 400;
    throw error;
  }

  const deleted = await Notification.findOneAndDelete({
    _id: notificationId,
    'metadata.createdBy': 'admin',
  });
  if (!deleted) {
    const error = new Error('Notification not found');
    error.statusCode = 404;
    throw error;
  }

  return deleted;
};

export const listAdminTransactions = async (query = {}) => {
  const { page, limit, search } = getPage(query);
  const filter = {};
  if (query.userId !== undefined) {
    if (!mongoose.isValidObjectId(query.userId)) {
      throw createHttpError('userId must be a valid user ID', 400);
    }
    filter.userId = query.userId;
  }
  if (['food', 'transport', 'groceries', 'dining', 'fuel', 'other'].includes(query.category)) {
    filter.category = query.category;
  }
  const dateFrom = parseDateFilter(query.dateFrom, 'dateFrom');
  const dateTo = parseDateFilter(query.dateTo, 'dateTo');
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw createHttpError('dateFrom must be on or before dateTo', 400);
  }
  if (dateFrom || dateTo) {
    filter.transactionDate = {};
    if (dateFrom) filter.transactionDate.$gte = dateFrom;
    if (dateTo) {
      const exclusiveDateTo = new Date(dateTo);
      exclusiveDateTo.setUTCDate(exclusiveDateTo.getUTCDate() + 1);
      filter.transactionDate.$lt = exclusiveDateTo;
    }
  }
  if (search) {
    const matcher = new RegExp(escapeRegex(search), 'i');
    const matchingUsers = await User.find({ $or: [{ name: matcher }, { email: matcher }] }).select('_id').lean();
    filter.$or = [
      { merchant: matcher },
      { category: matcher },
      { userId: { $in: matchingUsers.map((user) => user._id) } },
    ];
  }

  return pagedResult({
    model: Transaction,
    filter,
    page,
    limit,
    projection: 'userId merchant amount category transactionDate source createdAt',
    populate: [{ path: 'userId', select: 'name email' }],
  });
};

export const listAdminKyc = async (query = {}) => {
  const { page, limit, search } = getPage(query);
  const filter = {};
  if (['pending', 'verified', 'rejected'].includes(query.status)) filter.status = query.status;
  if (search) {
    const matcher = new RegExp(escapeRegex(search), 'i');
    const matchingUsers = await User.find({ $or: [{ name: matcher }, { email: matcher }] }).select('_id').lean();
    filter.$or = [
      { fullName: matcher },
      { demoDocumentType: matcher },
      { userId: { $in: matchingUsers.map((user) => user._id) } },
    ];
  }

  return pagedResult({
    model: KYCRecord,
    filter,
    page,
    limit,
    projection: 'userId fullName demoDocumentType status reviewerId reviewNote submittedAt reviewedAt',
    populate: [
      { path: 'userId', select: 'name email' },
      { path: 'reviewerId', select: 'name' },
    ],
  });
};

export const listAdminMarketData = async (query = {}) => {
  const { page, limit, search } = getPage(query);
  const filter = {};
  if (['equity', 'gold', 'debt'].includes(query.assetType)) filter.assetType = query.assetType;
  if (search) {
    const matcher = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ symbol: matcher }, { name: matcher }];
  }

  const result = await pagedResult({
    model: MarketData,
    filter,
    page,
    limit,
    projection: 'symbol name assetType price changePercent source updatedAt',
    sort: { symbol: 1 },
  });

  return {
    ...result,
    items: result.items.map((item) => ({
      ...item,
      price: item.price.toString(),
      changePercent: item.changePercent.toString(),
    })),
  };
};

export const listAdminNotifications = async (query = {}) => {
  const { page, limit, search } = getPage(query);
  const filter = {};
  if (query.read === 'unread') filter.isRead = false;
  if (query.read === 'read') filter.isRead = true;
  if (search) {
    const matcher = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ title: matcher }, { message: matcher }, { type: matcher }];
  }

  return pagedResult({
    model: Notification,
    filter,
    page,
    limit,
    projection: 'userId title message type isRead metadata createdAt',
    populate: [{ path: 'userId', select: 'name email' }],
  });
};