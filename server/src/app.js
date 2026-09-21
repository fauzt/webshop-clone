import express, { json } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

import webhookRoutes from './routes/webhookRoutes.js';
import authRoutes from './routes/authRoutes.js';
import bookRoutes from './routes/bookRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import { requireAuth, requireRole } from './middleware/auth.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();

app.use(morgan('dev'));

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
