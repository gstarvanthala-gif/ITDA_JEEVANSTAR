import jwt from 'jsonwebtoken';

import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'microgrow-dev-secret';

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const error = new Error('Not authorized, token missing');
      error.statusCode = 401;
      throw error;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id).select('-passwordHash');

    if (!user) {
      const error = new Error('User not found for this token');
      error.statusCode = 401;
      throw error;
    }

    req.user = user;
    return next();
  } catch (error) {
    const authError = new Error('Not authorized, invalid token');
    authError.statusCode = 401;
    return next(authError);
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
