import { randomBytes } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Size } from './validate';
import { DEPENDENCIES, DEV_DEPENDENCIES, MIN_NODE } from './versions';

const TEMPLATES = path.resolve(__dirname, '..', '..', 'templates');

// npm never publishes files called .gitignore, so the templates store them with a "_" prefix.
const RENAMES: Record<string, string> = { _gitignore: '.gitignore', _dockerignore: '.dockerignore' };

const DESCRIPTIONS: Record<Size, string> = {
  small: 'Express + TypeScript + MongoDB API (MVC layout)',
  large: 'Express + TypeScript + MongoDB API (modular layout, Docker ready)',
};

export interface ScaffoldOptions {
  name: string;
  size: Size;
  /** Absolute path of the folder to create. */
  dir: string;
}

/** Files and folders directly inside `dir`; `[]` when it does not exist yet. */
export async function entriesOf(dir: string): Promise<string[]> {
  try {
    return await readdir(dir);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw e;
  }
}

async function* walk(dir: string, base = ''): AsyncGenerator<string> {
  for (const entry of await readdir(path.join(dir, base), { withFileTypes: true })) {
    const rel = path.join(base, entry.name);
    if (entry.isDirectory()) yield* walk(dir, rel);
    else yield rel;
  }
}

/** A safe MongoDB database name made from the project name (letters, numbers and "_"). */
export const databaseName = (name: string): string => name.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 50) || 'app';

function packageJson({ name, size }: ScaffoldOptions): string {
  const entry = size === 'small' ? 'index' : 'server';
  return (
    JSON.stringify(
      {
        name,
        version: '0.1.0',
        private: true,
        description: DESCRIPTIONS[size],
        main: `dist/${entry}.js`,
        engines: { node: `>=${MIN_NODE}` },
        scripts: {
          dev: `tsx watch src/${entry}.ts`,
          build: `node -e "fs.rmSync('dist',{recursive:true,force:true})" && tsc -p tsconfig.build.json`,
          start: `node dist/${entry}.js`,
          typecheck: 'tsc --noEmit',
          test: 'tsx --test src/app.test.ts',
        },
        dependencies: DEPENDENCIES,
        devDependencies: DEV_DEPENDENCIES,
      },
      null,
      2,
    ) + '\n'
  );
}

/** Writes the project into `dir` and returns the relative paths of every file created (sorted). */
export async function scaffold(options: ScaffoldOptions): Promise<string[]> {
  const { dir, name, size } = options;
  const created: string[] = [];

  const put = async (relative: string, content: string): Promise<void> => {
    const target = path.join(dir, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
    created.push(relative);
  };

  for (const layer of ['common', size]) {
    const root = path.join(TEMPLATES, layer);
    for await (const rel of walk(root)) {
      const base = path.basename(rel);
      const target = path.join(path.dirname(rel), RENAMES[base] ?? base);
      const text = (await readFile(path.join(root, rel), 'utf8')).replaceAll('{{name}}', name).replaceAll('{{dbname}}', databaseName(name));
      await put(target, text);
    }
  }

  const secret = randomBytes(32).toString('hex'); // every project gets its own secret
  const env = (jwt: string): string =>
    [
      'NODE_ENV=development',
      'PORT=5000',
      `MONGODB_URI=mongodb://127.0.0.1:27017/${databaseName(name)}`,
      `JWT_SECRET=${jwt}`,
      'JWT_EXPIRES_IN=3600',
      '# Allowed browser origin for CORS (empty = CORS off, * = any origin)',
      'CORS_ORIGIN=',
      '',
    ].join('\n');
  await put('.env', env(secret));
  await put('.env.example', env('change-me-to-a-long-random-string'));
  await put('package.json', packageJson(options));

  return created.sort();
}
