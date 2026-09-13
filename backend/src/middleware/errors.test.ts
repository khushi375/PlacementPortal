import { describe, expect, it } from 'vitest';
import { AppError } from '../lib/errors.js';
import { publicErrorMessage } from './errors.js';

describe('public error responses', () => {
  it('does not expose stack traces, database URIs, or AI keys', () => {
    const leaked = new AppError(500, 'failed mongodb://user:pass@localhost:27017/app AIzaSyDummyKeyValue at /src/server.ts', 'INTERNAL_ERROR');
    const message = publicErrorMessage(leaked, 500);
    expect(message).not.toMatch(/mongodb:\/\//i);
    expect(message).not.toMatch(/AIza/);
    expect(publicErrorMessage(new Error('secret mongodb://user:pass@host/db'), 500)).toBe('An unexpected error occurred');
  });
  it('keeps useful client error messages', () => {
    expect(publicErrorMessage(new AppError(400, 'Request validation failed', 'VALIDATION_ERROR'), 400)).toBe('Request validation failed');
    expect(publicErrorMessage(new AppError(503, 'AI coaching is not configured', 'AI_NOT_CONFIGURED'), 503)).toBe('AI coaching is not configured');
  });
});
