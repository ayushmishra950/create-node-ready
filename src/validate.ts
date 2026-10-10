import { builtinModules } from 'node:module';

const RESERVED = new Set(['node_modules', 'favicon.ico']);

/** Returns a human readable problem, or null when `name` is a valid npm package / folder name. */
export function projectNameProblem(name: string): string | null {
  if (name.length === 0) return 'the name cannot be empty';
  if (name.length > 100) return 'the name must be 100 characters or fewer';
  if (name !== name.trim()) return 'the name cannot start or end with a space';
  if (/[A-Z]/.test(name)) return 'use lowercase letters only (npm does not allow capitals)';
  if (/\s/.test(name)) return 'use "-" instead of spaces';
  if (name.startsWith('.') || name.startsWith('_')) return 'the name cannot start with "." or "_"';
  if (!/^[a-z0-9][a-z0-9._~-]*$/.test(name)) return 'use only letters, numbers, "-", "_" and "."';
  if (RESERVED.has(name)) return `"${name}" is a reserved name`;
  if (builtinModules.includes(name)) return `"${name}" is the name of a Node.js built-in module`;
  return null;
}

export const SIZES = ['small', 'large'] as const;
export type Size = (typeof SIZES)[number];
export const isSize = (value: unknown): value is Size => SIZES.includes(value as Size);

export const PACKAGE_MANAGERS = ['npm', 'pnpm', 'yarn'] as const;
export type PackageManager = (typeof PACKAGE_MANAGERS)[number];
export const isPackageManager = (value: unknown): value is PackageManager =>
  PACKAGE_MANAGERS.includes(value as PackageManager);

/** The package manager that started this CLI (npx / pnpm dlx / yarn create), npm otherwise. */
export function detectPackageManager(userAgent = process.env.npm_config_user_agent ?? ''): PackageManager {
  const name = userAgent.split('/')[0];
  return isPackageManager(name) ? name : 'npm';
}

/** The generated project needs Node 20.19+: Mongoose 9 requires it, and Node's own .env loader (20.12+) replaces dotenv. */
export function nodeIsSupported(version = process.versions.node): boolean {
  const [major = 0, minor = 0] = version.split('.').map(Number);
  return major > 20 || (major === 20 && minor >= 19);
}
