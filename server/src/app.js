import express, { json } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

import webhookRoutes from './routes/webhookRoutes.js';
import authRoutes from './routes/authRoutes.js';
import bookRoutes from './routes/bookRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import { requireAuth, requireRole } from './middleware/auth.js';
import errorHandler from './middleware/errorHandler.js';
import logger from './config/logger.js';

const app = express();

// Pipe morgan's access log lines through winston instead of straight to
// stdout, so request logs and application logs share the same format
// (JSON in production).
app.use(
  morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
    stream: { write: (message) => logger.http(message.trim()) },
  })
);

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true, // required so the browser sends/receives the refresh cookie
  })
);

app.use('/webhooks', webhookRoutes);

app.use(json());
app.use(cookieParser());

app.use('/auth', authRoutes);
app.use('/books', bookRoutes);
app.use('/cart', cartRoutes);
app.use('/orders', orderRoutes);
app.use('/categories', categoryRoutes);

// GET /me returns the logged-in user's identity from the access token.
app.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Example of an admin-only route
app.get('/admin/ping', requireAuth, requireRole('ADMIN'), (req, res) => {
  res.json({ message: 'pong, admin' });
});

app.use(errorHandler);

export default app;
