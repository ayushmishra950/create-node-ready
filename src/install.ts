import { spawnSync } from 'node:child_process';
import type { PackageManager } from './validate';

const run = (command: string, args: string[], cwd: string, inherit: boolean): boolean => {
  const result = spawnSync(command, args, {
    cwd,
    stdio: inherit ? 'inherit' : 'ignore',
    shell: process.platform === 'win32', // npm.cmd / pnpm.cmd need a shell on Windows
  });
  return result.status === 0;
};

export const installDependencies = (pm: PackageManager, cwd: string): boolean => run(pm, ['install'], cwd, true);

/** Runs `git init`; false when git is not installed or the folder is already inside a repository. */
export function initGit(cwd: string): boolean {
  if (!run('git', ['--version'], cwd, false)) return false;
  if (run('git', ['rev-parse', '--is-inside-work-tree'], cwd, false)) return false;
  return run('git', ['init', '-q'], cwd, false);
}
