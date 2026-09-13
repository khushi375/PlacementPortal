import { z } from 'zod';

const id = z.string().regex(/^[a-f\d]{24}$/i);
const envelope = (body: z.ZodTypeAny, params: z.ZodTypeAny = z.record(z.string(), z.unknown()), query: z.ZodTypeAny = z.record(z.string(), z.unknown())) => z.object({ body, params, query });
const category = z.enum(['APTITUDE', 'CODING', 'TECHNICAL', 'HR', 'GD', 'RESUME', 'GENERAL']);

export const resourceInput = envelope(z.object({
  title: z.string().trim().min(1).max(160),
  category,
  url: z.string().url().max(500),
  description: z.string().trim().max(3000).optional(),
  isPublished: z.boolean().optional(),
}).strict());

export const resourcePatch = envelope(z.object({
  title: z.string().trim().min(1).max(160).optional(),
  category: category.optional(),
  url: z.string().url().max(500).optional(),
  description: z.string().trim().max(3000).optional(),
}).strict(), z.object({ id }));

export const resourcePublishInput = envelope(z.object({ isPublished: z.boolean() }).strict(), z.object({ id }));
export const resourceIdInput = envelope(z.record(z.string(), z.unknown()), z.object({ id }));
export const progressInput = envelope(z.object({ completed: z.boolean() }).strict(), z.object({ id }));
export const briefInput = envelope(z.record(z.string(), z.unknown()), z.object({ id }));
