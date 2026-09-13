import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRoles } from '../middleware/rbac.js';
import { validate } from '../lib/validation.js';
import { briefInput, progressInput, resourceIdInput, resourceInput, resourcePatch, resourcePublishInput } from '../validators/phase6.js';
import { patchResource, placementResources, postResource, preparationBrief, publish, removeResource, studentCalendar, studentPreparation, studentProgress } from '../controllers/phase6Controller.js';

const managers = requireRoles('PLACEMENT_OFFICER', 'PLACEMENT_STAFF', 'SUPER_ADMIN');
export const phase6Router = Router();
phase6Router.get('/placement/preparation/resources', requireAuth, managers, placementResources);
phase6Router.post('/placement/preparation/resources', requireAuth, managers, validate(resourceInput), postResource);
phase6Router.patch('/placement/preparation/resources/:id', requireAuth, managers, validate(resourcePatch), patchResource);
phase6Router.patch('/placement/preparation/resources/:id/publish', requireAuth, managers, validate(resourcePublishInput), publish);
phase6Router.delete('/placement/preparation/resources/:id', requireAuth, managers, validate(resourceIdInput), removeResource);
phase6Router.get('/student/preparation', requireAuth, requireRoles('STUDENT'), studentPreparation);
phase6Router.patch('/student/preparation/resources/:id/progress', requireAuth, requireRoles('STUDENT'), validate(progressInput), studentProgress);
phase6Router.get('/student/calendar', requireAuth, requireRoles('STUDENT'), studentCalendar);
phase6Router.get('/student/drives/:id/preparation-brief', requireAuth, requireRoles('STUDENT'), validate(briefInput), preparationBrief);
