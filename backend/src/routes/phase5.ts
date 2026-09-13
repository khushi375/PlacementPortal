import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRoles } from '../middleware/rbac.js';
import { validate } from '../lib/validation.js';
import { communicationInput, directoryQuery, grievanceInput, grievanceStatusInput } from '../validators/phase5.js';
import { analytics, commandCenter, communications, directory, grievanceStatus, placementGrievances, postCommunication, postGrievance, studentGrievances } from '../controllers/phase5Controller.js';

const managers = requireRoles('PLACEMENT_OFFICER', 'PLACEMENT_STAFF', 'SUPER_ADMIN');
export const phase5Router = Router();
phase5Router.get('/placement/command-center', requireAuth, managers, commandCenter);
phase5Router.get('/placement/analytics', requireAuth, managers, analytics);
phase5Router.get('/placement/students', requireAuth, managers, validate(directoryQuery), directory);
phase5Router.get('/placement/communications', requireAuth, managers, communications);
phase5Router.post('/placement/communications', requireAuth, managers, validate(communicationInput), postCommunication);
phase5Router.get('/placement/grievances', requireAuth, managers, placementGrievances);
phase5Router.patch('/placement/grievances/:id/status', requireAuth, managers, validate(grievanceStatusInput), grievanceStatus);
phase5Router.get('/student/grievances', requireAuth, requireRoles('STUDENT'), studentGrievances);
phase5Router.post('/student/grievances', requireAuth, requireRoles('STUDENT'), validate(grievanceInput), postGrievance);
