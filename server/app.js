import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

dotenv.config();

import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { bankRouter, transactionRouter } from './routes/bankRoutes.js';
import roundUpRoutes from './routes/roundUpRoutes.js';
import riskRoutes from './routes/riskRoutes.js';
import allocationRoutes from './routes/allocationRoutes.js';
import portfolioRoutes from './routes/portfolioRoutes.js';
import goalRoutes from './routes/goalRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import advisorRoutes from './routes/advisorRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import marketRoutes from './routes/marketRoutes.js';
import kycRoutes from './routes/kycRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import notFoundHandler from './middleware/notFound.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to MicroGrow API',
  });
});

app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/bank', bankRouter);
app.use('/api/transactions', transactionRouter);
app.use('/api/roundups', roundUpRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api/allocation', allocationRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/advisor/clients', advisorRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
