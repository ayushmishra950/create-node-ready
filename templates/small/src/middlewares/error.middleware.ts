import type { ErrorRequestHandler, RequestHandler } from 'express';
import { env } from '../config/env';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

// Runs when no route matched.
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, `Cannot ${req.method} ${req.path}`));
};

interface ErrorInfo {
  status: number;
  message: string;
  fields?: Record<string, string>;
}

// Turns any error into a status and a message for the client.
function describeError(err: any): ErrorInfo {
  // Our own errors: throw new AppError(404, '...')
  if (err instanceof AppError) return { status: err.status, message: err.message };

  // Mongoose: a field broke a schema rule (required, minlength, match, ...)
  if (err?.name === 'ValidationError' && err.errors) {
    const fields = Object.fromEntries(Object.entries<any>(err.errors).map(([name, problem]) => [name, problem.message]));
    return { status: 400, message: 'Some fields are not valid', fields };
  }

  // Mongoose: a value has the wrong type, for example an id that is not a real ObjectId
  if (err?.name === 'CastError') return { status: 400, message: `Invalid ${err.path === '_id' ? 'id' : err.path}` };

  // MongoDB: a unique rule was broken, for example the same email twice
  if (err?.code === 11000) return { status: 409, message: `${Object.keys(err.keyValue ?? {}).join(', ') || 'value'} already exists` };

  // Express: the request body could not be read
  if (err?.type === 'entity.parse.failed') return { status: 400, message: 'The request body is not valid JSON' };
  if (err?.type === 'entity.too.large') return { status: 413, message: 'The request body is too large' };

  // Anything else is a bug on our side. Do not show internal details in production.
  return { status: 500, message: env.NODE_ENV === 'production' ? 'Something went wrong' : String(err?.message ?? err) };
}

// Express knows this is the error handler because it has 4 parameters. Keep all 4.
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  const { status, message, fields } = describeError(err);
  if (status >= 500) logger.error('unhandled error', { method: req.method, path: req.path, error: err?.stack ?? String(err) });

  res.status(status).json({ error: { message, ...(fields && { fields }) } });
};
