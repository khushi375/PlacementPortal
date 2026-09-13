import axios from 'axios';
import { auth } from '../lib/firebase';
import type { Notification, StudentOverview } from '../features/student/types';
import type { EligibilityResult, StudentDrive } from '../features/student/placementTypes';

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api/v1' });
api.interceptors.request.use(async (config) => {
  if (auth.currentUser) config.headers.Authorization = `Bearer ${await auth.currentUser.getIdToken()}`;
  return config;
});

export async function fetchStudentOverview() { return (await api.get<{ data: StudentOverview }>('/student/profile')).data.data; }
export async function updateStudentProfile(input: Record<string, unknown>) { return (await api.put<{ data: StudentOverview['profile'] }>('/student/profile', input)).data.data; }
export async function fetchNotifications() { return (await api.get<{ data: { notifications: Notification[]; unreadCount: number } }>('/student/notifications')).data.data; }
export async function markNotificationRead(id: string) { return api.patch(`/student/notifications/${id}/read`); }
export async function uploadResume(file: File) { const form = new FormData(); form.append('resume', file); return api.post('/student/resumes', form); }
export async function uploadProfilePhoto(file: File) { const form = new FormData(); form.append('photo', file); return api.post('/student/profile/photo', form); }
export async function setPrimaryResume(id: string) { return api.patch(`/student/resumes/${id}/primary`); }
export async function archiveResume(id: string) { return api.delete(`/student/resumes/${id}`); }
export async function fetchSemesters() { return (await api.get('/student/academics/semesters')).data.data; }
export async function createSemester(input: { semester: number; sgpa: number; credits?: number }) { return api.post('/student/academics/semesters', input); }
export async function fetchPublishedDrives() { return (await api.get<{ data: StudentDrive[] }>('/student/drives')).data.data; }
export async function fetchDriveEligibility(id: string) { return (await api.get<{ data: EligibilityResult }>(`/student/drives/${id}/eligibility`)).data.data; }
export async function fetchCurrentUser() { return (await api.get<{ data: { role: string; userId: string } }>('/me')).data.data; }
