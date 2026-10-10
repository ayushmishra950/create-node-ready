import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { env } from './config/env';
import { logger } from './core/utils/logger';
import { startJobs } from './jobs';

async function main(): Promise<void> {
  await connectDatabase();
  const stopJobs = startJobs();

  const server = createApp().listen(env.PORT, () => {
    logger.info('server started', { port: env.PORT, env: env.NODE_ENV });
  });

  // When the process is asked to stop (Ctrl+C, Docker, Kubernetes): finish running requests, close the database, exit.
  let stopping = false;
  const shutdown = (signal: string): void => {
    if (stopping) return;
    stopping = true;
    logger.info('shutting down', { signal });
    setTimeout(() => process.exit(1), 10_000).unref(); // give up after 10 seconds
    stopJobs();
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

process.on('unhandledRejection', (reason) => {
  logger.error('unhandled promise rejection', { reason: String(reason) });
  process.exit(1);
});

main().catch((error: unknown) => {
  logger.error('failed to start', { error: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});
