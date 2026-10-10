import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../core/utils/logger';

export async function connectDatabase(): Promise<void> {
  // Safety: a request like { "email": { "$ne": null } } is treated as plain data, not as a query operator.
  mongoose.set('sanitizeFilter', true);

  try {
    await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  } catch {
    const shown = env.MONGODB_URI.replace(/\/\/[^@/]*@/, '//***@'); // never print the password
    throw new Error(`Cannot connect to MongoDB at ${shown}. Is it running? (try: docker compose up -d mongo)`);
  }

  logger.info('database connected', { name: mongoose.connection.name });
  mongoose.connection.on('disconnected', () => logger.warn('database disconnected'));
}

export async function disconnectDatabase(): Promise<void> {
  mongoose.connection.removeAllListeners('disconnected'); // closing on purpose is not a problem to warn about
  await mongoose.disconnect();
}
