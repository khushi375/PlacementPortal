export interface StudentProfile {
  _id: string;
  user: string;
  phone?: string;
  profilePhotoUrl?: string;
  rollNumber?: string;
  graduationYear?: number;
  cgpa?: number;
  tenthPercentage?: number;
  twelfthPercentage?: number;
  backlogs?: number;
  activeBacklogs?: number;
  academicGaps?: number;
  skills?: string[];
  projects?: Array<{ name: string; description?: string; url?: string }>;
  social?: { github?: string; linkedin?: string; portfolio?: string };
  verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REQUIRES_UPDATE';
}
export interface SemesterRecord { _id: string; semester: number; sgpa: number; credits?: number; }
export interface Resume { _id: string; filename: string; uploadedAt: string; isPrimary: boolean; status: 'ACTIVE' | 'ARCHIVED'; sizeBytes?: number; }
export interface Notification { _id: string; type: string; title: string; message: string; createdAt: string; readAt?: string; }
export interface StudentOverview { user: { id: string; email: string; displayName: string }; profile: StudentProfile; academicRecords: SemesterRecord[]; resumes: Resume[]; completion: { completionPercentage: number; missingFields: string[]; completedSections: string[] }; }
