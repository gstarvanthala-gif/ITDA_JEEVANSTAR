import {
  classifyRiskScore,
  getRiskProfile as findRiskProfile,
  getRiskQuestions,
  recalculateRiskAssessment,
  submitRiskAssessment,
} from '../services/riskService.js';

const serializeRiskProfile = (riskProfile) => ({
  id: riskProfile._id,
  score: riskProfile.score,
  profile: riskProfile.profile,
  answers: riskProfile.answers,
  completedAt: riskProfile.completedAt,
  updatedAt: riskProfile.updatedAt,
});

export const getQuestions = (req, res) =>
  res.json({ success: true, questions: getRiskQuestions() });

export const submitAssessment = async (req, res, next) => {
  try {
    const riskProfile = await submitRiskAssessment(req.user._id, req.body.answers);
    return res.status(201).json({ success: true, riskProfile: serializeRiskProfile(riskProfile) });
  } catch (error) {
    return next(error);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const riskProfile = await findRiskProfile(req.user._id);
    return res.json({
      success: true,
      riskProfile: riskProfile ? serializeRiskProfile(riskProfile) : null,
    });
  } catch (error) {
    return next(error);
  }
};

export const recalculate = async (req, res, next) => {
  try {
    const riskProfile = await recalculateRiskAssessment(req.user._id);
    return res.json({ success: true, riskProfile: serializeRiskProfile(riskProfile) });
  } catch (error) {
    return next(error);
  }
};

export { classifyRiskScore };