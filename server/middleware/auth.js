import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

import { getJwtSecret } from '../config/jwt.js';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const error = new Error('Not authorized, token missing');
    error.statusCode = 401;
    return next(error);
  }

  const token = authHeader.slice('Bearer '.length).trim();
  let decoded;

  try {
    decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
  } catch (error) {
    if (error.statusCode === 500) return next(error);
    const authError = new Error('Not authorized, invalid token');
    authError.statusCode = 401;
    return next(authError);
  }

  if (!decoded || !mongoose.isValidObjectId(decoded.id)
    || (decoded.tokenVersion !== undefined && !Number.isInteger(decoded.tokenVersion))) {
    const error = new Error('Not authorized, invalid token');
    error.statusCode = 401;
    return next(error);
  }

  try {
    const user = await User.findById(decoded.id).select('-passwordHash');

    const tokenVersion = decoded.tokenVersion ?? 0;
    const currentTokenVersion = user?.tokenVersion ?? 0;
    if (!user || !user.isActive || tokenVersion !== currentTokenVersion) {
      const error = new Error('Not authorized, user unavailable');
      error.statusCode = 401;
      return next(error);
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      const error = new Error('You do not have permission to access this resource');
      error.statusCode = 403;
      return next(error);
    }

    return next();
  };
};
