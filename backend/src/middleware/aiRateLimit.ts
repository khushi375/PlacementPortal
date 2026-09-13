import type { NextFunction, Request, Response } from 'express';
import { aiRateLimitKey, aiUserLimiter } from '../lib/ai.js';

export function aiRateLimit(request: Request, _response: Response, next: NextFunction) {
  try {
    aiUserLimiter.hit(aiRateLimitKey(request.authUser?.userId));
    next();
  } catch (error) {
    next(error);
  }
}
