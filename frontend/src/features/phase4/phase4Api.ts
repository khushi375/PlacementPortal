import { api } from '../../services/studentApi';
export interface Application { _id: string; currentStage: string; appliedAt: string; notes?: string; student?: { _id?: string; rollNumber?: string; cgpa?: number; user?: { displayName?: string; email?: string }; department?: { name?: string }; course?: { name?: string } }; drive?: { _id?: string; role?: string; company?: { name?: string } }; resume?: { filename?: string }; }
export interface PlacementApplicationDetail extends Application {
  reviewedAt?: string; shortlistedAt?: string; withdrawnAt?: string; rejectionReason?: string; allowedTransitions: string[];
  eligibility?: { eligible: boolean; status: string; reasons: Array<{ rule: string; passed: boolean; message: string }>; checkedAt: string };
  student?: Application['student'] & { tenthPercentage?: number; twelfthPercentage?: number; backlogs?: number; activeBacklogs?: number; skills?: string[]; batch?: { year?: number } };
  drive?: Application['drive'] & { location?: string; workMode?: string; applicationDeadline?: string; company?: { name?: string; industry?: string; website?: string } };
  resume?: { filename?: string; isPrimary?: boolean; status?: string; uploadedAt?: string };
}
export function messageFromError(error: unknown, fallback: string) {
  const message = typeof error === 'object' && error && 'response' in error ? (error as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message : undefined;
  return message || fallback;
}
export async function listPlacementApplications() { return (await api.get<{ data: { items: Application[] } }>('/placement/applications')).data.data.items; }
export async function getPlacementApplication(id: string) { return (await api.get<{ data: PlacementApplicationDetail }>(`/placement/applications/${id}`)).data.data; }
export async function updateApplicationStatus(id: string, status: string, extra?: { note?: string; rejectionReason?: string }) { return (await api.patch<{ data: PlacementApplicationDetail }>(`/placement/applications/${id}/status`, { status, ...extra })).data.data; }
export interface Interview { _id: string; selectionRoundName?: string; selectionRoundOrder?: number; type: string; date: string; startTime?: string; endTime?: string; mode: string; venueOrLink?: string; instructions?: string; status: string; drive?: { _id?: string; role?: string; location?: string; workMode?: string; company?: { name?: string } }; application?: { _id?: string; currentStage?: string; student?: { _id?: string; rollNumber?: string; user?: { displayName?: string; email?: string } } }; }
export interface Attendance { _id: string; status: string; remarks?: string; markedAt?: string; interview?: Interview; student?: { _id?: string; rollNumber?: string; user?: { displayName?: string; email?: string } }; application?: { currentStage?: string }; }
export interface PlacementDocument { _id: string; originalName?: string; type: string; status: string; createdAt: string; mimeType?: string; sizeBytes?: number; secureUrl?: string; reviewComment?: string; reviewedAt?: string; student?: { rollNumber?: string; user?: { displayName?: string; email?: string } }; }
export const interviewStatuses = ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED'] as const;
export const attendanceStatuses = ['PRESENT', 'ABSENT', 'EXCUSED', 'NOT_MARKED'] as const;
export const documentReviewStatuses = ['PENDING', 'VERIFIED', 'REJECTED', 'REUPLOAD_REQUIRED'] as const;
export async function listPlacementInterviews() { return (await api.get<{ data: Interview[] }>('/placement/interviews')).data.data; }
export async function scheduleInterview(input: Record<string, unknown>) { return (await api.post<{ data: Interview }>('/placement/interviews', input)).data.data; }
export async function updateInterviewStatus(id: string, status: string) { return (await api.patch<{ data: Interview }>(`/placement/interviews/${id}/status`, { status })).data.data; }
export async function listPlacementAttendance() { return (await api.get<{ data: Attendance[] }>('/placement/attendance')).data.data; }
export async function markInterviewAttendance(interviewId: string, studentId: string, status: string, remarks?: string) { return (await api.patch<{ data: Attendance }>(`/placement/interviews/${interviewId}/attendance`, { studentId, status, remarks })).data.data; }
export async function listPlacementDocuments() { return (await api.get<{ data: PlacementDocument[] }>('/placement/documents')).data.data; }
export async function reviewPlacementDocument(id: string, status: string, reviewComment?: string) { return (await api.patch<{ data: PlacementDocument }>(`/placement/documents/${id}/status`, { status, reviewComment })).data.data; }
export interface PlacementResult { _id: string; status: string; packageCtc?: number; joiningDate?: string; notes?: string; drive?: { role?: string }; company?: { name?: string }; }
export async function applyToDrive(id: string, resumeId?: string) { return (await api.post<{ data: Application }>(`/student/drives/${id}/apply`, { resumeId })).data.data; }
export async function listApplications() { return (await api.get<{ data: Application[] }>('/student/applications')).data.data; }
export async function withdrawApplication(id: string) { return (await api.patch<{ data: Application }>(`/student/applications/${id}/withdraw`)).data.data; }
export async function listStudentInterviews() { return (await api.get<{ data: Interview[] }>('/student/interviews')).data.data; }
export async function listStudentAttendance() { return (await api.get<{ data: Attendance[] }>('/student/attendance')).data.data; }
export async function listStudentDocuments() { return (await api.get<{ data: Array<{ _id: string; originalName?: string; type: string; status: string; createdAt: string }> }>('/student/documents')).data.data; }
export async function uploadStudentDocument(file: File, type: string) { const form = new FormData(); form.append('document', file); form.append('type', type); return api.post('/student/documents', form); }
export async function listStudentResults() { return (await api.get<{ data: PlacementResult[] }>('/student/results')).data.data; }
