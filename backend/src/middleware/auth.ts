import type { NextFunction, Request, Response } from 'express';
import { firebaseAuth } from '../lib/firebase.js';
import { User } from '../models/index.js';
import { AppError } from '../lib/errors.js';

export async function requireAuth(request: Request, _response: Response, next: NextFunction) {
  try {
    if (!firebaseAuth) {
      throw new AppError(503, 'Firebase authentication is not configured', 'FIREBASE_NOT_CONFIGURED');
    }
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new AppError(401, 'Authentication required', 'UNAUTHENTICATED');
    const token = await firebaseAuth.verifyIdToken(header.slice(7));
    let user = await User.findOne({ firebaseUid: token.uid, isActive: true }).lean();
    
    // Auto-provision authorized admin email
    const AUTHORIZED_ADMIN_EMAIL = 'placement123@gmail.com';
    if (!user && token.email === AUTHORIZED_ADMIN_EMAIL) {
      const newUser = await User.create({ 
        firebaseUid: token.uid, 
        email: token.email, 
        displayName: token.name || 'Placement Admin', 
        role: 'SUPER_ADMIN', 
        emailVerified: token.email_verified === true, 
        isActive: true 
      });
      user = newUser.toObject();
    }
    
    if (!user) throw new AppError(403, 'User is not provisioned', 'USER_NOT_PROVISIONED');
    
    // Ensure authorized admin always has admin role
    if (token.email === AUTHORIZED_ADMIN_EMAIL && user.role !== 'SUPER_ADMIN') {
      await User.updateOne({ _id: user._id }, { role: 'SUPER_ADMIN' });
      user.role = 'SUPER_ADMIN';
    }
    
    request.authUser = { uid: token.uid, email: token.email, emailVerified: token.email_verified === true, role: user.role, userId: user._id.toString() };
    next();
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(401, 'Invalid authentication token', 'INVALID_TOKEN'));
  }
}

export async function requireVerifiedStudent(request: Request, response: Response, next: NextFunction) {
  await requireAuth(request, response, (error?: unknown) => {
    if (error) return next(error);
    const AUTHORIZED_ADMIN_EMAIL = 'placement123@gmail.com';
    const isAdmin = request.authUser?.email === AUTHORIZED_ADMIN_EMAIL;
    if (!isAdmin && request.authUser?.role !== 'STUDENT') {
      return next(new AppError(403, 'Student access required', 'STUDENT_ROLE_REQUIRED'));
    }
    next();
  });
}
