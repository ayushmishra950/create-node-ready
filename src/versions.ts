// Versions written into the generated package.json. Bump them here, then run `npm run test:e2e`.
export const DEPENDENCIES: Record<string, string> = {
  express: '^5.2.1',
  mongoose: '^9.11.1',
};

export const DEV_DEPENDENCIES: Record<string, string> = {
  '@types/express': '^5.0.6',
  '@types/node': '^22.0.0',
  tsx: '^4.20.0',
  typescript: '^5.9.0',
};

// Mongoose 9 needs Node 20.19 or newer (this also covers process.loadEnvFile, added in 20.12).
export const MIN_NODE = '20.19';
