import type { Request, Response } from 'express';
import { AppError } from '../lib/errors.js';
import { applyToDrive, changeApplicationStatus, changeInterviewStatus, createPlacementResult, getPlacementApplication, getStudentApplication, listApplications, listAttendance, listDocuments, listInterviews, listResults, listStudentApplications, markAttendance, reviewDocument, scheduleInterview, uploadStudentDocument, withdrawApplication } from '../services/phase4Service.js';
const manager = (request: Request) => ['PLACEMENT_OFFICER', 'PLACEMENT_STAFF', 'SUPER_ADMIN'].includes(request.authUser?.role ?? '');
const success = (response: Response, data: unknown, status = 200) => response.status(status).json({ success: true, data });
export async function apply(request: Request, response: Response) { return success(response, await applyToDrive(request.authUser!.userId!, String(request.params.id), request.body.resumeId, request.authUser!.userId, request.ip), 201); }
export async function studentApplications(request: Request, response: Response) { return success(response, await listStudentApplications(request.authUser!.userId!)); }
export async function studentApplication(request: Request, response: Response) { return success(response, await getStudentApplication(request.authUser!.userId!, String(request.params.id))); }
export async function withdraw(request: Request, response: Response) { return success(response, await withdrawApplication(request.authUser!.userId!, String(request.params.id), request.ip)); }
export async function placementApplications(request: Request, response: Response) { return success(response, await listApplications(request.query)); }
export async function placementApplication(request: Request, response: Response) { return success(response, await getPlacementApplication(String(request.params.id))); }
export async function applicationStatus(request: Request, response: Response) { return success(response, await changeApplicationStatus(String(request.params.id), request.body.status, request.authUser!.userId!, request.body.note, request.body.rejectionReason, request.ip)); }
export async function interviews(request: Request, response: Response) { return success(response, await listInterviews(request.authUser!.userId!, manager(request), request.query)); }
export async function postInterview(request: Request, response: Response) { return success(response, await scheduleInterview(request.body, request.authUser!.userId!, request.ip), 201); }
export async function interviewStatus(request: Request, response: Response) { return success(response, await changeInterviewStatus(String(request.params.id), request.body.status, request.authUser!.userId!, request.ip)); }
export async function attendance(request: Request, response: Response) { return success(response, await listAttendance(request.authUser!.userId!, manager(request), String(request.query.interviewId ?? ''))); }
export async function mark(request: Request, response: Response) { return success(response, await markAttendance(String(request.params.id), request.body.studentId, request.body.status, request.authUser!.userId!, request.body.remarks, request.ip)); }
export async function documents(request: Request, response: Response) { return success(response, await listDocuments(request.authUser!.userId!, manager(request), typeof request.query.studentId === 'string' ? request.query.studentId : undefined)); }
export async function documentStatus(request: Request, response: Response) { return success(response, await reviewDocument(String(request.params.id), request.body.status, request.authUser!.userId!, request.body.reviewComment, request.ip)); }
export async function uploadDocument(request: Request, response: Response) { if (!request.file) throw new AppError(400, 'Document file is required', 'DOCUMENT_REQUIRED'); return success(response, await uploadStudentDocument(request.authUser!.userId!, request.file, String(request.body.type ?? 'OTHER'), request.ip), 201); }
export async function results(request: Request, response: Response) { return success(response, await listResults(request.authUser!.userId!, manager(request))); }
export async function postResult(request: Request, response: Response) { return success(response, await createPlacementResult(request.body, request.authUser!.userId!, request.ip), 201); }
