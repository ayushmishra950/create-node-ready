import type { UserDoc } from '../modules/users/user.model';

// Tells TypeScript that requests which passed requireAuth have req.user.
declare global {
  namespace Express {
    interface Request {
      user?: UserDoc;
    }
  }
}
