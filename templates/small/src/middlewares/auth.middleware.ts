import type { NextFunction, Request, Response } from 'express';
import { User } from '../models/User';
import { AppError } from '../utils/errors';
import { verifyToken } from '../utils/token';

/** Put this before a route to make it private. It reads "Authorization: Bearer <token>" and sets req.user. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');
  const payload = scheme === 'Bearer' && token ? verifyToken(token) : null;
  const user = payload ? await User.findById(payload.sub) : null;

  if (!user) throw new AppError(401, 'Please log in first');
  req.user = user;
  next();
}
