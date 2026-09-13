import { z } from 'zod';
const id = z.string().regex(/^[a-f\d]{24}$/i);
const envelope = (body: z.ZodTypeAny, params: z.ZodTypeAny = z.record(z.string(), z.unknown()), query: z.ZodTypeAny = z.record(z.string(), z.unknown())) => z.object({ body, params, query });
export const communicationInput = envelope(z.object({
  title: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(2000),
  type: z.enum(['ANNOUNCEMENT', 'DRIVE_UPDATE', 'INTERVIEW', 'RESULT', 'GENERAL']).optional(),
  allStudents: z.boolean().optional(),
  studentIds: z.array(id).max(500).optional(),
  driveId: id.optional(),
}).strict());
export const grievanceInput = envelope(z.object({
  category: z.string().trim().max(80).optional(),
  subject: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(3000),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
}).strict());
export const grievanceStatusInput = envelope(z.object({ status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']) }), z.object({ id }));
export const directoryQuery = envelope(z.record(z.string(), z.unknown()), z.record(z.string(), z.unknown()), z.record(z.string(), z.unknown()));
export const idInput = envelope(z.record(z.string(), z.unknown()), z.object({ id }), z.record(z.string(), z.unknown()));
