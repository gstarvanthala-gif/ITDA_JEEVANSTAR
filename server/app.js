import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import healthRoutes from './routes/healthRoutes.js';
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

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
