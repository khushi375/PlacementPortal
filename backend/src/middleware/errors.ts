import type { ErrorRequestHandler } from 'express';
import { AppError } from '../lib/errors.js';

export const notFound = (_request: unknown, _response: unknown, next: (error: Error) => void) => next(new AppError(404, 'Route not found', 'NOT_FOUND'));
export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const message = error instanceof AppError ? error.message : 'An unexpected error occurred';
  if (statusCode >= 500) console.error(error);
  response.status(statusCode).json({ error: { code: error instanceof AppError ? error.code : 'INTERNAL_ERROR', message, requestId: request.requestId } });
};
