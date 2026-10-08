import 'dotenv/config';

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import { getJwtSecret } from '../config/jwt.js';
import User from '../models/User.js';

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

const isValidEmail = (email) => email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const signToken = (user, secret) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      email: user.email,
      tokenVersion: user.tokenVersion ?? 0,
    },
    secret,
    { expiresIn: JWT_EXPIRES_IN, algorithm: 'HS256' }
  );
};

export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};

    if (typeof name !== 'string' || !name.trim() || name.trim().length > 120) {
      const error = new Error('Name is required and must be at most 120 characters');
      error.statusCode = 400;
      throw error;
    }

    if (typeof email !== 'string' || !isValidEmail(email.trim())) {
      const error = new Error('A valid email is required');
      error.statusCode = 400;
      throw error;
    }

    if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
      const error = new Error('Password must be 8-72 UTF-8 bytes');
      if (typeof password === 'string' && Buffer.byteLength(password, 'utf8') > 72) {
        error.message = 'Password must not exceed 72 UTF-8 bytes';
      }
      error.statusCode = 400;
      throw error;
    }

    const jwtSecret = getJwtSecret();

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      const error = new Error('User already exists with this email');
      error.statusCode = 409;
      throw error;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: 'investor',
    });

    const token = signToken(user, jwtSecret);

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        advisorId: user.advisorId ? String(user.advisorId) : null,
      },
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.email) {
      const duplicateError = new Error('User already exists with this email');
      duplicateError.statusCode = 409;
      return next(duplicateError);
    }

    return next(error);
  }
};

export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (typeof email !== 'string' || !isValidEmail(email.trim())) {
      const error = new Error('A valid email is required');
      error.statusCode = 400;
      throw error;
    }

    if (typeof password !== 'string' || !password || Buffer.byteLength(password, 'utf8') > 72) {
      const error = new Error('Password is required and must not exceed 72 UTF-8 bytes');
      error.statusCode = 400;
      throw error;
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordMatch || !user.isActive) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    const token = signToken(user, getJwtSecret());

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        advisorId: user.advisorId ? String(user.advisorId) : null,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const getCurrentUser = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      advisorId: req.user.advisorId ? String(req.user.advisorId) : null,
      kycStatus: req.user.kycStatus,
      isActive: req.user.isActive,
    },
  });
};

export const logoutUser = async (req, res, next) => {
  try {
    const result = await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
    if (result.matchedCount !== 1) {
      const error = new Error('User session is no longer available');
      error.statusCode = 401;
      throw error;
    }
    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    return next(error);
  }
};
