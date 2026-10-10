import { Router } from 'express';
import { login, me, register } from './auth.controller';
import { requireAuth } from './auth.middleware';

export const authRoutes = Router();

authRoutes.post('/register', register);
authRoutes.post('/login', login);
authRoutes.get('/me', requireAuth, me);
