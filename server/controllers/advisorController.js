import { getAssignedClient, getAssignedClients } from '../services/advisorService.js';

export const listAdvisorClients = async (req, res, next) => {
  try {
    const clients = await getAssignedClients(req.user._id);
    return res.json({ success: true, count: clients.length, clients });
  } catch (error) {
    return next(error);
  }
};

export const getAdvisorClient = async (req, res, next) => {
  try {
    const client = await getAssignedClient(req.user._id, req.params.id);
    return res.json({ success: true, client });
  } catch (error) {
    return next(error);
  }
};