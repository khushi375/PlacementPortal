import { AppError } from '../lib/errors.js';
import { AcademicRecord, Resume, StudentProfile, User } from '../models/index.js';

const completionFields = [
  ['phone', 'Phone number'], ['rollNumber', 'University roll number'], ['course', 'Course'], ['department', 'Department'],
  ['batch', 'Batch'], ['graduationYear', 'Graduation year'], ['cgpa', 'CGPA'], ['tenthPercentage', '10th percentage'],
  ['twelfthPercentage', '12th percentage'], ['skills', 'Skills'], ['projects', 'Projects'], ['social', 'Social profiles'],
] as const;

function hasValue(value: unknown) {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === 'object') return Object.values(value).some(Boolean);
  return value !== undefined && value !== null && value !== '';
}

export async function getOrCreateStudentProfile(userId: string) {
  const user = await User.findById(userId).lean();
  if (!user) throw new AppError(404, 'User account not found', 'USER_NOT_FOUND');
  const profile = await StudentProfile.findOneAndUpdate({ user: userId }, { $setOnInsert: { user: userId } }, { new: true, upsert: true });
  return { user, profile };
}

export function getCompletion(profile: Record<string, unknown>, hasResume: boolean) {
  const completedSections: string[] = completionFields.filter(([field]) => hasValue(profile[field])).map(([, label]) => label);
  if (hasResume) completedSections.push('Resume');
  const total = completionFields.length + 1;
  const completionPercentage = Math.round((completedSections.length / total) * 100);
  const missingFields = [...completionFields.filter(([field]) => !hasValue(profile[field])).map(([, label]) => label), ...(hasResume ? [] : ['Resume'])];
  return { completionPercentage, missingFields, completedSections };
}

export async function getStudentOverview(userId: string) {
  const { user, profile } = await getOrCreateStudentProfile(userId);
  const hasResume = await Resume.exists({ student: profile._id, status: 'ACTIVE' });
  const completion = getCompletion(profile.toObject(), Boolean(hasResume));
  const [academicRecords, resumes] = await Promise.all([
    AcademicRecord.find({ student: profile._id }).sort({ semester: 1 }).lean(),
    Resume.find({ student: profile._id }).sort({ createdAt: -1 }).select('-storageKey').lean(),
  ]);
  return { user: { id: user._id, email: user.email, displayName: user.displayName }, profile, academicRecords, resumes, completion };
}

export async function updateStudentProfile(userId: string, input: Record<string, unknown>) {
  const { profile } = await getOrCreateStudentProfile(userId);
  const allowed = ['phone', 'profilePhotoUrl', 'dateOfBirth', 'address', 'rollNumber', 'course', 'department', 'batch', 'graduationYear', 'cgpa', 'tenthPercentage', 'twelfthPercentage', 'backlogs', 'activeBacklogs', 'academicGaps', 'skills', 'projects', 'certifications', 'internships', 'achievements', 'social'];
  const update = Object.fromEntries(Object.entries(input).filter(([key]) => allowed.includes(key)));
  const updated = await StudentProfile.findByIdAndUpdate(profile._id, { $set: update, $setOnInsert: { verificationStatus: 'UNVERIFIED' } }, { new: true, runValidators: true });
  if (typeof input.displayName === 'string') await User.findByIdAndUpdate(userId, { $set: { displayName: input.displayName } });
  return updated;
}

export async function updateAcademics(userId: string, input: Record<string, unknown>) {
  return updateStudentProfile(userId, input);
}

export async function getStudentId(userId: string) {
  const { profile } = await getOrCreateStudentProfile(userId);
  return profile._id;
}

export async function listSemesters(userId: string) {
  return AcademicRecord.find({ student: await getStudentId(userId) }).sort({ semester: 1 }).lean();
}

export async function createSemester(userId: string, input: { semester: number; sgpa: number; credits?: number }) {
  try {
    return await AcademicRecord.create({ ...input, student: await getStudentId(userId) });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) throw new AppError(409, 'A record for this semester already exists', 'DUPLICATE_SEMESTER');
    throw error;
  }
}

export async function updateSemester(userId: string, semesterId: string, input: { semester: number; sgpa: number; credits?: number }) {
  const record = await AcademicRecord.findOneAndUpdate({ _id: semesterId, student: await getStudentId(userId) }, { $set: input }, { new: true, runValidators: true });
  if (!record) throw new AppError(404, 'Semester record not found', 'SEMESTER_NOT_FOUND');
  return record;
}

export async function deleteSemester(userId: string, semesterId: string) {
  const deleted = await AcademicRecord.findOneAndDelete({ _id: semesterId, student: await getStudentId(userId) });
  if (!deleted) throw new AppError(404, 'Semester record not found', 'SEMESTER_NOT_FOUND');
}

export async function listNotifications(userId: string) {
  const { Notification } = await import('../models/index.js');
  return Notification.find({ recipient: userId }).sort({ createdAt: -1 }).limit(50).lean();
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const { Notification } = await import('../models/index.js');
  const notification = await Notification.findOneAndUpdate({ _id: notificationId, recipient: userId }, { $set: { readAt: new Date() } }, { new: true }).lean();
  if (!notification) throw new AppError(404, 'Notification not found', 'NOTIFICATION_NOT_FOUND');
  return notification;
}
