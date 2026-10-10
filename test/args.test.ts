import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseCliArgs } from '../src/args';

describe('parseCliArgs', () => {
  it('uses safe defaults', () => {
    assert.deepEqual(parseCliArgs([]), {
      name: undefined, size: undefined, yes: false, install: true, git: true, pm: undefined, help: false, version: false,
    });
  });

  it('reads a name, size and flags', () => {
    const args = parseCliArgs(['my-api', '--size', 'large', '-y', '--no-install', '--no-git', '--pm', 'pnpm']);
    assert.equal(args.name, 'my-api');
    assert.equal(args.size, 'large');
    assert.equal(args.yes, true);
    assert.equal(args.install, false);
    assert.equal(args.git, false);
    assert.equal(args.pm, 'pnpm');
  });

  it('accepts short flags and --size=value', () => {
    assert.equal(parseCliArgs(['-s', 'small']).size, 'small');
    assert.equal(parseCliArgs(['--size=large']).size, 'large');
    assert.equal(parseCliArgs(['-h']).help, true);
    assert.equal(parseCliArgs(['-v']).version, true);
  });

  it('rejects bad input with a readable message', () => {
    assert.throws(() => parseCliArgs(['--size', 'huge']), /--size must be "small" or "large"/);
    assert.throws(() => parseCliArgs(['--pm', 'bun']), /--pm must be npm, pnpm or yarn/);
    assert.throws(() => parseCliArgs(['--nope']), /Unknown option/);
    assert.throws(() => parseCliArgs(['a', 'b']), /Expected one project name/);
  });
});
