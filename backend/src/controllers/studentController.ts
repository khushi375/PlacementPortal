import type { Request, Response } from 'express';
import { Resume, StudentProfile, User } from '../models/index.js';
import { uploadPrivateFile } from '../lib/cloudinary.js';
import { AppError } from '../lib/errors.js';
import { getOrCreateStudentProfile, getStudentOverview, updateAcademics, updateStudentProfile, listSemesters, createSemester, updateSemester, deleteSemester, listNotifications, markNotificationRead } from '../services/studentService.js';

const studentId = (request: Request) => request.authUser?.userId as string;
const routeId = (request: Request) => String(request.params.id);
const success = (response: Response, data: unknown, status = 200) => response.status(status).json({ success: true, data });

export async function registerUser(request: Request, response: Response) {
  const { firebaseUid, email, displayName } = request.body;
  const existingUser = await User.findOne({ $or: [{ firebaseUid }, { email }] }).lean();
  if (existingUser) throw new AppError(409, 'User already exists', 'USER_EXISTS');
  
  // Assign role based on email - authorized admin gets SUPER_ADMIN, others get STUDENT
  const AUTHORIZED_ADMIN_EMAIL = 'placement123@gmail.com';
  const role = email === AUTHORIZED_ADMIN_EMAIL ? 'SUPER_ADMIN' : 'STUDENT';
  
  const user = await User.create({ firebaseUid, email, displayName, role, emailVerified: false, isActive: true });
  if (role === 'STUDENT') {
    try {
      await StudentProfile.create({ user: user._id });
    } catch (error) {
      // If profile creation fails, still succeed with user creation
      console.error('Failed to create student profile:', error);
    }
  }
  return success(response, { userId: user._id, role: user.role }, 201);
}

export async function createAdminUser(request: Request, response: Response) {
  const { firebaseUid, email, displayName, role } = request.body;
  const existingUser = await User.findOne({ $or: [{ firebaseUid }, { email }] }).lean();
  if (existingUser) throw new AppError(409, 'User already exists', 'USER_EXISTS');
  const user = await User.create({ firebaseUid, email, displayName, role, emailVerified: true, isActive: true });
  return success(response, { userId: user._id, role: user.role }, 201);
}

export async function getProfile(request: Request, response: Response) { return success(response, await getStudentOverview(studentId(request))); }
export async function putProfile(request: Request, response: Response) { return success(response, await updateStudentProfile(studentId(request), request.body)); }
export async function getAcademics(request: Request, response: Response) { const overview = await getStudentOverview(studentId(request)); return success(response, { profile: overview.profile, records: overview.academicRecords }); }
export async function putAcademics(request: Request, response: Response) { return success(response, await updateAcademics(studentId(request), request.body)); }
export async function getCompletion(request: Request, response: Response) { const overview = await getStudentOverview(studentId(request)); return success(response, overview.completion); }
export async function getSemesters(request: Request, response: Response) { return success(response, await listSemesters(studentId(request))); }
export async function postSemester(request: Request, response: Response) { return success(response, await createSemester(studentId(request), request.body), 201); }
export async function putSemester(request: Request, response: Response) { return success(response, await updateSemester(studentId(request), routeId(request), request.body)); }
export async function removeSemester(request: Request, response: Response) { await deleteSemester(studentId(request), routeId(request)); return response.status(204).send(); }
export async function getNotifications(request: Request, response: Response) { const notifications = await listNotifications(studentId(request)); return success(response, { notifications, unreadCount: notifications.filter((notification) => !notification.readAt).length }); }
export async function readNotification(request: Request, response: Response) { return success(response, await markNotificationRead(studentId(request), routeId(request))); }

export async function uploadResume(request: Request, response: Response) {
  const file = request.file;
  if (!file) throw new AppError(400, 'A PDF resume is required', 'RESUME_REQUIRED');
  if (file.mimetype !== 'application/pdf' || !file.originalname.toLowerCase().endsWith('.pdf') || file.size > 5 * 1024 * 1024) {
    throw new AppError(400, 'Resume must be a valid PDF under 5 MB', 'INVALID_RESUME');
  }
  const pdfHeader = file.buffer.subarray(0, 4).toString();
  if (pdfHeader !== '%PDF') {
    throw new AppError(400, 'Invalid PDF file', 'INVALID_RESUME');
  }
  const profile = await getOrCreateStudentProfile(studentId(request));
  if (!profile.profile) throw new AppError(404, 'Student profile not found', 'PROFILE_NOT_FOUND');
  const uploaded = await uploadPrivateFile(file.buffer, `placement-portal/resumes/${studentId(request)}`, 'raw');
  const resume = await Resume.create({ student: profile.profile._id, filename: file.originalname, storageKey: uploaded.publicId, secureUrl: uploaded.secureUrl, mimeType: file.mimetype, sizeBytes: file.size });
  return success(response, resume, 201);
}

export async function getResumes(request: Request, response: Response) { const profile = await getOrCreateStudentProfile(studentId(request)); if (!profile.profile) throw new AppError(404, 'Student profile not found', 'PROFILE_NOT_FOUND'); return success(response, await Resume.find({ student: profile.profile._id }).select('-storageKey').sort({ createdAt: -1 }).lean()); }
export async function setPrimaryResume(request: Request, response: Response) { const profile = await getOrCreateStudentProfile(studentId(request)); if (!profile.profile) throw new AppError(404, 'Student profile not found', 'PROFILE_NOT_FOUND'); const resume = await Resume.findOne({ _id: request.params.id, student: profile.profile._id, status: 'ACTIVE' }); if (!resume) throw new AppError(404, 'Resume not found', 'RESUME_NOT_FOUND'); await Resume.updateMany({ student: profile.profile._id }, { $set: { isPrimary: false } }); resume.isPrimary = true; await resume.save(); return success(response, resume); }
export async function archiveResume(request: Request, response: Response) { const profile = await getOrCreateStudentProfile(studentId(request)); if (!profile.profile) throw new AppError(404, 'Student profile not found', 'PROFILE_NOT_FOUND'); const resume = await Resume.findOneAndUpdate({ _id: request.params.id, student: profile.profile._id }, { $set: { status: 'ARCHIVED', isPrimary: false } }, { new: true }).select('-storageKey'); if (!resume) throw new AppError(404, 'Resume not found', 'RESUME_NOT_FOUND'); return success(response, resume); }

export async function uploadProfilePhoto(request: Request, response: Response) {
  const file = request.file;
  if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype) || file.size > 2 * 1024 * 1024) throw new AppError(400, 'Profile photo must be JPG, PNG, or WEBP under 2 MB', 'INVALID_PROFILE_PHOTO');
  const signature = file.buffer.subarray(0, 4).toString('hex');
  if (!['ffd8ffe0', 'ffd8ffe1', '89504e47'].includes(signature) && file.mimetype !== 'image/webp') throw new AppError(400, 'Invalid image file', 'INVALID_PROFILE_PHOTO');
  const uploaded = await uploadPrivateFile(file.buffer, `placement-portal/profile-photos/${studentId(request)}`, 'image');
  const profile = await StudentProfile.findOneAndUpdate({ user: studentId(request) }, { $set: { profilePhotoUrl: uploaded.secureUrl } }, { new: true });
  return success(response, profile);
}
