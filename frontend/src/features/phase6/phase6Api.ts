import { api } from '../../services/studentApi';
import type { Interview } from '../phase4/phase4Api';

export const preparationCategories = ['APTITUDE', 'CODING', 'TECHNICAL', 'HR', 'GD', 'RESUME', 'GENERAL'] as const;
export type PreparationCategory = (typeof preparationCategories)[number];

export interface PreparationResource {
  _id: string;
  title: string;
  category: PreparationCategory | string;
  url?: string;
  description?: string;
  isPublished?: boolean;
  completed?: boolean;
  relevantToUpcomingInterview?: boolean;
  createdAt?: string;
}

export interface StudentPreparation {
  upcomingInterviewTypes: string[];
  resources: PreparationResource[];
}

export interface PreparationBrief {
  drive: { id: string; role?: string; company?: string; requiredSkills: string[]; roundTypes: Array<{ name?: string; type?: string; order?: number }> };
  eligibility: { eligible: boolean; status: string; reasons: Array<{ rule: string; passed: boolean; message: string }>; checkedAt: string };
  missingSkills: string[];
  interviews: Array<{ id: string; type?: string; round?: string; date?: string; status?: string; mode?: string }>;
}

export async function listPlacementResources() { return (await api.get<{ data: PreparationResource[] }>('/placement/preparation/resources')).data.data; }
export async function createPreparationResource(input: { title: string; category: string; url: string; description?: string; isPublished?: boolean }) { return (await api.post<{ data: PreparationResource }>('/placement/preparation/resources', input)).data.data; }
export async function updatePreparationResource(id: string, input: Record<string, unknown>) { return (await api.patch<{ data: PreparationResource }>(`/placement/preparation/resources/${id}`, input)).data.data; }
export async function publishPreparationResource(id: string, isPublished: boolean) { return (await api.patch<{ data: PreparationResource }>(`/placement/preparation/resources/${id}/publish`, { isPublished })).data.data; }
export async function deletePreparationResource(id: string) { return api.delete(`/placement/preparation/resources/${id}`); }
export async function fetchStudentPreparation() { return (await api.get<{ data: StudentPreparation }>('/student/preparation')).data.data; }
export async function setStudentProgress(id: string, completed: boolean) { return (await api.patch<{ data: { resourceId: string; completed: boolean } }>(`/student/preparation/resources/${id}/progress`, { completed })).data.data; }
export async function fetchStudentCalendar() { return (await api.get<{ data: Interview[] }>('/student/calendar')).data.data; }
export async function fetchPreparationBrief(driveId: string) { return (await api.get<{ data: PreparationBrief }>(`/student/drives/${driveId}/preparation-brief`)).data.data; }
