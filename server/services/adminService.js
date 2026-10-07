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
  const [investors, advisors, roundUps, portfolioTotals, pendingKyc, activeGoals, unreadNotifications] = await Promise.all([
    User.countDocuments({ role: 'investor' }),
    User.countDocuments({ role: 'advisor' }),
    RoundUp.countDocuments(),
    Portfolio.aggregate([{ $group: { _id: null, total: { $sum: '$currentValue' } } }]),
    KYCRecord.countDocuments({ status: 'pending' }),
    Goal.countDocuments({ status: 'active' }),
    Notification.countDocuments({ isRead: false }),
  ]);

  return {
    totalInvestors: investors,
    totalAdvisors: advisors,
    totalRoundUps: roundUps,
    virtualPortfolioValue: Number(String(portfolioTotals[0]?.total || 0)),
    pendingKyc,
    activeGoals,
    unreadNotifications,
  };
};

export const listAdminUsers = async (query = {}, role = null) => {
  const { page, limit, search } = getPage(query);
  const filter = {};
  if (role) filter.role = role;
  else if (['investor', 'advisor', 'admin'].includes(query.role)) filter.role = query.role;
  if (query.status === 'active') filter.isActive = true;
  if (query.status === 'inactive') filter.isActive = false;
  if (search) {
    const matcher = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: matcher }, { email: matcher }];
  }

  return pagedResult({
    model: User,
    filter,
    page,
    limit,
    projection: 'name email role kycStatus isActive advisorId createdAt',
    populate: [{ path: 'advisorId', select: 'name email' }],
    sort: { createdAt: -1 },
  });
};

export const listAdminTransactions = async (query = {}) => {
  const { page, limit, search } = getPage(query);
  const filter = {};
  if (['food', 'transport', 'groceries', 'dining', 'fuel', 'other'].includes(query.category)) {
    filter.category = query.category;
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

  return pagedResult({
    model: MarketData,
    filter,
    page,
    limit,
    projection: 'symbol name assetType price changePercent source updatedAt',
    sort: { symbol: 1 },
  });
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
    projection: 'userId title message type isRead createdAt',
    populate: [{ path: 'userId', select: 'name email' }],
  });
};