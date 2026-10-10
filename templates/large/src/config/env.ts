import { existsSync } from 'node:fs';

// Loads the .env file with Node's own loader (no dotenv needed).
// A variable that is already set in the shell wins over the file.
if (existsSync('.env')) process.loadEnvFile('.env');

const NODE_ENVS = ['development', 'test', 'production'] as const;
type NodeEnv = (typeof NODE_ENVS)[number];

export interface Env {
  NODE_ENV: NodeEnv;
  PORT: number;
  MONGODB_URI: string;
  JWT_SECRET: string;
  /** How long a login token lives, in seconds. */
  JWT_EXPIRES_IN: number;
  /** Browser origin allowed by CORS. Empty = CORS off, "*" = any origin. */
  CORS_ORIGIN: string;
}

function readEnv(source: NodeJS.ProcessEnv): Env {
  const problems: string[] = [];

  const nodeEnv = source.NODE_ENV ?? 'development';
  if (!NODE_ENVS.includes(nodeEnv as NodeEnv)) problems.push(`NODE_ENV must be one of: ${NODE_ENVS.join(', ')}`);

  const port = Number(source.PORT ?? 5000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) problems.push('PORT must be a number between 1 and 65535');

  const mongoUri = source.MONGODB_URI ?? '';
  if (!/^mongodb(\+srv)?:\/\//.test(mongoUri)) problems.push('MONGODB_URI must start with mongodb:// or mongodb+srv://');

  const secret = source.JWT_SECRET ?? '';
  const minSecret = nodeEnv === 'production' ? 32 : 16;
  if (secret.length < minSecret) problems.push(`JWT_SECRET must be at least ${minSecret} characters long`);

  const expiresIn = Number(source.JWT_EXPIRES_IN ?? 3600);
  if (!Number.isInteger(expiresIn) || expiresIn < 1) problems.push('JWT_EXPIRES_IN must be a number of seconds, like 3600');

  if (problems.length > 0) throw new Error(`Invalid settings. Please fix your .env file:\n - ${problems.join('\n - ')}`);

  return {
    NODE_ENV: nodeEnv as NodeEnv,
    PORT: port,
    MONGODB_URI: mongoUri,
    JWT_SECRET: secret,
    JWT_EXPIRES_IN: expiresIn,
    CORS_ORIGIN: source.CORS_ORIGIN ?? '',
  };
}

function loadEnv(): Env {
  try {
    return readEnv(process.env);
  } catch (error) {
    // Show a short message instead of a stack trace, then stop: the app cannot run with these settings.
    process.stderr.write(`${(error as Error).message}\n`);
    process.exit(1);
  }
}

export const env = loadEnv();
