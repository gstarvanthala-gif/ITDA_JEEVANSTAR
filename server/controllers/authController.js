import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'microgrow-dev-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const signToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !name.trim()) {
      const error = new Error('Name is required');
      error.statusCode = 400;
      throw error;
    }

    if (!email || !isValidEmail(email)) {
      const error = new Error('A valid email is required');
      error.statusCode = 400;
      throw error;
    }

    if (!password || password.length < 8) {
      const error = new Error('Password must be at least 8 characters long');
      error.statusCode = 400;
      throw error;
    }

    const allowedRoles = ['investor', 'advisor', 'admin'];
    const safeRole = role && allowedRoles.includes(role) ? role : 'investor';

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
      role: safeRole,
    });

    const token = signToken(user);

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !isValidEmail(email)) {
      const error = new Error('A valid email is required');
      error.statusCode = 400;
      throw error;
    }

    if (!password) {
      const error = new Error('Password is required');
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

    if (!isPasswordMatch) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    const token = signToken(user);

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
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
      kycStatus: req.user.kycStatus,
      isActive: req.user.isActive,
    },
  });
};

export const logoutUser = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};
