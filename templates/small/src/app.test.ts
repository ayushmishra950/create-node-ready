import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, describe, it } from 'node:test';

// Most tests need no database. The ones in "with MongoDB" run only when you give a TEST database:
//   MONGODB_URI_TEST=mongodb://127.0.0.1:27017/myapp_test npm test
// That database is emptied and deleted at the end, so its name must end with "_test".
const testUri = process.env.MONGODB_URI_TEST;
const databaseName = testUri?.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^/?]+)/)?.[1];
if (testUri && !databaseName?.endsWith('_test')) {
  throw new Error('MONGODB_URI_TEST must point to a database whose name ends with "_test"');
}

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-with-more-than-16-chars';
process.env.MONGODB_URI = testUri ?? 'mongodb://127.0.0.1:27017/not_used_test';

let server: Server;
let base = '';

before(async () => {
  // Imported here, after the settings above, because config/env.ts reads them when it loads.
  const { createApp } = await import('./app.js');
  if (testUri) await (await import('./config/database.js')).connectDatabase();
  server = createApp().listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  server.close();
  if (testUri) {
    const { default: mongoose } = await import('mongoose');
    await mongoose.connection.dropDatabase();
    await (await import('./config/database.js')).disconnectDatabase();
  }
});

const send = (method: string, path: string, body?: unknown, token?: string) =>
  fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });

const errorOf = async (res: Response) => ((await res.json()) as { error: { message: string; fields?: Record<string, string> } }).error;

describe('without a database', () => {
  it('answers the health check with safe headers', async () => {
    const res = await send('GET', '/health');
    assert.equal(res.status, 200);
    assert.equal(((await res.json()) as { status: string }).status, 'ok');
    assert.equal(res.headers.get('x-powered-by'), null);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  });

  it('returns a JSON 404 for unknown routes', async () => {
    const res = await send('GET', '/nope');
    assert.equal(res.status, 404);
    assert.match((await errorOf(res)).message, /Cannot GET \/nope/);
  });

  it('rejects broken JSON with 400', async () => {
    const res = await send('POST', '/api/auth/register', '{bad json');
    assert.equal(res.status, 400);
    assert.match((await errorOf(res)).message, /not valid JSON/);
  });

  it('rejects missing, wrong-type and injected fields with 400', async () => {
    assert.equal((await send('POST', '/api/auth/register', {})).status, 400);
    assert.equal((await send('POST', '/api/auth/login', { email: { $ne: null }, password: 'x' })).status, 400);
    assert.equal((await send('POST', '/api/auth/register', [])).status, 400);
  });

  it('requires a password of at least 8 characters', async () => {
    const res = await send('POST', '/api/auth/register', { name: 'A', email: 'a@b.co', password: 'short' });
    assert.equal(res.status, 400);
    assert.match((await errorOf(res)).message, /at least 8/);
  });

  it('keeps /me private', async () => {
    assert.equal((await send('GET', '/api/auth/me')).status, 401);
    assert.equal((await send('GET', '/api/auth/me', undefined, 'abc.def.ghi')).status, 401);
  });
});

describe('with MongoDB', { skip: testUri ? false : 'set MONGODB_URI_TEST to run these' }, () => {
  const user = { name: 'Dev', email: 'Dev@Example.com', password: 'correct horse' };

  it('registers a user without leaking the password', async () => {
    const res = await send('POST', '/api/auth/register', user);
    assert.equal(res.status, 201);
    const body = (await res.json()) as { user: Record<string, unknown>; token: string };
    assert.equal(body.user.email, 'dev@example.com');
    assert.equal(typeof body.user.id, 'string');
    assert.ok(!('password' in body.user) && !('_id' in body.user) && !('__v' in body.user));
    assert.ok(body.token);
  });

  it('does not allow the same email twice', async () => {
    const res = await send('POST', '/api/auth/register', user);
    assert.equal(res.status, 409);
    assert.match((await errorOf(res)).message, /email already exists/);
  });

  it('shows which fields are invalid', async () => {
    const res = await send('POST', '/api/auth/register', { name: 'X', email: 'not-an-email', password: 'longenough' });
    assert.equal(res.status, 400);
    assert.ok((await errorOf(res)).fields?.email);
  });

  it('logs in and reads the profile', async () => {
    assert.equal((await send('POST', '/api/auth/login', { email: user.email, password: 'wrong password' })).status, 401);
    assert.equal((await send('POST', '/api/auth/login', { email: 'nobody@example.com', password: 'whatever12' })).status, 401);

    const login = await send('POST', '/api/auth/login', { email: ' DEV@example.com ', password: user.password });
    assert.equal(login.status, 200);
    const { token } = (await login.json()) as { token: string };

    const me = await send('GET', '/api/auth/me', undefined, token);
    assert.equal(me.status, 200);
    assert.equal(((await me.json()) as { user: { name: string } }).user.name, 'Dev');
  });
});
