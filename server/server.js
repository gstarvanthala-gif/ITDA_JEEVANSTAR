import dotenv from 'dotenv';

dotenv.config();

import app from './app.js';
import connectDB from './config/db.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
  } catch (error) {
    console.error('MongoDB connection failed. Starting server without database connection:', error.message);
  }

  app.listen(PORT, () => {
    console.log(`MicroGrow server running on http://localhost:${PORT}`);
  });
};

startServer();
