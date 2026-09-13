import type { Request, Response } from 'express';
import { createGrievance, getAnalytics, getCommandCenter, listCommunications, listDirectory, listPlacementGrievances, listStudentGrievances, sendCommunication, updateGrievanceStatus } from '../services/phase5Service.js';

const success = (response: Response, data: unknown, status = 200) => response.status(status).json({ success: true, data });
export async function commandCenter(_request: Request, response: Response) { return success(response, await getCommandCenter()); }
export async function analytics(_request: Request, response: Response) { return success(response, await getAnalytics()); }
export async function directory(request: Request, response: Response) { return success(response, await listDirectory(typeof request.query.search === 'string' ? request.query.search : undefined)); }
export async function communications(_request: Request, response: Response) { return success(response, await listCommunications()); }
export async function postCommunication(request: Request, response: Response) { return success(response, await sendCommunication(request.body, request.authUser!.userId!, request.ip), 201); }
export async function studentGrievances(request: Request, response: Response) { return success(response, await listStudentGrievances(request.authUser!.userId!)); }
export async function postGrievance(request: Request, response: Response) { return success(response, await createGrievance(request.authUser!.userId!, request.body, request.ip), 201); }
export async function placementGrievances(_request: Request, response: Response) { return success(response, await listPlacementGrievances()); }
export async function grievanceStatus(request: Request, response: Response) { return success(response, await updateGrievanceStatus(String(request.params.id), request.body.status, request.authUser!.userId!, request.ip)); }
