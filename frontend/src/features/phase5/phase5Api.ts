import { api } from '../../services/studentApi';
export interface CountGroup { total: number; byStatus?: Record<string, number>; byStage?: Record<string, number>; active?: number }
export interface CommandCenter {
  companies: { total: number; active: number };
  drives: CountGroup;
  applications: CountGroup;
  interviews: CountGroup;
  attendance: CountGroup;
  documents: CountGroup;
  results: CountGroup;
  openGrievances: number;
  recentApplications: Array<{ _id: string; currentStage: string; appliedAt?: string; student?: { rollNumber?: string; user?: { displayName?: string } }; drive?: { role?: string; company?: { name?: string } } }>;
  upcomingInterviews: Array<{ _id: string; date: string; selectionRoundName?: string; type: string; drive?: { role?: string }; application?: { student?: { rollNumber?: string; user?: { displayName?: string } } } }>;
}
export interface Analytics {
  totals: Record<string, number>;
  drivesByStatus: Record<string, number>;
  applicationsByStage: Record<string, number>;
  interviewsByStatus: Record<string, number>;
  attendanceByStatus: Record<string, number>;
  documentsByStatus: Record<string, number>;
  resultsByStatus: Record<string, number>;
  applicationsByDrive: Array<{ role?: string; company?: string; total: number; selected: number; rejected: number }>;
  attendanceMarked: number;
  presentCount: number;
}
export interface Broadcast { _id: string; title: string; message: string; type: string; audience?: string; sentAt: string; count: number }
export interface DirectoryStudent { _id: string; rollNumber?: string; cgpa?: number; user?: { _id?: string; displayName?: string; email?: string } }
export interface Grievance { _id: string; category?: string; subject?: string; description?: string; priority?: string; status: string; createdAt: string; student?: { rollNumber?: string; user?: { displayName?: string; email?: string } } }
export async function fetchCommandCenter() { return (await api.get<{ data: CommandCenter }>('/placement/command-center')).data.data; }
export async function fetchAnalytics() { return (await api.get<{ data: Analytics }>('/placement/analytics')).data.data; }
export async function fetchDirectory(search = '') { return (await api.get<{ data: DirectoryStudent[] }>('/placement/students', { params: { search } })).data.data; }
export async function fetchCommunications() { return (await api.get<{ data: Broadcast[] }>('/placement/communications')).data.data; }
export async function sendCommunication(input: Record<string, unknown>) { return (await api.post<{ data: { sent: number } }>('/placement/communications', input)).data.data; }
export async function fetchPlacementGrievances() { return (await api.get<{ data: Grievance[] }>('/placement/grievances')).data.data; }
export async function updateGrievanceStatus(id: string, status: string) { return (await api.patch<{ data: Grievance }>(`/placement/grievances/${id}/status`, { status })).data.data; }
export async function fetchStudentGrievances() { return (await api.get<{ data: Grievance[] }>('/student/grievances')).data.data; }
export async function createStudentGrievance(input: Record<string, unknown>) { return (await api.post<{ data: Grievance }>('/student/grievances', input)).data.data; }
