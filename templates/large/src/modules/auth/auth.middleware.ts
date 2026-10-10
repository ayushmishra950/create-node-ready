import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../core/utils/errors';
import { verifyToken } from '../../core/utils/token';
import { User } from '../users/user.model';

/** Put this before a route to make it private. It reads "Authorization: Bearer <token>" and sets req.user. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');
  const payload = scheme === 'Bearer' && token ? verifyToken(token) : null;
  const user = payload ? await User.findById(payload.sub) : null;

  if (!user) throw new AppError(401, 'Please log in first');
  req.user = user;
  next();
}
