import type { Request, Response } from 'express';
import { pickStrings } from '../../core/utils/validate';
import { loginUser, registerUser } from './auth.service';

// POST /api/auth/register   body: { name, email, password }
export async function register(req: Request, res: Response): Promise<void> {
  const { name, email, password } = pickStrings(req.body, ['name', 'email', 'password']);
  res.status(201).json(await registerUser(name, email, password));
}

// POST /api/auth/login   body: { email, password }
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = pickStrings(req.body, ['email', 'password']);
  res.json(await loginUser(email, password));
}

// GET /api/auth/me   header: Authorization: Bearer <token>
export function me(req: Request, res: Response): void {
  res.json({ user: req.user });
}
