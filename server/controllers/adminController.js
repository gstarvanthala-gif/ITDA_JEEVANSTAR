import {
  getAdminOverview,
  listAdminKyc,
  listAdminMarketData,
  listAdminNotifications,
  listAdminTransactions,
  listAdminUsers,
} from '../services/adminService.js';

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