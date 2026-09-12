import type { UserRole } from '../models/index.js';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  emailVerified: boolean;
  role: UserRole;
  userId?: string;
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthenticatedUser;
      requestId?: string;
    }
  }
}
