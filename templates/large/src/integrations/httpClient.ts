import { AppError } from '../core/utils/errors';

// Helper for calling other services (payments, email, ...): a timeout on every call, and a clear
// 502 error when the other side is down or fails. Put one file per external service in this folder
// and build it on top of requestJson().

export async function requestJson<T>(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const { timeoutMs = 5_000, ...options } = init;

  let response: Response;
  try {
    response = await fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    throw new AppError(502, 'The other service is not reachable');
  }
  if (!response.ok) throw new AppError(502, `The other service answered with status ${response.status}`);

  return (await response.json()) as T;
}
