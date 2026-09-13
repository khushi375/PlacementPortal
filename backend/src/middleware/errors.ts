import type { ErrorRequestHandler } from 'express';
import { AppError } from '../lib/errors.js';

export function publicErrorMessage(error: unknown, statusCode: number) {
  const raw = error instanceof AppError ? error.message : 'An unexpected error occurred';
  const redacted = raw
    .replace(/mongodb(\+srv)?:\/\/\S+/gi, '[redacted]')
    .replace(/\bAIza[0-9A-Za-z_-]{10,}\b/g, '[redacted]')
    .replace(/\bAI_API_KEY\b/gi, '[redacted]');
  if (statusCode >= 500 && !(error instanceof AppError)) return 'An unexpected error occurred';
  return redacted;
}

export const notFound = (_request: unknown, _response: unknown, next: (error: Error) => void) => next(new AppError(404, 'Route not found', 'NOT_FOUND'));
export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const message = publicErrorMessage(error, statusCode);
  if (statusCode >= 500 && process.env.NODE_ENV !== 'test') {
    console.error({ requestId: request.requestId, code: error instanceof AppError ? error.code : 'INTERNAL_ERROR', error: error instanceof Error ? error.message : String(error) });
  }
  response.status(statusCode).json({ error: { code: error instanceof AppError ? error.code : 'INTERNAL_ERROR', message, requestId: request.requestId } });
};
