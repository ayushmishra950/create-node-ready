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

describe('orders and users (with MongoDB)', { skip: testUri ? false : 'set MONGODB_URI_TEST to run these' }, () => {
  const signUp = async (email: string): Promise<string> => {
    const res = await send('POST', '/api/auth/register', { name: 'Test', email, password: 'correct horse' });
    return ((await res.json()) as { token: string }).token;
  };

  it('needs a login for orders and users', async () => {
    assert.equal((await send('GET', '/api/orders')).status, 401);
    assert.equal((await send('GET', '/api/users')).status, 401);
  });

  it('creates, reads and cancels an order; other users cannot see it', async () => {
    const owner = await signUp('owner@example.com');
    const other = await signUp('other@example.com');

    const created = await send('POST', '/api/orders', { item: 'Keyboard', quantity: 2 }, owner);
    assert.equal(created.status, 201);
    const { order } = (await created.json()) as { order: { id: string; status: string; quantity: number } };
    assert.equal(order.status, 'pending');
    assert.equal(order.quantity, 2);

    assert.equal((await send('GET', `/api/orders/${order.id}`, undefined, owner)).status, 200);
    assert.equal((await send('GET', `/api/orders/${order.id}`, undefined, other)).status, 403);
    assert.equal((await send('GET', '/api/orders/64b7f0c2a1b2c3d4e5f60718', undefined, owner)).status, 404);
    assert.equal((await send('GET', '/api/orders/not-an-id', undefined, owner)).status, 400);

    assert.equal((await send('POST', `/api/orders/${order.id}/cancel`, undefined, owner)).status, 200);
    assert.equal((await send('POST', `/api/orders/${order.id}/cancel`, undefined, owner)).status, 409);

    const list = (await (await send('GET', '/api/orders', undefined, owner)).json()) as { orders: unknown[] };
    assert.equal(list.orders.length, 1);
    const otherList = (await (await send('GET', '/api/orders', undefined, other)).json()) as { orders: unknown[] };
    assert.equal(otherList.orders.length, 0);
  });

  it('checks the order fields', async () => {
    const token = await signUp('validate@example.com');
    assert.equal((await send('POST', '/api/orders', { item: 'Mouse', quantity: 0 }, token)).status, 400);
    assert.equal((await send('POST', '/api/orders', { item: 'Mouse', quantity: 1.5 }, token)).status, 400);
    assert.equal((await send('POST', '/api/orders', { item: 'Mouse', quantity: 'abc' }, token)).status, 400);
    assert.equal((await send('POST', '/api/orders', { quantity: 1 }, token)).status, 400);
    const ok = await send('POST', '/api/orders', { item: 'Mouse' }, token);
    assert.equal(ok.status, 201, 'quantity defaults to 1');
  });

  it('lists users without password hashes', async () => {
    const token = await signUp('list@example.com');
    const { users } = (await (await send('GET', '/api/users', undefined, token)).json()) as { users: Record<string, unknown>[] };
    assert.ok(users.length >= 1);
    assert.ok(users.every((user) => !('password' in user) && !('_id' in user)));
  });
});
