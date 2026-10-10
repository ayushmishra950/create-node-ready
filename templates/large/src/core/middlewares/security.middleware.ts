import type { RequestHandler } from 'express';
import { env } from '../../config/env';

/** A few basic security headers (a small version of what the helmet package does). */
export const securityHeaders: RequestHandler = (_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  next();
};

/** Lets a frontend on another origin call this API. Turn it on with CORS_ORIGIN in .env. */
export const cors: RequestHandler = (req, res, next) => {
  if (!env.CORS_ORIGIN) return next();

  res.setHeader('Access-Control-Allow-Origin', env.CORS_ORIGIN);
  if (env.CORS_ORIGIN !== '*') res.vary('Origin');

  if (req.method === 'OPTIONS') {
    // The browser's "preflight" question before a real request.
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '600');
    res.status(204).end();
    return;
  }
  next();
};
