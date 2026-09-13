import { GoogleGenerativeAI } from '@google/generative-ai';
import { AppError } from './errors.js';

export const AI_TIMEOUT_MS = 20_000;
export const AI_MAX_OUTPUT_TOKENS = 1200;
export const AI_MAX_PROMPT_CHARS = 16_000;
export const AI_RATE_LIMIT = { windowMs: 60_000, limit: 10 } as const;

export const AI_SYSTEM_INSTRUCTION = [
  'You are a placement coaching assistant for students.',
  'Use only the JSON facts provided in the user message.',
  'Do not invent student skills, projects, internships, certifications, or experience.',
  'Do not invent company or drive requirements.',
  'Do not decide, calculate, or change official eligibility or placement decisions.',
  'If information is missing, say that it is unavailable.',
  'Present coaching as suggestions only, not official placement-center decisions.',
].join(' ');

export type AiClient = { generate: (prompt: string, systemInstruction: string) => Promise<string> };

let testClient: AiClient | undefined;

export function setAiClientForTests(client?: AiClient) {
  testClient = client;
}

export function readAiConfig() {
  const provider = (process.env.AI_PROVIDER ?? 'GEMINI').trim().toUpperCase();
  const apiKey = process.env.AI_API_KEY?.trim();
  const model = process.env.AI_MODEL?.trim() || 'gemini-2.0-flash';
  return { provider, apiKey, model };
}

export function isAiConfigured() {
  const { provider, apiKey } = readAiConfig();
  return Boolean(apiKey) && (provider === 'GEMINI' || provider === 'GOOGLE' || provider === 'GOOGLE_GEMINI');
}

export function ensureAiConfigured() {
  if (!isAiConfigured()) throw new AppError(503, 'AI coaching is not configured', 'AI_NOT_CONFIGURED');
}

export function sanitizeAiError(error: unknown) {
  if (error instanceof AppError) return error;
  return new AppError(502, 'AI coaching is temporarily unavailable', 'AI_PROVIDER_ERROR');
}

export function createWindowLimiter(limit = AI_RATE_LIMIT.limit, windowMs = AI_RATE_LIMIT.windowMs) {
  const hits = new Map<string, number[]>();
  return {
    hit(key: string, now = Date.now()) {
      const kept = (hits.get(key) ?? []).filter((timestamp) => now - timestamp < windowMs);
      if (kept.length >= limit) throw new AppError(429, 'Too many AI requests. Please wait a minute.', 'AI_RATE_LIMIT');
      kept.push(now);
      hits.set(key, kept);
    },
  };
}

export const aiUserLimiter = createWindowLimiter();

export function aiRateLimitKey(userId?: string) {
  if (!userId) throw new AppError(401, 'Authentication required', 'UNAUTHENTICATED');
  return `ai:${userId}`;
}

async function geminiGenerate(prompt: string, systemInstruction: string) {
  ensureAiConfigured();
  const { apiKey, model } = readAiConfig();
  const generative = new GoogleGenerativeAI(apiKey!);
  const gemini = generative.getGenerativeModel({
    model,
    systemInstruction,
    generationConfig: { maxOutputTokens: AI_MAX_OUTPUT_TOKENS, temperature: 0.3 },
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new AppError(504, 'AI request timed out', 'AI_TIMEOUT')), AI_TIMEOUT_MS);
    });
    const result = await Promise.race([gemini.generateContent(prompt), timeout]);
    const text = result.response.text()?.trim();
    if (!text) throw new AppError(502, 'AI coaching is temporarily unavailable', 'AI_EMPTY_RESPONSE');
    return text;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function generateAiText(prompt: string, systemInstruction = AI_SYSTEM_INSTRUCTION) {
  try {
    if (prompt.length > AI_MAX_PROMPT_CHARS) throw new AppError(400, 'AI request is too large', 'AI_PROMPT_TOO_LARGE');
    if (testClient) return await testClient.generate(prompt, systemInstruction);
    ensureAiConfigured();
    return await geminiGenerate(prompt, systemInstruction);
  } catch (error) {
    throw sanitizeAiError(error);
  }
}
