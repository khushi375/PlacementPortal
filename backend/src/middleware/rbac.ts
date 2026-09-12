import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '../models/index.js';
import { AppError } from '../lib/errors.js';

export function requireRoles(...roles: UserRole[]) {
  return (request: Request, _response: Response, next: NextFunction) => {
    if (!request.authUser || !roles.includes(request.authUser.role)) {
      next(new AppError(403, 'You do not have permission to perform this action', 'FORBIDDEN'));
      return;
    }
    next();
  };
}
