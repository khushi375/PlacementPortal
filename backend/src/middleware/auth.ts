import type { NextFunction, Request, Response } from 'express';
import { firebaseAuth } from '../lib/firebase.js';
import { User } from '../models/index.js';
import { AppError } from '../lib/errors.js';

export async function requireAuth(request: Request, _response: Response, next: NextFunction) {
  try {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new AppError(401, 'Authentication required', 'UNAUTHENTICATED');
    const token = await firebaseAuth.verifyIdToken(header.slice(7));
    const user = await User.findOne({ firebaseUid: token.uid, isActive: true }).lean();
    if (!user) throw new AppError(403, 'User is not provisioned', 'USER_NOT_PROVISIONED');
    request.authUser = { uid: token.uid, email: token.email, emailVerified: token.email_verified === true, role: user.role, userId: user._id.toString() };
    next();
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(401, 'Invalid authentication token', 'INVALID_TOKEN'));
  }
}

export async function requireVerifiedStudent(request: Request, response: Response, next: NextFunction) {
  await requireAuth(request, response, (error?: unknown) => {
    if (error) return next(error);
    if (request.authUser?.role !== 'STUDENT') return next(new AppError(403, 'Student access required', 'STUDENT_ROLE_REQUIRED'));
    if (!request.authUser.emailVerified) return next(new AppError(403, 'A verified email is required', 'EMAIL_VERIFICATION_REQUIRED'));
    next();
  });
}
