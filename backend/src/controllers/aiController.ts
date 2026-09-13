import type { Request, Response } from 'express';
import { assertStudentActor, explainEligibility, interviewPractice, resumeCoach } from '../services/aiService.js';

const success = (response: Response, data: unknown) => response.status(200).json({ success: true, data });
const actor = (request: Request) => ({ userId: request.authUser?.userId, role: request.authUser?.role });

export async function postResumeCoach(request: Request, response: Response) {
  assertStudentActor(actor(request));
  return success(response, await resumeCoach(request.authUser!.userId!, request.body.driveId, request.ip));
}

export async function postInterviewPractice(request: Request, response: Response) {
  assertStudentActor(actor(request));
  return success(response, await interviewPractice(request.authUser!.userId!, request.body, request.ip));
}

export async function postEligibilityExplanation(request: Request, response: Response) {
  assertStudentActor(actor(request));
  return success(response, await explainEligibility(request.authUser!.userId!, request.body.driveId, request.ip));
}
