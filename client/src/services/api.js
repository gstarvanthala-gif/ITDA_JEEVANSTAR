import axios from 'axios';

const kycReviewActions = { verified: 'verify', rejected: 'reject' };

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }

  delete api.defaults.headers.common.Authorization;
};

export const authApi = {
  register: (payload) => api.post('/auth/register', payload),
  login: (payload) => api.post('/auth/login', payload),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

export const demoBankApi = {
  getOverview: () => Promise.all([api.get('/bank'), api.get('/transactions')]),
  getBank: () => api.get('/bank'),
  connectBank: () => api.post('/bank/connect'),
  disconnectBank: (id) => api.delete(`/bank/${id}`),
  getTransactions: () => api.get('/transactions'),
  syncTransactions: () => api.post('/transactions/sync'),
};

export const roundUpApi = {
  calculate: () => api.post('/roundups/calculate'),
  getAll: () => api.get('/roundups'),
  getSummary: () => api.get('/roundups/summary'),
  invest: (roundUpId) => api.post('/roundups/invest', { roundUpId }),
  getHistory: () => api.get('/roundups/history'),
};

export const riskApi = {
  getQuestions: () => api.get('/risk/questions'),
  submit: (answers) => api.post('/risk/submit', { answers }),
  getProfile: () => api.get('/risk/profile'),
  recalculate: () => api.put('/risk/recalculate'),
};

export const allocationApi = {
  get: () => api.get('/allocation'),
  calculate: () => api.post('/allocation/calculate'),
  update: () => api.put('/allocation'),
  execute: (roundUpId) => api.post('/allocation/execute', { roundUpId }),
  getHistory: () => api.get('/allocation/history'),
  reset: () => api.post('/allocation/reset'),
};

export const portfolioApi = {
  get: () => api.get('/portfolio'),
  getHoldings: () => api.get('/portfolio/holdings'),
  getValue: () => api.get('/portfolio/value'),
  getHistory: () => api.get('/portfolio/history'),
  getPerformance: () => api.get('/portfolio/performance'),
  getTransactions: () => api.get('/portfolio/transactions'),
  getSummary: () => api.get('/portfolio/summary'),
};

export const kycApi = {
  getStatus: () => api.get('/kyc/status'),
  submit: (payload) => api.post('/kyc/submit', payload),
};

export const goalsApi = {
  getAll: () => api.get('/goals'),
  get: (goalId) => api.get(`/goals/${goalId}`),
  create: (payload) => api.post('/goals', payload),
  update: (goalId, payload) => api.put(`/goals/${goalId}`, payload),
  remove: (goalId) => api.delete(`/goals/${goalId}`),
};

export const notificationApi = {
  getAll: () => api.get('/notifications'),
  markRead: (notificationId) => api.put(`/notifications/${notificationId}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  remove: (notificationId) => api.delete(`/notifications/${notificationId}`),
};

export const advisorApi = {
  getClients: () => api.get('/advisor/clients'),
  getClient: (clientId) => api.get(`/advisor/clients/${clientId}`),
};

export const messageApi = {
  getConversation: (userId) => api.get(`/messages/${userId}`),
  send: (receiverId, message) => api.post('/messages', { receiverId, message }),
  markRead: (messageId) => api.put(`/messages/${messageId}/read`),
  remove: (messageId) => api.delete(`/messages/${messageId}`),
};

export const marketApi = {
  getAll: () => api.get('/market'),
  getBySymbol: (symbol) => api.get(`/market/${symbol}`),
  create: (payload) => api.post('/market', payload),
  update: (id, payload) => api.put(`/market/${id}`, payload),
  remove: (id) => api.delete(`/market/${id}`),
};

export const adminApi = {
  getOverview: () => api.get('/admin/overview'),
  getUsers: (params) => api.get('/admin/users', { params }),
  getUserDetails: (id) => api.get(`/admin/users/${id}`),
  getAdvisors: (params) => api.get('/admin/advisors', { params }),
  getTransactions: (params) => api.get('/admin/transactions', { params }),
  getKycRecords: (params) => api.get('/admin/kyc', { params }),
  getMarketData: (params) => api.get('/admin/market', { params }),
  getNotifications: (params) => api.get('/admin/notifications', { params }),
  reviewKyc: (id, status, reviewNote) => api.put(`/kyc/${id}/${kycReviewActions[status] || status}`, { reviewNote }),
  setUserStatus: (id, isActive) => api.put(`/admin/users/${id}/status`, { isActive }),
  assignAdvisor: (investorId, advisorId) => api.put(`/admin/investors/${investorId}/advisor`, { advisorId }),
  removeAdvisor: (investorId) => api.delete(`/admin/investors/${investorId}/advisor`),
  createNotification: (payload) => api.post('/admin/notifications', payload),
  deleteNotification: (id) => api.delete(`/admin/notifications/${id}`),
};

export default api;
