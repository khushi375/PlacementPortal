import { Types } from 'mongoose';
import { AppError } from '../lib/errors.js';
import { writeAuditLog } from '../lib/audit.js';
import { Application, Attendance, Company, Document, Grievance, Interview, Notification, PlacementDrive, PlacementResult, StudentProfile, User } from '../models/index.js';

export type CommunicationInput = { title: string; message: string; type?: string; allStudents?: boolean; studentIds?: string[]; driveId?: string };
export function communicationAudience(input: CommunicationInput) {
  const selected = [input.allStudents === true, Boolean(input.studentIds?.length), Boolean(input.driveId)].filter(Boolean).length;
  if (selected !== 1) throw new AppError(400, 'Choose exactly one audience: all students, selected students, or a placement drive', 'INVALID_COMMUNICATION_AUDIENCE');
  if (input.allStudents) return 'ALL_STUDENTS';
  if (input.driveId) return 'DRIVE_APPLICANTS';
  return 'SELECTED_STUDENTS';
}

const grouped = async (model: { aggregate: (pipeline: [{ $group: { _id: string; count: { $sum: 1 } } }]) => PromiseLike<Array<{ _id?: string | null; count: number }>> }, field: string) => {
  const rows = await model.aggregate([{ $group: { _id: `$${field}`, count: { $sum: 1 } } }]);
  return Object.fromEntries(rows.map((row) => [String(row._id ?? 'UNKNOWN'), row.count]));
};
const studentProfile = async (userId: string) => {
  const profile = await StudentProfile.findOne({ user: userId });
  if (!profile) throw new AppError(404, 'Student profile not found', 'PROFILE_NOT_FOUND');
  return profile;
};

export async function getCommandCenter() {
  const [companies, activeCompanies, drives, applications, interviews, attendance, documents, results, openGrievances, recentApplications, upcomingInterviews] = await Promise.all([
    Company.countDocuments(),
    Company.countDocuments({ status: 'ACTIVE' }),
    grouped(PlacementDrive, 'status'),
    grouped(Application, 'currentStage'),
    grouped(Interview, 'status'),
    grouped(Attendance, 'status'),
    grouped(Document, 'status'),
    grouped(PlacementResult, 'status'),
    Grievance.countDocuments({ status: { $in: ['OPEN', 'IN_PROGRESS'] } }),
    Application.find().populate({ path: 'student', select: 'rollNumber user', populate: { path: 'user', select: 'displayName' } }).populate({ path: 'drive', select: 'role', populate: { path: 'company', select: 'name' } }).sort({ createdAt: -1 }).limit(6).lean(),
    Interview.find({ status: 'SCHEDULED', date: { $gte: new Date() } }).populate({ path: 'application', populate: { path: 'student', select: 'rollNumber user', populate: { path: 'user', select: 'displayName' } } }).populate('drive', 'role').sort({ date: 1 }).limit(6).lean(),
  ]);
  const sum = (record: Record<string, number>) => Object.values(record).reduce((total, value) => total + value, 0);
  return {
    companies: { total: companies, active: activeCompanies },
    drives: { total: sum(drives), byStatus: drives },
    applications: { total: sum(applications), byStage: applications },
    interviews: { total: sum(interviews), byStatus: interviews },
    attendance: { total: sum(attendance), byStatus: attendance },
    documents: { total: sum(documents), byStatus: documents },
    results: { total: sum(results), byStatus: results },
    openGrievances,
    recentApplications,
    upcomingInterviews,
  };
}

export async function getAnalytics() {
  const [overview, applicationsByDrive] = await Promise.all([
    getCommandCenter(),
    Application.aggregate([
      { $group: { _id: '$drive', total: { $sum: 1 }, selected: { $sum: { $cond: [{ $in: ['$currentStage', ['SELECTED', 'PLACED']] }, 1, 0] } }, rejected: { $sum: { $cond: [{ $eq: ['$currentStage', 'REJECTED'] }, 1, 0] } } } },
      { $lookup: { from: 'placementdrives', localField: '_id', foreignField: '_id', as: 'drive' } },
      { $unwind: { path: '$drive', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'companies', localField: 'drive.company', foreignField: '_id', as: 'company' } },
      { $unwind: { path: '$company', preserveNullAndEmptyArrays: true } },
      { $project: { role: '$drive.role', company: '$company.name', total: 1, selected: 1, rejected: 1 } },
      { $sort: { total: -1 } },
      { $limit: 12 },
    ]),
  ]);
  const present = overview.attendance.byStatus.PRESENT ?? 0;
  const marked = present + (overview.attendance.byStatus.ABSENT ?? 0) + (overview.attendance.byStatus.EXCUSED ?? 0);
  return {
    totals: {
      companies: overview.companies.total,
      drives: overview.drives.total,
      applications: overview.applications.total,
      interviews: overview.interviews.total,
      attendance: overview.attendance.total,
      documents: overview.documents.total,
      results: overview.results.total,
    },
    drivesByStatus: overview.drives.byStatus,
    applicationsByStage: overview.applications.byStage,
    interviewsByStatus: overview.interviews.byStatus,
    attendanceByStatus: overview.attendance.byStatus,
    documentsByStatus: overview.documents.byStatus,
    resultsByStatus: overview.results.byStatus,
    applicationsByDrive,
    attendanceMarked: marked,
    presentCount: present,
  };
}

export async function listDirectory(search?: string) {
  const filter: Record<string, unknown> = {};
  if (search) filter.rollNumber = { $regex: search.slice(0, 60), $options: 'i' };
  return StudentProfile.find(filter).populate('user', '_id displayName email').select('rollNumber cgpa user').sort({ rollNumber: 1 }).limit(50).lean();
}

async function recipientIds(input: CommunicationInput) {
  const audience = communicationAudience(input);
  if (audience === 'ALL_STUDENTS') return (await User.find({ role: 'STUDENT', isActive: true }).select('_id').lean()).map((user) => user._id);
  if (audience === 'SELECTED_STUDENTS') {
    const users = await User.find({ _id: { $in: input.studentIds }, role: 'STUDENT', isActive: true }).select('_id').lean();
    if (users.length !== (input.studentIds ?? []).length) throw new AppError(400, 'One or more selected recipients are not active students', 'INVALID_COMMUNICATION_RECIPIENTS');
    return users.map((user) => user._id);
  }
  const drive = await PlacementDrive.findById(input.driveId).select('_id');
  if (!drive) throw new AppError(404, 'Placement drive not found', 'DRIVE_NOT_FOUND');
  const applications = await Application.find({ drive: drive._id }).populate('student', 'user').lean();
  const ids = applications.map((application) => {
    const student = application.student as { user?: unknown } | undefined;
    return student?.user;
  }).filter(Boolean);
  return [...new Set(ids.map((value) => String(value)))].map((id) => new Types.ObjectId(id));
}

export async function sendCommunication(input: CommunicationInput, actorId: string, ipAddress?: string) {
  const audience = communicationAudience(input);
  const recipients = await recipientIds(input);
  if (!recipients.length) throw new AppError(400, 'No students matched the selected audience', 'EMPTY_COMMUNICATION_AUDIENCE');
  const broadcastId = new Types.ObjectId();
  await Notification.insertMany(recipients.map((recipient) => ({ recipient, type: input.type ?? 'ANNOUNCEMENT', title: input.title, message: input.message, metadata: { broadcastId, audience, driveId: input.driveId } })));
  await writeAuditLog({ actorId, action: 'COMMUNICATION_SENT', entityType: 'Notification', entityId: String(broadcastId), metadata: { audience, count: recipients.length }, ipAddress });
  return { broadcastId, sent: recipients.length, audience };
}

export async function listCommunications() {
  return Notification.aggregate([
    { $match: { 'metadata.broadcastId': { $exists: true } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: '$metadata.broadcastId', title: { $first: '$title' }, message: { $first: '$message' }, type: { $first: '$type' }, audience: { $first: '$metadata.audience' }, sentAt: { $first: '$createdAt' }, count: { $sum: 1 } } },
    { $sort: { sentAt: -1 } },
    { $limit: 50 },
  ]);
}

export async function listStudentGrievances(userId: string) {
  return Grievance.find({ student: (await studentProfile(userId))._id }).sort({ createdAt: -1 }).lean();
}
export async function createGrievance(userId: string, input: { category?: string; subject?: string; description?: string; priority?: 'LOW' | 'MEDIUM' | 'HIGH' }, ipAddress?: string) {
  const grievance = await Grievance.create({ ...input, student: (await studentProfile(userId))._id });
  await writeAuditLog({ actorId: userId, action: 'GRIEVANCE_CREATED', entityType: 'Grievance', entityId: grievance.id, ipAddress });
  return grievance;
}
export async function listPlacementGrievances() {
  return Grievance.find().populate({ path: 'student', select: 'rollNumber user', populate: { path: 'user', select: 'displayName email' } }).sort({ createdAt: -1 }).lean();
}
export async function updateGrievanceStatus(id: string, status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED', actorId: string, ipAddress?: string) {
  const grievance = await Grievance.findByIdAndUpdate(id, { $set: { status } }, { new: true }).populate({ path: 'student', select: 'rollNumber user', populate: { path: 'user', select: 'displayName email' } });
  if (!grievance) throw new AppError(404, 'Grievance not found', 'GRIEVANCE_NOT_FOUND');
  await writeAuditLog({ actorId, action: 'GRIEVANCE_STATUS_CHANGED', entityType: 'Grievance', entityId: id, metadata: { status }, ipAddress });
  return grievance;
}
