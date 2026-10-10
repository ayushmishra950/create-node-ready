import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env';

// A small login token (a JWT signed with HS256) built with Node's crypto module.
// If you later need refresh tokens or other algorithms, replace this file with the jsonwebtoken package.

interface TokenPayload {
  sub: string; // the user id
  iat: number; // issued at (seconds)
  exp: number; // expires at (seconds)
}

const toBase64 = (value: string | Buffer): string => Buffer.from(value).toString('base64url');
const sign = (data: string): Buffer => createHmac('sha256', env.JWT_SECRET).update(data).digest();
const HEADER = toBase64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));

export function signToken(userId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const body = toBase64(JSON.stringify({ sub: userId, iat: now, exp: now + env.JWT_EXPIRES_IN }));
  return `${HEADER}.${body}.${toBase64(sign(`${HEADER}.${body}`))}`;
}

/** Returns the token's data, or null if the token is fake, changed or expired. */
export function verifyToken(token: string): TokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== HEADER) return null; // also rejects tokens with "alg: none"

  const [, body, signature] = parts as [string, string, string];
  const expected = sign(`${HEADER}.${body}`);
  const actual = Buffer.from(signature, 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Partial<TokenPayload>;
    if (typeof payload.sub !== 'string' || typeof payload.exp !== 'number') return null;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload as TokenPayload;
  } catch {
    return null;
  }
}
