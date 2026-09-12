import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { AppError } from './errors.js';

export function validate(schema: ZodType): RequestHandler {
  return (request, _response, next) => {
    const result = schema.safeParse({ body: request.body, params: request.params, query: request.query }) as { success: true; data: { body: unknown } } | { success: false };
    if (!result.success) {
      next(new AppError(400, 'Request validation failed', 'VALIDATION_ERROR'));
      return;
    }
    request.body = result.data.body;
    next();
  };
}
