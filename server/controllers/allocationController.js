import {
  calculateAllocation,
  executeAllocation,
  getAllocation as findAllocation,
  getAllocationHistory,
  resetAllocation,
  serializeAllocationHistoryItem,
} from '../services/allocationService.js';

const serializeAllocation = (allocation) => ({
  id: allocation._id,
  riskProfile: allocation.riskProfile,
  riskLevel: allocation.riskLevel,
  equityPercent: allocation.equityPercent,
  goldPercent: allocation.goldPercent,
  debtPercent: allocation.debtPercent,
  createdAt: allocation.createdAt,
  updatedAt: allocation.updatedAt,
});

export const getCurrentAllocation = async (req, res, next) => {
  try {
    const allocation = await findAllocation(req.user._id);
    return res.json({ success: true, allocation: allocation ? serializeAllocation(allocation) : null });
  } catch (error) {
    return next(error);
  }
};

export const calculate = async (req, res, next) => {
  try {
    const allocation = await calculateAllocation(req.user._id);
    return res.json({ success: true, allocation: serializeAllocation(allocation) });
  } catch (error) {
    return next(error);
  }
};

export const update = calculate;

export const execute = async (req, res, next) => {
  try {
    const roundUp = await executeAllocation(req.user._id, req.body.roundUpId);
    return res.json({ success: true, roundUp: serializeAllocationHistoryItem(roundUp) });
  } catch (error) {
    return next(error);
  }
};

export const history = async (req, res, next) => {
  try {
    const items = await getAllocationHistory(req.user._id);
    return res.json({ success: true, history: items.map(serializeAllocationHistoryItem) });
  } catch (error) {
    return next(error);
  }
};

export const reset = async (req, res, next) => {
  try {
    const allocation = await resetAllocation(req.user._id);
    return res.json({ success: true, allocation: allocation ? serializeAllocation(allocation) : null });
  } catch (error) {
    return next(error);
  }
};