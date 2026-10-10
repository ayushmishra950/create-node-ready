import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware';
import { cancel, create, list, show } from './orders.controller';

export const ordersRoutes = Router();

ordersRoutes.use(requireAuth); // every orders route needs a login
ordersRoutes.get('/', list);
ordersRoutes.post('/', create);
ordersRoutes.get('/:id', show);
ordersRoutes.post('/:id/cancel', cancel);
