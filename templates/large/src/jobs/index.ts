import { logger } from '../core/utils/logger';

interface Job {
  name: string;
  everyMs: number;
  run: () => Promise<void> | void;
}

// Put your background jobs here (clean-ups, reports, retries). They run inside this process on a timer.
// For work that must run exactly once across several servers, use a job queue instead.
const jobs: Job[] = [
  {
    name: 'heartbeat',
    everyMs: 60_000,
    run: () => logger.debug('job heartbeat'),
  },
];

/** Starts every job. Returns a function that stops them (called when the server shuts down). */
export function startJobs(): () => void {
  const timers = jobs.map((job) => {
    let running = false;
    const timer = setInterval(async () => {
      if (running) return; // a slow run never overlaps with the next one
      running = true;
      try {
        await job.run();
      } catch (error) {
        logger.error(`job ${job.name} failed`, { error: error instanceof Error ? error.message : String(error) });
      } finally {
        running = false;
      }
    }, job.everyMs);
    timer.unref(); // a job never keeps the process alive by itself
    return timer;
  });
  return () => timers.forEach(clearInterval);
}
