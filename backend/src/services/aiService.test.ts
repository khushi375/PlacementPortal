import { afterEach, describe, expect, it } from 'vitest';
import { AppError } from '../lib/errors.js';
import { createWindowLimiter, ensureAiConfigured, generateAiText, isAiConfigured, setAiClientForTests, AI_MAX_PROMPT_CHARS } from '../lib/ai.js';
import { evaluateEligibility } from './eligibilityService.js';
import { assertPublishedDrive, assertStudentActor, assertStudentInterviewAccess, eligibilityExplanationPayload } from './aiService.js';
import { eligibilityExplainInput, interviewPracticeInput, resumeCoachInput } from '../validators/ai.js';

afterEach(() => setAiClientForTests(undefined));

describe('AI configuration', () => {
  it('returns 503 when AI is not configured', () => {
    const previous = process.env.AI_API_KEY;
    delete process.env.AI_API_KEY;
    expect(isAiConfigured()).toBe(false);
    expect(() => ensureAiConfigured()).toThrow(AppError);
    try { ensureAiConfigured(); } catch (error) {
      expect(error).toMatchObject({ statusCode: 503, code: 'AI_NOT_CONFIGURED' });
    }
    if (previous) process.env.AI_API_KEY = previous;
  });
  it('uses a mocked provider and never requires a real Gemini key', async () => {
    setAiClientForTests({ generate: async () => 'Mocked coaching suggestion.' });
    await expect(generateAiText('facts')).resolves.toBe('Mocked coaching suggestion.');
  });
  it('rejects oversized prompts before calling the provider', async () => {
    setAiClientForTests({ generate: async () => 'should not run' });
    try {
      await generateAiText('x'.repeat(AI_MAX_PROMPT_CHARS + 1));
      throw new Error('expected');
    } catch (error) {
      expect(error).toMatchObject({ statusCode: 400, code: 'AI_PROMPT_TOO_LARGE' });
    }
  });
});

describe('AI authentication and RBAC', () => {
  it('rejects unauthenticated users with 401', () => {
    try { assertStudentActor(undefined); throw new Error('expected'); } catch (error) {
      expect(error).toMatchObject({ statusCode: 401, code: 'UNAUTHENTICATED' });
    }
  });
  it('rejects non-student roles with 403', () => {
    try { assertStudentActor({ userId: 'officer-1', role: 'PLACEMENT_OFFICER' }); throw new Error('expected'); } catch (error) {
      expect(error).toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
    }
    expect(() => assertStudentActor({ userId: 'student-1', role: 'STUDENT' })).not.toThrow();
  });
});

describe('AI resource access', () => {
  it('blocks another student\'s interview', () => {
    try { assertStudentInterviewAccess('student-a', 'student-b'); throw new Error('expected'); } catch (error) {
      expect(error).toMatchObject({ statusCode: 403, code: 'AI_FORBIDDEN' });
    }
  });
  it('rejects missing or unpublished drives', () => {
    try { assertPublishedDrive(null); throw new Error('expected'); } catch (error) {
      expect(error).toMatchObject({ statusCode: 404, code: 'DRIVE_NOT_FOUND' });
    }
    try { assertPublishedDrive({ status: 'DRAFT' }); throw new Error('expected'); } catch (error) {
      expect(error).toMatchObject({ statusCode: 404, code: 'DRIVE_NOT_FOUND' });
    }
    expect(() => assertPublishedDrive({ status: 'PUBLISHED' })).not.toThrow();
  });
});

describe('AI request validation', () => {
  const id = '64b0f2a0c4a1b2c3d4e5f6a7';
  it('requires a valid drive id for resume coaching', () => {
    expect(resumeCoachInput.safeParse({ body: { driveId: 'bad' }, params: {}, query: {} }).success).toBe(false);
    expect(resumeCoachInput.safeParse({ body: { driveId: id }, params: {}, query: {} }).success).toBe(true);
  });
  it('rejects incomplete interview practice requests', () => {
    expect(interviewPracticeInput.safeParse({ body: {}, params: {}, query: {} }).success).toBe(false);
    expect(interviewPracticeInput.safeParse({ body: { driveId: id }, params: {}, query: {} }).success).toBe(false);
    expect(interviewPracticeInput.safeParse({ body: { interviewId: id }, params: {}, query: {} }).success).toBe(true);
    expect(interviewPracticeInput.safeParse({ body: { driveId: id, roundType: 'CODING' }, params: {}, query: {} }).success).toBe(true);
    expect(eligibilityExplainInput.safeParse({ body: { driveId: id }, params: {}, query: {} }).success).toBe(true);
  });
});

describe('AI eligibility explanation', () => {
  it('does not change the existing eligibility result', async () => {
    const eligibility = evaluateEligibility(
      { cgpa: 8, skills: ['react'] },
      { minimumCgpa: 7.5, requiredSkills: ['react', 'typescript'], skillMatchMode: 'ALL' },
    );
    const before = structuredClone(eligibility);
    setAiClientForTests({ generate: async () => 'You are missing TypeScript according to the existing result.' });
    const explanation = await generateAiText(JSON.stringify(eligibilityExplanationPayload(eligibility)));
    expect(eligibility).toEqual(before);
    expect(eligibilityExplanationPayload(eligibility).status).toBe(eligibility.status);
    expect(eligibility.status).toBe('NOT_ELIGIBLE');
    expect(explanation).toContain('existing result');
  });
});

describe('AI rate limiting', () => {
  it('allows 10 requests per window then returns 429', () => {
    const limiter = createWindowLimiter(10, 60_000);
    for (let index = 0; index < 10; index += 1) limiter.hit('ai:student-1', 1_000);
    try { limiter.hit('ai:student-1', 1_000); throw new Error('expected'); } catch (error) {
      expect(error).toMatchObject({ statusCode: 429, code: 'AI_RATE_LIMIT' });
    }
    expect(() => limiter.hit('ai:student-2', 1_000)).not.toThrow();
  });
});
