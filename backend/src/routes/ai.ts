import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRoles } from '../middleware/rbac.js';
import { aiRateLimit } from '../middleware/aiRateLimit.js';
import { validate } from '../lib/validation.js';
import { eligibilityExplainInput, interviewPracticeInput, resumeCoachInput } from '../validators/ai.js';
import { postEligibilityExplanation, postInterviewPractice, postResumeCoach } from '../controllers/aiController.js';

export const aiRouter = Router();
aiRouter.post('/student/ai/resume-coach', requireAuth, requireRoles('STUDENT'), aiRateLimit, validate(resumeCoachInput), postResumeCoach);
aiRouter.post('/student/ai/interview-practice', requireAuth, requireRoles('STUDENT'), aiRateLimit, validate(interviewPracticeInput), postInterviewPractice);
aiRouter.post('/student/ai/eligibility-explanation', requireAuth, requireRoles('STUDENT'), aiRateLimit, validate(eligibilityExplainInput), postEligibilityExplanation);
