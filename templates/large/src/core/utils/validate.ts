import { AppError } from './errors';

/**
 * Reads text fields from a request body and returns them.
 * Sends a 400 error if the body is not an object or a field is missing or not text.
 *
 *   const { email, password } = pickStrings(req.body, ['email', 'password']);
 *
 * Checking for text matters: it stops requests like { "email": { "$ne": null } }.
 */
export function pickStrings<K extends string>(body: unknown, keys: K[]): Record<K, string> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new AppError(400, 'Send a JSON object as the request body');
  }

  const values = body as Record<string, unknown>;
  const result = {} as Record<K, string>;
  for (const key of keys) {
    const value = values[key];
    if (typeof value !== 'string' || value.trim() === '') throw new AppError(400, `"${key}" is required and must be text`);
    result[key] = value;
  }
  return result;
}
