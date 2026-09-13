import { z } from 'zod';

const id = z.string().regex(/^[a-f\d]{24}$/i);
const envelope = (body: z.ZodTypeAny, params: z.ZodTypeAny = z.record(z.string(), z.unknown()), query: z.ZodTypeAny = z.record(z.string(), z.unknown())) => z.object({ body, params, query });
const roundType = z.enum(['APTITUDE', 'CODING', 'TECHNICAL', 'GD', 'GROUP_DISCUSSION', 'HR']);

export const resumeCoachInput = envelope(z.object({ driveId: id }).strict());
export const eligibilityExplainInput = envelope(z.object({ driveId: id }).strict());
export const interviewPracticeInput = envelope(z.object({
  interviewId: id.optional(),
  driveId: id.optional(),
  roundType: roundType.optional(),
}).strict().superRefine((value, context) => {
  if (value.interviewId) return;
  if (!value.driveId || !value.roundType) {
    context.addIssue({ code: 'custom', message: 'Provide interviewId or both driveId and roundType' });
  }
}));
