import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';

const CLI = path.resolve(__dirname, '..', 'src', 'cli.js');
let cwd: string;
before(async () => void (cwd = await mkdtemp(path.join(tmpdir(), 'cnc-cli-'))));
after(() => rm(cwd, { recursive: true, force: true }));

const run = (...args: string[]) =>
  spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' }, input: '' });
const exists = (file: string) => stat(path.join(cwd, file)).then(() => true, () => false);

describe('cli', () => {
  it('--help and --version work', () => {
    const help = run('--help');
    assert.equal(help.status, 0);
    assert.match(help.stdout, /Usage/);
    assert.match(help.stdout, /--size <small\|large>/);
    assert.match(run('--version').stdout, /^\d+\.\d+\.\d+\n$/);
  });

  it('creates a project without asking anything when flags are given', async () => {
    const res = run('flag-app', '--size', 'large', '--no-install', '--no-git');
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /Creating a large project/);
    assert.match(res.stdout, /cd flag-app/);
    assert.ok(await exists('flag-app/src/server.ts'));
  });

  it('--yes uses node-app and the small layout', async () => {
    const res = run('--yes', '--no-install', '--no-git');
    assert.equal(res.status, 0, res.stderr);
    assert.ok(await exists('node-app/src/index.ts'));
  });

  it('refuses to write into a folder that is not empty and leaves it alone', async () => {
    await mkdir(path.join(cwd, 'taken'));
    await writeFile(path.join(cwd, 'taken', 'keep.txt'), 'mine');
    const res = run('taken', '--size', 'small', '--no-install', '--no-git');
    assert.equal(res.status, 1);
    assert.match(res.stderr, /already exists and is not empty/);
    assert.ok(!(await exists('taken/package.json')));
  });

  it('rejects a bad name before writing anything', async () => {
    for (const name of ['Bad Name', '../escape', 'UPPER']) {
      const res = run(name, '--size', 'small', '--no-install', '--no-git');
      assert.equal(res.status, 1, name);
      assert.match(res.stderr, /Invalid project name/);
    }
    assert.ok(!(await exists('../escape')));
  });

  it('without a terminal it asks for flags instead of hanging', () => {
    const noName = run('--size', 'small');
    assert.equal(noName.status, 1);
    assert.match(noName.stderr, /No project name given/);
    const noSize = run('some-app');
    assert.equal(noSize.status, 1);
    assert.match(noSize.stderr, /No size given/);
  });

  it('reports unknown options', () => {
    const res = run('--bogus');
    assert.equal(res.status, 1);
    assert.match(res.stderr, /Unknown option/);
  });
});
