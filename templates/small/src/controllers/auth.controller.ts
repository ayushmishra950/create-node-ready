import type { Request, Response } from 'express';
import { User } from '../models/User';
import { AppError } from '../utils/errors';
import { hashPassword, verifyPassword } from '../utils/password';
import { signToken } from '../utils/token';
import { pickStrings } from '../utils/validate';

// A controller reads the request, uses the model, and sends the response.

// POST /api/auth/register   body: { name, email, password }
export async function register(req: Request, res: Response): Promise<void> {
  const { name, email, password } = pickStrings(req.body, ['name', 'email', 'password']);
  if (password.length < 8) throw new AppError(400, 'Password must be at least 8 characters');

  const user = await User.create({ name, email, password: await hashPassword(password) });

  res.status(201).json({ user, token: signToken(user.id) });
}

// POST /api/auth/login   body: { email, password }
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = pickStrings(req.body, ['email', 'password']);

  const user = await User.findOne({ email: email.trim().toLowerCase() });
  // Same message for "no such email" and "wrong password", so nobody can find out which emails exist.
  if (!user || !(await verifyPassword(password, user.password))) throw new AppError(401, 'Wrong email or password');

  res.json({ user, token: signToken(user.id) });
}

// GET /api/auth/me   header: Authorization: Bearer <token>
export function me(req: Request, res: Response): void {
  res.json({ user: req.user });
}
