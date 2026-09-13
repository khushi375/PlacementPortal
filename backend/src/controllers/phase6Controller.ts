import type { Request, Response } from 'express';
import { createResource, deleteResource, getPreparationBrief, listPlacementResources, listStudentCalendar, listStudentPreparation, publishResource, setPreparationProgress, updateResource } from '../services/phase6Service.js';

const actor = (request: Request) => ({ actorId: request.authUser?.userId, ipAddress: request.ip });
const success = (response: Response, data: unknown, status = 200) => response.status(status).json({ success: true, data });

export async function placementResources(request: Request, response: Response) { return success(response, await listPlacementResources(request.query)); }
export async function postResource(request: Request, response: Response) { return success(response, await createResource(request.body, actor(request).actorId, actor(request).ipAddress), 201); }
export async function patchResource(request: Request, response: Response) { return success(response, await updateResource(String(request.params.id), request.body, actor(request).actorId, actor(request).ipAddress)); }
export async function publish(request: Request, response: Response) { return success(response, await publishResource(String(request.params.id), request.body.isPublished, actor(request).actorId, actor(request).ipAddress)); }
export async function removeResource(request: Request, response: Response) { return success(response, await deleteResource(String(request.params.id), actor(request).actorId, actor(request).ipAddress)); }
export async function studentPreparation(request: Request, response: Response) { return success(response, await listStudentPreparation(request.authUser!.userId!)); }
export async function studentProgress(request: Request, response: Response) { return success(response, await setPreparationProgress(request.authUser!.userId!, String(request.params.id), request.body.completed)); }
export async function studentCalendar(request: Request, response: Response) { return success(response, await listStudentCalendar(request.authUser!.userId!)); }
export async function preparationBrief(request: Request, response: Response) { return success(response, await getPreparationBrief(request.authUser!.userId!, String(request.params.id))); }
