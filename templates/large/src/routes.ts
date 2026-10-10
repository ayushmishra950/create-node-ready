import { Router } from 'express';
import { authRoutes } from './modules/auth/auth.routes';
import { ordersRoutes } from './modules/orders/orders.routes';
import { usersRoutes } from './modules/users/users.routes';

// Every module is mounted here and served under /api. A new feature = a new folder in modules/.
export const apiRoutes = Router();

apiRoutes.use('/auth', authRoutes);
apiRoutes.use('/users', usersRoutes);
apiRoutes.use('/orders', ordersRoutes);
