import type { Request, Response } from 'express';
import { getUser, listUsers } from './users.service';

// A controller reads the request, calls the service, and sends the response.

// GET /api/users
export async function list(_req: Request, res: Response): Promise<void> {
  res.json({ users: await listUsers() });
}

// GET /api/users/:id
export async function show(req: Request<{ id: string }>, res: Response): Promise<void> {
  res.json({ user: await getUser(req.params.id) });
}
