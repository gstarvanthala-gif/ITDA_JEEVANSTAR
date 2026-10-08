import {
  assignInvestorAdvisor,
  createPlatformNotification,
  deletePlatformNotification,
  getAdminOverview,
  getAdminUserDetails,
  listAdminKyc,
  listAdminMarketData,
  listAdminNotifications,
  listAdminTransactions,
  listAdminUsers,
  setUserStatus,
} from '../services/adminService.js';
import { createMarketItem, deleteMarketItem, updateMarketItem } from '../services/marketService.js';

const sendList = (service) => async (req, res, next) => {
  try {
    const result = await service(req.query);
    return res.json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
};

export const getOverview = async (req, res, next) => {
  try {
    const summary = await getAdminOverview();
    return res.json({ success: true, summary });
  } catch (error) {
    return next(error);
  }
};

export const getUsers = sendList((query) => listAdminUsers(query));
export const getAdvisors = sendList((query) => listAdminUsers(query, 'advisor'));
export const getTransactions = sendList(listAdminTransactions);
export const getKycRecords = sendList(listAdminKyc);
export const getMarketData = sendList(listAdminMarketData);
export const getNotifications = sendList(listAdminNotifications);

export const getUserDetails = async (req, res, next) => {
  try {
    const data = await getAdminUserDetails(req.params.userId);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

export const updateInvestorAdvisor = async (req, res, next) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body) || !Object.hasOwn(req.body, 'advisorId')) {
      const error = new Error('advisorId is required');
      error.statusCode = 400;
      throw error;
    }
    if (req.body.advisorId !== null && typeof req.body.advisorId !== 'string') {
      const error = new Error('advisorId must be a valid advisor ID or null');
      error.statusCode = 400;
      throw error;
    }
    const investor = await assignInvestorAdvisor(req.params.investorId, req.body?.advisorId ?? null);
    return res.json({
      success: true,
      message: investor.advisorId ? 'Investor advisor updated' : 'Advisor assignment removed',
      data: {
        id: investor._id,
        advisorId: investor.advisorId,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const removeInvestorAdvisor = async (req, res, next) => {
  try {
    const investor = await assignInvestorAdvisor(req.params.investorId, null);
    return res.json({
      success: true,
      message: 'Advisor assignment removed',
      data: {
        id: investor._id,
        advisorId: investor.advisorId,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const updateUserStatus = async (req, res, next) => {
  try {
    const user = await setUserStatus(req.params.userId, req.body?.isActive, req.user._id);
    return res.json({
      success: true,
      message: user.isActive ? 'User activated' : 'User deactivated',
      data: {
        id: user._id,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const createAdminMarket = async (req, res, next) => {
  try {
    const item = await createMarketItem(req.body);
    return res.status(201).json({ success: true, message: 'Market asset created', data: item });
  } catch (error) {
    return next(error);
  }
};

export const updateAdminMarket = async (req, res, next) => {
  try {
    const item = await updateMarketItem(req.params.id, req.body);
    return res.json({ success: true, message: 'Market asset updated', data: item });
  } catch (error) {
    return next(error);
  }
};

export const deleteAdminMarket = async (req, res, next) => {
  try {
    const item = await deleteMarketItem(req.params.id);
    return res.json({ success: true, message: 'Market asset deleted', data: item });
  } catch (error) {
    return next(error);
  }
};

export const createAdminNotification = async (req, res, next) => {
  try {
    const result = await createPlatformNotification(req.body);
    return res.status(201).json({
      success: true,
      message: `Notification created for ${result.count} recipient(s)`,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteAdminNotification = async (req, res, next) => {
  try {
    const notification = await deletePlatformNotification(req.params.id);
    return res.json({
      success: true,
      message: 'Notification deleted',
      data: { id: notification._id },
    });
  } catch (error) {
    return next(error);
  }
};