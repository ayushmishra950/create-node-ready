#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { HELP, parseCliArgs, type CliArgs } from './args';
import { initGit, installDependencies } from './install';
import { askText, isInteractive, select } from './prompt';
import { entriesOf, scaffold } from './scaffold';
import { bold, cyan, dim, fail, green, log, warn } from './ui';
import { MIN_NODE } from './versions';
import { detectPackageManager, nodeIsSupported, projectNameProblem, type Size } from './validate';

const DEFAULT_NAME = 'node-app';

async function chooseName(args: CliArgs, interactive: boolean): Promise<string> {
  let name = args.name;
  if (name === undefined) {
    if (interactive) {
      name = await askText('Project name?', DEFAULT_NAME);
    } else if (args.yes) {
      name = DEFAULT_NAME;
    } else {
      throw new Error('No project name given. Pass one (npx create-node-ready my-api) or use --yes.');
    }
  }
  // Typed answers get another try; a name passed on the command line is an error.
  for (;;) {
    const problem = projectNameProblem(name);
    if (!problem) return name;
    if (!interactive || args.name !== undefined) throw new Error(`Invalid project name "${name}": ${problem}.`);
    fail(`${problem}.`);
    name = await askText('Project name?', DEFAULT_NAME);
  }
}

async function chooseSize(args: CliArgs, interactive: boolean): Promise<Size> {
  if (args.size) return args.size;
  if (!interactive) {
    if (args.yes) return 'small';
    throw new Error('No size given. Pass --size small or --size large, or use --yes.');
  }
  return select<Size>('What are you building?', [
    { value: 'small', label: 'A small project', hint: 'MVC layout: controllers, models, routes. Good for MVPs and small APIs.' },
    { value: 'large', label: 'A large project', hint: 'Modular layout: users, orders, jobs, Docker. Good for big or growing teams.' },
  ]);
}

async function main(): Promise<void> {
  const args = parseCliArgs(process.argv.slice(2));

  if (args.help) return log(HELP);
  if (args.version) {
    const pkg = JSON.parse(readFileSync(path.resolve(__dirname, '..', '..', 'package.json'), 'utf8')) as { version: string };
    return log(pkg.version);
  }
  if (!nodeIsSupported()) throw new Error(`Node.js ${MIN_NODE} or newer is required (you have ${process.versions.node}).`);

  const interactive = isInteractive() && !args.yes;
  if (interactive) log(`\n${bold('create-node-ready')} ${dim('TypeScript + Express backend, ready in one command')}\n`);

  const name = await chooseName(args, interactive);
  const size = await chooseSize(args, interactive);
  const dir = path.resolve(process.cwd(), name);

  const existing = await entriesOf(dir);
  if (existing.length > 0) {
    throw new Error(`The folder "${name}" already exists and is not empty. Pick another name or empty it first.`);
  }

  log(`\nCreating a ${bold(size)} project in ${green(dir)}`);
  const files = await scaffold({ name, size, dir });
  log(`${green('✔')} Wrote ${files.length} files`);

  const pm = args.pm ?? detectPackageManager();
  let installed = false;
  if (args.install) {
    log(`\nInstalling dependencies with ${bold(pm)}...\n`);
    installed = installDependencies(pm, dir);
    if (!installed) warn(`Installing failed. Run "${pm} install" inside ${name} when you are online.`);
  }

  if (args.git) {
    if (initGit(dir)) log(`${green('✔')} Initialised a git repository`);
  }

  const run = (script: string): string => (pm === 'npm' ? `npm run ${script}` : `${pm} ${script}`);
  log(`\n${green('Done.')} Next steps:\n`);
  log(`  ${cyan(`cd ${name}`)}`);
  if (!installed) log(`  ${cyan(`${pm} install`)}`);
  log(`  ${cyan('docker compose up -d mongo')}  ${dim('start MongoDB (or put your Atlas URL in .env as MONGODB_URI)')}`);
  log(`  ${cyan(run('dev'))}      ${dim('start with auto-reload')}`);
  log(`  ${cyan(run('test'))}     ${dim('run the tests (no database needed)')}`);
  log(`  ${cyan(run('build'))}    ${dim('compile for production')}\n`);
  log(dim(`Open README.md in ${name} for the project layout and the API.`));
}

main().catch((e: unknown) => {
  const message = e instanceof Error ? e.message : String(e);
  if (message === 'cancelled') {
    process.stdout.write('\x1b[?25h\n');
    log('Cancelled.');
    process.exit(130);
  }
  fail(message);
  process.exit(1);
});
