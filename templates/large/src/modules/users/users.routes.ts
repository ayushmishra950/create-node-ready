import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware';
import { list, show } from './users.controller';

export const usersRoutes = Router();

usersRoutes.use(requireAuth); // every users route needs a login
usersRoutes.get('/', list);
usersRoutes.get('/:id', show);
