import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { detectPackageManager, nodeIsSupported, projectNameProblem } from '../src/validate';

describe('projectNameProblem', () => {
  it('accepts normal names', () => {
    for (const name of ['node-app', 'my.api', 'api_2', 'a', '1service']) assert.equal(projectNameProblem(name), null, name);
  });

  it('rejects names npm or the file system would not like', () => {
    const bad = ['', ' app', 'My-App', 'my app', '.hidden', '_private', '../evil', 'a/b', 'a\\b', '@scope/x', 'node_modules', 'fs', 'http', 'x'.repeat(101), 'app!', 'ünï'];
    for (const name of bad) assert.notEqual(projectNameProblem(name), null, JSON.stringify(name));
  });
});

describe('detectPackageManager', () => {
  it('reads the user agent npm / pnpm / yarn set', () => {
    assert.equal(detectPackageManager('pnpm/9.1.0 npm/? node/v22 darwin arm64'), 'pnpm');
    assert.equal(detectPackageManager('yarn/1.22.0 npm/? node/v22'), 'yarn');
    assert.equal(detectPackageManager('npm/10.2.0 node/v22'), 'npm');
    assert.equal(detectPackageManager('bun/1.1.0'), 'npm', 'unsupported managers fall back to npm');
    assert.equal(detectPackageManager(''), 'npm');
  });
});

describe('nodeIsSupported', () => {
  it('needs 20.19 or newer', () => {
    assert.equal(nodeIsSupported('20.19.0'), true);
    assert.equal(nodeIsSupported('20.18.9'), false);
    assert.equal(nodeIsSupported('20.12.0'), false);
    assert.equal(nodeIsSupported('18.20.0'), false);
    assert.equal(nodeIsSupported('22.0.0'), true);
  });
});
