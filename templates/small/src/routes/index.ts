import { Router } from 'express';
import { authRoutes } from './auth.routes';

// Every route here is served under /api. To add a feature, create its routes file and mount it here.
export const apiRoutes = Router();

apiRoutes.use('/auth', authRoutes);
