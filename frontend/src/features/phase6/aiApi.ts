import { api } from '../../services/studentApi';
import { messageFromError } from '../phase4/phase4Api';

export interface AiSuggestion {
  suggestion?: string;
  explanation?: string;
  roundType?: string;
  eligibility?: { eligible: boolean; status: string; reasons: Array<{ rule: string; passed: boolean; message: string }> };
  disclaimer: string;
}

export function aiErrorState(error: unknown) {
  const payload = error as { response?: { status?: number; data?: { error?: { code?: string; message?: string } } } };
  const code = payload.response?.data?.error?.code;
  const status = payload.response?.status;
  if (code === 'AI_NOT_CONFIGURED' || status === 503) return { kind: 'unconfigured' as const, message: 'AI coaching is not configured on the server.' };
  if (code === 'AI_RATE_LIMIT' || status === 429) return { kind: 'rate-limit' as const, message: 'Too many AI requests. Please wait a minute and try again.' };
  return { kind: 'error' as const, message: messageFromError(error, 'AI coaching could not be completed.') };
}

export async function requestResumeCoach(driveId: string) {
  return (await api.post<{ data: AiSuggestion }>('/student/ai/resume-coach', { driveId })).data.data;
}
export async function requestInterviewPractice(input: { interviewId?: string; driveId?: string; roundType?: string }) {
  return (await api.post<{ data: AiSuggestion }>('/student/ai/interview-practice', input)).data.data;
}
export async function requestEligibilityExplanation(driveId: string) {
  return (await api.post<{ data: AiSuggestion }>('/student/ai/eligibility-explanation', { driveId })).data.data;
}
