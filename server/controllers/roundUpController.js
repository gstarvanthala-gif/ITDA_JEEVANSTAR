import {
  calculateAndStoreRoundUps,
  getRoundUpHistory,
  investRoundUp,
  listRoundUps,
  summarizeRoundUps,
} from '../services/roundUpService.js';

const serializeRoundUp = (roundUp) => {
  const result = roundUp.toObject();

  for (const field of ['originalAmount', 'roundedAmount', 'roundUpAmount']) {
    result[field] = result[field].toString();
  }

  return result;
};

export const calculateRoundUps = async (req, res, next) => {
  try {
    const roundUps = await calculateAndStoreRoundUps(req.user._id);
    return res.json({
      success: true,
      count: roundUps.length,
      roundUps: roundUps.map(serializeRoundUp),
    });
  } catch (error) {
    return next(error);
  }
};

export const getRoundUps = async (req, res, next) => {
  try {
    const roundUps = await listRoundUps(req.user._id);
    return res.json({ success: true, roundUps: roundUps.map(serializeRoundUp) });
  } catch (error) {
    return next(error);
  }
};

export const getRoundUpSummary = async (req, res, next) => {
  try {
    const summary = await summarizeRoundUps(req.user._id);
    return res.json({ success: true, summary });
  } catch (error) {
    return next(error);
  }
};

export const invest = async (req, res, next) => {
  try {
    const roundUp = await investRoundUp(req.user._id, req.body.roundUpId);
    return res.json({ success: true, roundUp: serializeRoundUp(roundUp) });
  } catch (error) {
    return next(error);
  }
};

export const getHistory = async (req, res, next) => {
  try {
    const roundUps = await getRoundUpHistory(req.user._id);
    return res.json({ success: true, roundUps: roundUps.map(serializeRoundUp) });
  } catch (error) {
    return next(error);
  }
};