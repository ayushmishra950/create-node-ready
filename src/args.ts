import { parseArgs } from 'node:util';
import { isPackageManager, isSize, type PackageManager, type Size } from './validate';

export interface CliArgs {
  name?: string;
  size?: Size;
  yes: boolean;
  install: boolean;
  git: boolean;
  pm?: PackageManager;
  help: boolean;
  version: boolean;
}

export const HELP = `create-node-ready: scaffold a TypeScript + Express backend

Usage
  npx create-node-ready [name] [options]

Creates a TypeScript + Express + MongoDB (Mongoose) API.

Options
  -s, --size <small|large>   small = MVC layout, large = modular layout with Docker
  -y, --yes                  skip every question and use the defaults
      --no-install           do not install dependencies
      --no-git               do not run "git init"
      --pm <npm|pnpm|yarn>   package manager to install with (default: the one you ran this with)
  -h, --help                 show this help
  -v, --version              show the version

Without options it asks for the project name and size.
`;

/** Throws an Error with a readable message on bad input. */
export function parseCliArgs(argv: string[]): CliArgs {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        size: { type: 'string', short: 's' },
        yes: { type: 'boolean', short: 'y' },
        'no-install': { type: 'boolean' },
        'no-git': { type: 'boolean' },
        pm: { type: 'string' },
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean', short: 'v' },
      },
    });
  } catch (e) {
    throw new Error((e as Error).message.replace(/\. To specify a positional.*$/, '') + '. Run with --help to see the options.');
  }

  const { values, positionals } = parsed;
  if (positionals.length > 1) throw new Error(`Expected one project name but got ${positionals.length}: ${positionals.join(', ')}`);
  if (values.size !== undefined && !isSize(values.size)) throw new Error(`--size must be "small" or "large", not "${values.size}"`);
  if (values.pm !== undefined && !isPackageManager(values.pm)) throw new Error(`--pm must be npm, pnpm or yarn, not "${values.pm}"`);

  return {
    name: positionals[0],
    size: values.size as Size | undefined,
    yes: values.yes ?? false,
    install: !(values['no-install'] ?? false),
    git: !(values['no-git'] ?? false),
    pm: values.pm as PackageManager | undefined,
    help: values.help ?? false,
    version: values.version ?? false,
  };
}
