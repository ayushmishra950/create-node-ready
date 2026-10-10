import type { UserDoc } from '../models/User';

// Tells TypeScript that requests which passed requireAuth have req.user.
declare global {
  namespace Express {
    interface Request {
      user?: UserDoc;
    }
  }
}
