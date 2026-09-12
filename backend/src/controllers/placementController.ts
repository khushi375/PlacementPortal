import type { Request, Response } from 'express';
import { createCompany, createDrive, getCompany, getDrive, getDriveEligibilityForStudent, listCompanies, listDrives, listEligibleStudents, listPublishedDrivesForStudent, setCompanyStatus, transitionDrive, updateCompany, updateDrive } from '../services/placementService.js';
const actor = (request: Request) => ({ actorId: request.authUser?.userId, ipAddress: request.ip });
const success = (response: Response, data: unknown, status = 200) => response.status(status).json({ success: true, data });
export async function companies(request: Request, response: Response) { return success(response, await listCompanies(request.query)); }
export async function company(request: Request, response: Response) { return success(response, await getCompany(String(request.params.id))); }
export async function postCompany(request: Request, response: Response) { return success(response, await createCompany(request.body, ...Object.values(actor(request)) as [string | undefined, string | undefined]), 201); }
export async function patchCompany(request: Request, response: Response) { return success(response, await updateCompany(String(request.params.id), request.body, ...Object.values(actor(request)) as [string | undefined, string | undefined])); }
export async function companyStatus(request: Request, response: Response) { return success(response, await setCompanyStatus(String(request.params.id), request.body.status, ...Object.values(actor(request)) as [string | undefined, string | undefined])); }
export async function drives(request: Request, response: Response) { return success(response, await listDrives(request.query)); }
export async function drive(request: Request, response: Response) { return success(response, await getDrive(String(request.params.id))); }
export async function postDrive(request: Request, response: Response) { return success(response, await createDrive(request.body, ...Object.values(actor(request)) as [string | undefined, string | undefined]), 201); }
export async function patchDrive(request: Request, response: Response) { return success(response, await updateDrive(String(request.params.id), request.body, ...Object.values(actor(request)) as [string | undefined, string | undefined])); }
export async function driveStatus(request: Request, response: Response) { return success(response, await transitionDrive(String(request.params.id), request.body.status, ...Object.values(actor(request)) as [string | undefined, string | undefined])); }
export async function eligibleStudents(request: Request, response: Response) { return success(response, await listEligibleStudents(String(request.params.id), request.query)); }
export async function studentDrives(request: Request, response: Response) { return success(response, await listPublishedDrivesForStudent(request.authUser?.userId as string)); }
export async function studentEligibility(request: Request, response: Response) { return success(response, await getDriveEligibilityForStudent(String(request.params.id), request.authUser?.userId as string)); }
