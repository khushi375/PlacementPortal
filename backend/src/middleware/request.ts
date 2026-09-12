import crypto from 'node:crypto';
import type { RequestHandler } from 'express';

export const requestContext: RequestHandler = (request, _response, next) => {
  request.requestId = crypto.randomUUID();
  next();
};
