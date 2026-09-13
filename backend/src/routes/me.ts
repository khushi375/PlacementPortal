import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRoles } from '../middleware/rbac.js';
import { validate } from '../lib/validation.js';
import { adminCreateSchema } from '../validators/student.js';
import { createAdminUser } from '../controllers/studentController.js';

export const meRouter = Router();
meRouter.get('/', requireAuth, (request, response) => response.json({ data: request.authUser }));
meRouter.post('/admin/create', requireAuth, requireRoles('SUPER_ADMIN'), validate(adminCreateSchema), createAdminUser);
