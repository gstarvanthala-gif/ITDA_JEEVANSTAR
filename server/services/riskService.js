import RiskProfile from '../models/RiskProfile.js';
import User from '../models/User.js';
import { RISK_QUESTIONS, RISK_SCORING_TABLE } from './riskQuestions.js';

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

export const getRiskQuestions = () => RISK_QUESTIONS;

export const calculateRiskScore = (answers) => {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    throw createHttpError('Answers must be an object keyed by question id', 400);
  }

  const questionIds = Object.keys(RISK_SCORING_TABLE);
  const answerIds = Object.keys(answers);

  if (
    answerIds.length !== questionIds.length ||
    questionIds.some((questionId) => !Object.hasOwn(answers, questionId))
  ) {
    throw createHttpError('Answer every risk question exactly once', 400);
  }

  return questionIds.reduce((score, questionId) => {
    const answerId = answers[questionId];
    const points = typeof answerId === 'string'
      ? RISK_SCORING_TABLE[questionId][answerId]
      : undefined;

    if (points === undefined) {
      throw createHttpError(`Invalid answer for ${questionId}`, 400);
    }

    return score + points;
  }, 0);
};

export const classifyRiskScore = (score) => {
  if (!Number.isInteger(score) || score < 0 || score > 100) {
    throw createHttpError('Risk score must be an integer between 0 and 100', 400);
  }

  if (score <= 30) return 'conservative';
  if (score <= 60) return 'moderate';
  return 'aggressive';
};

export const getRiskProfile = (userId) => RiskProfile.findOne({ userId });

export const submitRiskAssessment = async (userId, answers) => {
  const score = calculateRiskScore(answers);
  const profile = classifyRiskScore(score);

  let riskProfile;
  try {
    riskProfile = await RiskProfile.findOneAndUpdate(
      { userId },
      {
        $set: {
          score,
          profile,
          answers,
          completedAt: new Date(),
        },
        $setOnInsert: { userId },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    if (error.code !== 11000) throw error;

    riskProfile = await RiskProfile.findOneAndUpdate(
      { userId },
      {
        $set: {
          score,
          profile,
          answers,
          completedAt: new Date(),
        },
      },
      { new: true, runValidators: true }
    );
  }

  const userUpdate = await User.updateOne(
    { _id: userId },
    { $set: { riskProfile: riskProfile._id } },
    { runValidators: true }
  );

  if (userUpdate.matchedCount !== 1) {
    throw createHttpError('User not found while saving risk profile', 404);
  }

  return riskProfile;
};

export const recalculateRiskAssessment = async (userId) => {
  const existingProfile = await RiskProfile.findOne({ userId }).select('answers');

  if (!existingProfile) {
    throw createHttpError('Submit a risk assessment before recalculating', 404);
  }

  return submitRiskAssessment(userId, existingProfile.answers);
};