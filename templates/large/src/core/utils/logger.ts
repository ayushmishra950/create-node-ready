import { env } from '../../config/env';

const levels = { debug: 10, info: 20, warn: 30, error: 40 } as const;
type Level = keyof typeof levels;

// Quiet during tests, detailed while developing, info and above in production.
const minimum = env.NODE_ENV === 'test' ? levels.error : env.NODE_ENV === 'production' ? levels.info : levels.debug;

function write(level: Level, message: string, extra?: Record<string, unknown>): void {
  if (levels[level] < minimum) return;
  const output = levels[level] >= levels.warn ? process.stderr : process.stdout;
  const time = new Date().toISOString();

  if (env.NODE_ENV === 'production') {
    output.write(JSON.stringify({ time, level, message, ...extra }) + '\n'); // one JSON line per log
  } else {
    output.write(`${time} ${level.toUpperCase().padEnd(5)} ${message}${extra ? ' ' + JSON.stringify(extra) : ''}\n`);
  }
}

export const logger = {
  debug: (message: string, extra?: Record<string, unknown>) => write('debug', message, extra),
  info: (message: string, extra?: Record<string, unknown>) => write('info', message, extra),
  warn: (message: string, extra?: Record<string, unknown>) => write('warn', message, extra),
  error: (message: string, extra?: Record<string, unknown>) => write('error', message, extra),
};
