import type { RequestHandler } from 'express';
import { logger } from '../utils/logger';

/** Logs one line per request: method, url, status and how long it took. */
export const requestLogger: RequestHandler = (req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode}`, { ms: Math.round(ms * 10) / 10 });
  });
  next();
};
