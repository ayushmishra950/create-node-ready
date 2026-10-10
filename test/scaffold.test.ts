import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { databaseName, entriesOf, scaffold } from '../src/scaffold';

let root: string;
before(async () => void (root = await mkdtemp(path.join(tmpdir(), 'cnc-scaffold-'))));
after(() => rm(root, { recursive: true, force: true }));

const exists = (file: string) => stat(file).then(() => true, () => false);

describe('scaffold', () => {
  it('small: writes the MVC layout', async () => {
    const dir = path.join(root, 'small-app');
    const files = await scaffold({ name: 'small-app', size: 'small', dir });
    for (const f of [
      'src/index.ts', 'src/app.ts', 'src/app.test.ts', 'src/config/env.ts', 'src/config/database.ts', 'src/controllers/auth.controller.ts',
      'src/middlewares/auth.middleware.ts', 'src/models/User.ts', 'src/routes/auth.routes.ts', 'src/utils/logger.ts', 'src/types/express.d.ts',
      'docker-compose.yml', '.env', '.env.example', '.gitignore', '.editorconfig', 'tsconfig.json', 'tsconfig.build.json', 'package.json', 'README.md',
    ]) {
      assert.ok(files.includes(f), `${f} was created`);
      assert.ok(await exists(path.join(dir, f)), `${f} is on disk`);
    }
    assert.ok(!files.some((f) => f.startsWith('docker/') || f.startsWith('src/modules') || f.startsWith('src/core')), 'no large-only files');
    assert.ok(!files.some((f) => /repository/i.test(f)), 'no repository layer');
  });

  it('large: writes the modular layout with Docker', async () => {
    const dir = path.join(root, 'large-app');
    const files = await scaffold({ name: 'large-app', size: 'large', dir });
    for (const f of [
      'src/server.ts', 'src/app.ts', 'src/app.test.ts', 'src/routes.ts', 'src/@types/express.d.ts', 'src/config/database.ts',
      'src/core/utils/errors.ts', 'src/core/middlewares/error.middleware.ts', 'src/core/schemaOptions.ts',
      'src/modules/auth/auth.middleware.ts', 'src/modules/users/user.model.ts', 'src/modules/users/users.service.ts',
      'src/modules/orders/order.model.ts', 'src/modules/orders/orders.controller.ts', 'src/jobs/index.ts', 'src/integrations/httpClient.ts',
      'docker/Dockerfile', 'docker-compose.yml', '.dockerignore', '.gitignore',
    ]) assert.ok(await exists(path.join(dir, f)), `${f} is on disk`);
    assert.ok(!files.some((f) => f.startsWith('src/controllers') || f.startsWith('src/models')), 'no small-only files');
    assert.ok(!files.some((f) => /repository/i.test(f)), 'no repository layer');
  });

  it('writes a valid package.json with the right entry point and no dotenv', async () => {
    for (const [size, entry] of [['small', 'index'], ['large', 'server']] as const) {
      const pkg = JSON.parse(await readFile(path.join(root, `${size}-app`, 'package.json'), 'utf8'));
      assert.equal(pkg.name, `${size}-app`);
      assert.equal(pkg.scripts.dev, `tsx watch src/${entry}.ts`);
      assert.equal(pkg.scripts.start, `node dist/${entry}.js`);
      assert.deepEqual(Object.keys(pkg.dependencies).sort(), ['express', 'mongoose']);
      assert.ok(!('dotenv' in pkg.dependencies));
      assert.match(pkg.engines.node, /^>=20\.19$/);
    }
  });

  it('puts a database name made from the project name into .env and the Docker files', async () => {
    const dir = path.join(root, 'my-shop.api');
    await scaffold({ name: 'my-shop.api', size: 'large', dir });
    assert.match(await readFile(path.join(dir, '.env'), 'utf8'), /^MONGODB_URI=mongodb:\/\/127\.0\.0\.1:27017\/my_shop_api$/m);
    assert.match(await readFile(path.join(dir, 'docker-compose.yml'), 'utf8'), /mongodb:\/\/mongo:27017\/my_shop_api/);
    assert.equal(databaseName('a'), 'a');
    assert.equal(databaseName('--x--'), 'x');
    assert.equal(databaseName('a'.repeat(80)).length, 50);
  });

  it('gives every project its own secret, and never puts it in .env.example', async () => {
    const a = await readFile(path.join(root, 'small-app', '.env'), 'utf8');
    const b = await readFile(path.join(root, 'large-app', '.env'), 'utf8');
    const secret = (text: string) => /^JWT_SECRET=(.+)$/m.exec(text)?.[1] ?? '';
    assert.match(secret(a), /^[0-9a-f]{64}$/);
    assert.notEqual(secret(a), secret(b));
    const example = await readFile(path.join(root, 'small-app', '.env.example'), 'utf8');
    assert.ok(!example.includes(secret(a)));
  });

  it('replaces {{name}} everywhere and renames the underscore files', async () => {
    const readme = await readFile(path.join(root, 'large-app', 'README.md'), 'utf8');
    assert.ok(readme.startsWith('# large-app'));
    const dockerfile = await readFile(path.join(root, 'large-app', 'docker', 'Dockerfile'), 'utf8');
    assert.ok(dockerfile.includes('-t large-app'));
    assert.ok(!(await exists(path.join(root, 'large-app', '_gitignore'))));
    assert.match(await readFile(path.join(root, 'small-app', '.gitignore'), 'utf8'), /^node_modules\/$/m);
  });
});

describe('entriesOf', () => {
  it('is empty for a missing folder and lists a used one', async () => {
    assert.deepEqual(await entriesOf(path.join(root, 'nope')), []);
    assert.ok((await entriesOf(path.join(root, 'small-app'))).includes('package.json'));
  });
});
