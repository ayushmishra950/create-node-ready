import type { Request, Response } from 'express';
import { pickStrings } from '../../core/utils/validate';
import { cancelOrder, createOrder, getOrder, listOrders } from './orders.service';

// requireAuth runs before these, so req.user is always set here (that is why we write req.user!).

// GET /api/orders
export async function list(req: Request, res: Response): Promise<void> {
  res.json({ orders: await listOrders(req.user!.id) });
}

// POST /api/orders   body: { item, quantity? }
export async function create(req: Request, res: Response): Promise<void> {
  const { item } = pickStrings(req.body, ['item']);
  res.status(201).json({ order: await createOrder(req.user!.id, item, req.body.quantity) });
}

// GET /api/orders/:id
export async function show(req: Request<{ id: string }>, res: Response): Promise<void> {
  res.json({ order: await getOrder(req.params.id, req.user!.id) });
}

// POST /api/orders/:id/cancel
export async function cancel(req: Request<{ id: string }>, res: Response): Promise<void> {
  res.json({ order: await cancelOrder(req.params.id, req.user!.id) });
}
