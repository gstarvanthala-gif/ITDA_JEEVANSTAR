import {
  createGoal as create,
  deleteGoal as remove,
  getGoal as findOne,
  listGoals as findAll,
  updateGoal as update,
} from '../services/goalService.js';

export const createGoal = async (req, res, next) => {
  try {
    const goal = await create(req.user._id, req.body);
    return res.status(201).json({ success: true, goal });
  } catch (error) {
    return next(error);
  }
};

export const getGoals = async (req, res, next) => {
  try {
    const goals = await findAll(req.user._id);
    return res.json({ success: true, goals });
  } catch (error) {
    return next(error);
  }
};

export const getGoal = async (req, res, next) => {
  try {
    const goal = await findOne(req.user._id, req.params.id);
    return res.json({ success: true, goal });
  } catch (error) {
    return next(error);
  }
};

export const updateGoal = async (req, res, next) => {
  try {
    const goal = await update(req.user._id, req.params.id, req.body);
    return res.json({ success: true, goal });
  } catch (error) {
    return next(error);
  }
};

export const deleteGoal = async (req, res, next) => {
  try {
    const result = await remove(req.user._id, req.params.id);
    return res.json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
};