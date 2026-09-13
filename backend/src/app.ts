import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { requestContext } from './middleware/request.js';

import { meRouter } from './routes/me.js';
import { studentRouter } from './routes/student.js';
import { placementRouter } from './routes/placement.js';
import { phase4Router } from './routes/phase4.js';
import { phase5Router } from './routes/phase5.js';
import { phase6Router } from './routes/phase6.js';
import { aiRouter } from './routes/ai.js';

export const app = express();
app.disable('x-powered-by');
app.get('/health', (_request, response) => response.json({ status: 'ok', service: 'placement-portal-api' }));
app.use(helmet());
app.use(cors({
  origin: env.FRONTEND_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600,
}));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false }));
app.use(express.json({ limit: '1mb' }));
app.use(mongoSanitize());
app.use(requestContext);
app.use(morgan(':method :url :status :response-time ms'));
app.use('/api/v1/me', meRouter);
app.use('/api/v1/student', studentRouter);
app.use('/api/v1', placementRouter);
app.use('/api/v1', phase4Router);
app.use('/api/v1', phase5Router);
app.use('/api/v1', phase6Router);
app.use('/api/v1', aiRouter);
app.use(notFound);
app.use(errorHandler);
