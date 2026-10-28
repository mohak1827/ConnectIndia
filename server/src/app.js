import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import { getPublicStats } from './controllers/dashboard.controller.js';
import servicesRoutes from './routes/services.routes.js';
import educationRoutes from './routes/education.routes.js';
import verificationRoutes from './routes/verification.routes.js';
import transactionsRoutes from './routes/transactions.routes.js';
import consentRoutes from './routes/consent.routes.js';
import adminRoutes from './routes/admin.routes.js';
import accessRequestRoutes from './routes/accessRequest.routes.js';
import providerRequestRoutes from './routes/providerRequest.routes.js';
import { providerRouter } from './routes/provider.routes.js';
import { orgRouter } from './routes/org.routes.js';

// Simple in-memory rate limiter for sensitive endpoints
const rateLimitStore = new Map();

function simpleRateLimit({ windowMs = 60000, max = 20, message = 'Too many requests' } = {}) {
  return (req, res, next) => {
    if (env.NODE_ENV === 'test') return next();
    const key = req.ip || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    const requests = (rateLimitStore.get(key) || []).filter((t) => t > windowStart);
    if (requests.length >= max) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'TOO_MANY_REQUESTS',
          message,
          requestId: req.id,
        },
      });
    }

    requests.push(now);
    rateLimitStore.set(key, requests);

    // Clean up old keys periodically
    if (rateLimitStore.size > 5000) {
      for (const [k, v] of rateLimitStore.entries()) {
        if (v.every((t) => t < windowStart)) rateLimitStore.delete(k);
      }
    }

    next();
  };
}

const loginRateLimit = simpleRateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many login attempts. Please try again later.' });
const accessRequestRateLimit = simpleRateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: 'Too many access requests submitted from this IP.' });
const verifyRateLimit = simpleRateLimit({ windowMs: 60 * 1000, max: 30, message: 'Too many verification requests. Please slow down.' });

export function createApp() {
  const app = express();

  // Basic security and parsing middlewares
  app.use(cors({
    origin: env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(requestIdMiddleware);

  // Security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'ConnectIndia Gateway',
      version: '2.0.0',
      requestId: req.id,
    });
  });

  // Public stats endpoint (no authentication needed)
  app.get('/api/v1/public/stats', getPublicStats);

  // Mount API v1 routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/auth/login', loginRateLimit); // Additional rate limit on login
  app.use('/api/v1/dashboard', dashboardRoutes);
  app.use('/api/v1/services', servicesRoutes);
  app.use('/api/v1/education', educationRoutes);
  app.use('/api/v1/verify', verifyRateLimit, verificationRoutes);
  app.use('/api/v1/transactions', transactionsRoutes);
  app.use('/api/v1/consents', consentRoutes);
  app.use('/api/v1', consentRoutes); // For POST /api/v1/policy/evaluate
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/provider', providerRouter);
  app.use('/api/v1/org', orgRouter);
  app.use('/api/v1/provider-requests', providerRequestRoutes);
  app.use('/api/v1/access-requests', accessRequestRoutes);
  // Apply access request rate limit specifically to POST (public submission)
  app.use('/api/v1/access-requests', accessRequestRateLimit);

  // Catch-all 404 handler for undefined API routes
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'ENDPOINT_NOT_FOUND',
        message: `API endpoint ${req.method} ${req.originalUrl} does not exist.`,
        requestId: req.id,
      },
    });
  });

  // Central error handler
  app.use(errorHandler);

  return app;
}
