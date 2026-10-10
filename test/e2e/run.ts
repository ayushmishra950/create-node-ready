// Real end-to-end check (needs network): for each size, create a project with the built CLI,
// install from the registry, typecheck, run its tests (also against a real MongoDB), build it,
// start the compiled server and call it over HTTP. MongoDB runs in memory via mongodb-memory-server.
import { spawn } from 'node:child_process';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { MongoMemoryServer } from 'mongodb-memory-server';

const CLI = path.resolve(__dirname, '..', '..', 'src', 'cli.js');
const sizes = process.argv.slice(2).length ? process.argv.slice(2) : ['small', 'large'];
let failed = false;

const step = (label: string, ok: boolean, extra = ''): void => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${!ok && extra ? `\n${extra}` : ''}`);
  if (!ok) failed = true;
};
const exists = (file: string) => stat(file).then(() => true, () => false);
// Async on purpose: while we wait, this process must keep reading the in-memory MongoDB's output,
// otherwise mongod blocks on a full pipe and the tests hang.
const sh = (cwd: string, command: string, args: string[], env: NodeJS.ProcessEnv = {}) =>
  new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve) => {
    const child = spawn(command, args, { cwd, env: { ...process.env, NO_COLOR: '1', ...env } });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('close', (status) => resolve({ status, stdout, stderr }));
  });
const tail = (r: { stdout: string; stderr: string }) => (r.stdout + r.stderr).slice(-1800);

type Json = Record<string, any>;
const call = async (base: string, method: string, url: string, body?: unknown, token?: string): Promise<{ status: number; json: Json }> => {
  const res = await fetch(base + url, {
    method,
    headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json().catch(() => ({}))) as Json };
};

async function check(size: string, mongoUri: string): Promise<void> {
  console.log(`\n== ${size} ==`);
  const cwd = await mkdtemp(path.join(tmpdir(), `cnc-e2e-${size}-`));
  const name = `${size}-api`;
  const dir = path.join(cwd, name);
  const dbName = `${size}_api`;
  try {
    const created = await sh(cwd, process.execPath, [CLI, name, '--size', size]);
    step('cli: create + npm install', created.status === 0, tail(created));
    if (created.status !== 0) return;
    step('cli: git init', await exists(path.join(dir, '.git')));

    const typecheck = await sh(dir, 'npm', ['run', 'typecheck']);
    step('npm run typecheck', typecheck.status === 0, tail(typecheck));

    const noDb = await sh(dir, 'npm', ['test']);
    step('npm test (no database: DB tests are skipped)', noDb.status === 0 && /skipped/.test(noDb.stdout) || /# skipped [1-9]/.test(noDb.stdout), tail(noDb));
    const withDb = await sh(dir, 'npm', ['test'], { MONGODB_URI_TEST: `${mongoUri}${dbName}_test` });
    step('npm test (with MongoDB: all tests run)', withDb.status === 0 && /# fail 0/.test(withDb.stdout) && /# skipped 0/.test(withDb.stdout), tail(withDb));
    const unsafe = await sh(dir, 'npm', ['test'], { MONGODB_URI_TEST: `${mongoUri}${dbName}` });
    step('npm test refuses a database not named *_test', unsafe.status !== 0 && /ends with "_test"/.test(unsafe.stdout + unsafe.stderr), tail(unsafe));

    const build = await sh(dir, 'npm', ['run', 'build']);
    step('npm run build', build.status === 0, tail(build));
    const entry = size === 'small' ? 'index' : 'server';
    step(`dist/${entry}.js built, test files not emitted`, (await exists(path.join(dir, 'dist', `${entry}.js`))) && !(await exists(path.join(dir, 'dist', 'app.test.js'))));

    // start the compiled server like production would (npm start), with the generated .env + a real MongoDB
    const port = 4300 + (size === 'large' ? 1 : 0);
    const server = spawn('npm', ['start'], { cwd: dir, env: { ...process.env, PORT: String(port), MONGODB_URI: `${mongoUri}${dbName}` } });
    let log = '';
    server.stdout.on('data', (d) => (log += d));
    server.stderr.on('data', (d) => (log += d));
    const exited = new Promise<number | null>((resolve) => server.on('exit', resolve));
    for (let i = 0; i < 80 && !log.includes('server started'); i++) await new Promise((r) => setTimeout(r, 100));
    step('server starts, connects to MongoDB', log.includes('database connected') && log.includes('server started'), log);

    const base = `http://127.0.0.1:${port}`;
    step('GET /health', (await call(base, 'GET', '/health')).json.status === 'ok');

    const user = { name: 'Amit', email: 'Amit@Example.com', password: 'password123' };
    const reg = await call(base, 'POST', '/api/auth/register', user);
    const token: string = reg.json.token;
    step('register -> 201, email lowercased, no password/_id/__v in response',
      reg.status === 201 && reg.json.user.email === 'amit@example.com' && typeof reg.json.user.id === 'string' &&
        !('password' in reg.json.user) && !('_id' in reg.json.user) && !('__v' in reg.json.user) && Boolean(token));
    step('register same email again -> 409', (await call(base, 'POST', '/api/auth/register', user)).status === 409);
    const badEmail = await call(base, 'POST', '/api/auth/register', { name: 'X', email: 'nope', password: 'password123' });
    step('invalid email -> 400 with fields.email', badEmail.status === 400 && Boolean(badEmail.json.error.fields?.email));
    step('short password -> 400', (await call(base, 'POST', '/api/auth/register', { ...user, email: 'b@c.co', password: 'short' })).status === 400);
    step('NoSQL injection in login -> 400', (await call(base, 'POST', '/api/auth/login', { email: { $ne: null }, password: 'x' })).status === 400);
    step('wrong password / unknown email -> 401', (await call(base, 'POST', '/api/auth/login', { email: user.email, password: 'wrongpass1' })).status === 401 && (await call(base, 'POST', '/api/auth/login', { email: 'who@x.co', password: 'password123' })).status === 401);
    const login = await call(base, 'POST', '/api/auth/login', { email: ' AMIT@example.com ', password: user.password });
    step('login (mixed case + spaces) -> 200 + token', login.status === 200 && Boolean(login.json.token));
    const me = await call(base, 'GET', '/api/auth/me', undefined, login.json.token);
    step('GET /api/auth/me with token -> user', me.status === 200 && me.json.user.name === 'Amit');
    step('GET /api/auth/me without / with fake token -> 401', (await call(base, 'GET', '/api/auth/me')).status === 401 && (await call(base, 'GET', '/api/auth/me', undefined, 'a.b.c')).status === 401);
    const noneToken = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: reg.json.user.id, exp: 9999999999 })).toString('base64url')}.`;
    step('token with alg "none" -> 401', (await call(base, 'GET', '/api/auth/me', undefined, noneToken)).status === 401);
    step('unknown route -> JSON 404', (await call(base, 'GET', '/missing')).json.error?.message?.includes('Cannot GET'));
    const rawBad = await fetch(`${base}/api/auth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{oops' });
    step('broken JSON -> 400', rawBad.status === 400);
    const big = await fetch(`${base}/api/auth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ x: 'a'.repeat(200_000) }) });
    step('oversized body -> 413', big.status === 413);

    if (size === 'large') {
      const other = (await call(base, 'POST', '/api/auth/register', { name: 'Other', email: 'o@x.co', password: 'password123' })).json.token;
      const order = await call(base, 'POST', '/api/orders', { item: 'Keyboard', quantity: 2 }, token);
      const id: string = order.json.order?.id;
      step('create order -> 201 (pending, quantity 2)', order.status === 201 && order.json.order.status === 'pending' && order.json.order.quantity === 2);
      step('read own order 200, other user 403, unknown 404, bad id 400',
        (await call(base, 'GET', `/api/orders/${id}`, undefined, token)).status === 200 &&
          (await call(base, 'GET', `/api/orders/${id}`, undefined, other)).status === 403 &&
          (await call(base, 'GET', '/api/orders/64b7f0c2a1b2c3d4e5f60718', undefined, token)).status === 404 &&
          (await call(base, 'GET', '/api/orders/nope', undefined, token)).status === 400);
      step('order quantity 0 / 1.5 / "abc" -> 400', (await Promise.all([0, 1.5, 'abc'].map((quantity) => call(base, 'POST', '/api/orders', { item: 'M', quantity }, token)))).every((r) => r.status === 400));
      step('cancel -> 200, cancel again -> 409', (await call(base, 'POST', `/api/orders/${id}/cancel`, undefined, token)).status === 200 && (await call(base, 'POST', `/api/orders/${id}/cancel`, undefined, token)).status === 409);
      step('orders and users need a login', (await call(base, 'GET', '/api/orders')).status === 401 && (await call(base, 'GET', '/api/users')).status === 401);
      const users = await call(base, 'GET', '/api/users', undefined, token);
      step('GET /api/users hides passwords', users.status === 200 && users.json.users.length >= 2 && users.json.users.every((u: Json) => !('password' in u)));
    }

    // graceful shutdown: SIGTERM must stop the process with exit code 0
    server.kill('SIGTERM');
    const code = await Promise.race([exited, new Promise<string>((r) => setTimeout(() => r('timeout'), 10000))]);
    step('SIGTERM shuts down cleanly (exit 0)', code === 0, `exit=${String(code)}\n${log}`);
    if (code === 'timeout') server.kill('SIGKILL');
    step('logs: started, connected, shutting down', /server started/.test(log) && /shutting down/.test(log));

    const badEnv = await sh(dir, process.execPath, [`dist/${entry}.js`], { JWT_SECRET: 'short', PORT: 'abc', MONGODB_URI: 'http://wrong' });
    step('invalid .env stops the server with a clear message (no stack trace)',
      badEnv.status === 1 && /PORT must be/.test(badEnv.stderr) && /JWT_SECRET must be at least/.test(badEnv.stderr) && /MONGODB_URI must start with/.test(badEnv.stderr) && !/at .*\.js:\d+/.test(badEnv.stderr), badEnv.stderr);

    const started = Date.now();
    const noDbServer = await sh(dir, process.execPath, [`dist/${entry}.js`], { MONGODB_URI: 'mongodb://user:secretpw@127.0.0.1:1/x' });
    const out = noDbServer.stdout + noDbServer.stderr;
    step('MongoDB not reachable -> exits 1 with a helpful message, password hidden',
      noDbServer.status === 1 && /Cannot connect to MongoDB/.test(out) && !out.includes('secretpw') && Date.now() - started < 15000, out);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
}

(async () => {
  const mongo = await MongoMemoryServer.create();
  try {
    for (const size of sizes) await check(size, mongo.getUri());
  } finally {
    await mongo.stop();
  }
  console.log(failed ? '\nE2E FAILED' : '\nE2E OK');
  process.exit(failed ? 1 : 0);
})();
