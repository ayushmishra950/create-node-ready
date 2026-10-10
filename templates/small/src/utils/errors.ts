/**
 * Throw this anywhere (controller, middleware) to send an error response:
 *   throw new AppError(404, 'User not found');
 * The client receives { "error": { "message": "User not found" } } with that status.
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
