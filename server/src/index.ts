import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { authRouter } from './routes/auth';
import { reportRouter } from './routes/reports';
import { aqiRouter } from './routes/aqi';
import { wqiRouter } from './routes/wqi';
import { userRouter } from './routes/users';
import { adminRouter } from './routes/admin';
import { commentsRouter } from './routes/comments';
import { moderationRouter } from './routes/moderation';
import path from 'path';

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

// ─── Security Middleware ───
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Global rate limit: 100 req/min per IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(globalLimiter);

// ─── Routes ───
app.use('/api/auth', authRouter);
app.use('/api/reports', reportRouter);
app.use('/api/aqi', aqiRouter);
app.use('/api/wqi', wqiRouter);
app.use('/api/users', userRouter);
app.use('/api/admin', adminRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/moderation', moderationRouter);

// Serve uploads statically for local fallback
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 AirLens server running on http://localhost:${PORT}`);
});

export default app;
