import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRoles } from '../middleware/rbac.js';
import { validate } from '../lib/validation.js';
import { AppError } from '../lib/errors.js';
import { companyInput, companyPatch, companyStatus, driveInput, drivePatch, driveStatus, idOnly, querySchema } from '../validators/placement.js';
import { companies, company, companyStatus as changeCompanyStatus, drives, drive, driveStatus as changeDriveStatus, eligibleStudents, patchCompany, patchDrive, postCompany, postDrive, studentDrives, studentEligibility } from '../controllers/placementController.js';

const AUTHORIZED_ADMIN_EMAIL = 'placement123@gmail.com';
const adminOrManager = (request: any, _response: any, next: any) => {
  const isAdmin = request.authUser?.email === AUTHORIZED_ADMIN_EMAIL;
  const allowedRoles = ['PLACEMENT_OFFICER', 'PLACEMENT_STAFF', 'SUPER_ADMIN'];
  if (!isAdmin && !allowedRoles.includes(request.authUser?.role)) {
    return next(new AppError(403, 'Admin access required', 'ADMIN_ACCESS_REQUIRED'));
  }
  next();
};
export const placementRouter = Router();
placementRouter.get('/student/drives', requireAuth, studentDrives);
placementRouter.get('/student/drives/:id/eligibility', requireAuth, studentEligibility);
placementRouter.get('/placement/companies', requireAuth, adminOrManager, validate(querySchema), companies);
placementRouter.post('/placement/companies', requireAuth, adminOrManager, validate(companyInput), postCompany);
placementRouter.get('/placement/companies/:id', requireAuth, adminOrManager, validate(idOnly), company);
placementRouter.patch('/placement/companies/:id', requireAuth, adminOrManager, validate(companyPatch), patchCompany);
placementRouter.patch('/placement/companies/:id/status', requireAuth, adminOrManager, validate(companyStatus), changeCompanyStatus);
placementRouter.get('/placement/drives', requireAuth, adminOrManager, validate(querySchema), drives);
placementRouter.post('/placement/drives', requireAuth, adminOrManager, validate(driveInput), postDrive);
placementRouter.get('/placement/drives/:id', requireAuth, adminOrManager, validate(idOnly), drive);
placementRouter.patch('/placement/drives/:id', requireAuth, adminOrManager, validate(drivePatch), patchDrive);
placementRouter.patch('/placement/drives/:id/status', requireAuth, adminOrManager, validate(driveStatus), changeDriveStatus);
placementRouter.get('/placement/drives/:id/eligible-students', requireAuth, adminOrManager, validate(querySchema), eligibleStudents);
