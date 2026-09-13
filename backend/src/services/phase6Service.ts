import { AppError } from '../lib/errors.js';
import { writeAuditLog } from '../lib/audit.js';
import { Application, EligibilityRule, Interview, PlacementDrive, PreparationProgress, PreparationResource, StudentProfile, preparationCategories } from '../models/index.js';
import { evaluateEligibility, toEligibilityStudent, type EligibilityResult, type EligibilityRules } from './eligibilityService.js';

type ResourceCategory = (typeof preparationCategories)[number];
const upcomingStatuses = new Set(['SCHEDULED', 'RESCHEDULED']);

export function publishedResourceFilter() {
  return { isPublished: true as const };
}

export function ownedProgressFilter(studentId: string, resourceId: string) {
  return { student: studentId, resource: resourceId };
}

export function assertProgressOwner(progressStudentId: string, actorStudentId: string) {
  if (progressStudentId !== actorStudentId) throw new AppError(403, 'You cannot modify another student\'s preparation progress', 'PROGRESS_FORBIDDEN');
}

export function interviewTypeToResourceCategory(type: string): ResourceCategory {
  const normalized = type.trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (normalized === 'APTITUDE') return 'APTITUDE';
  if (normalized === 'CODING') return 'CODING';
  if (normalized === 'TECHNICAL') return 'TECHNICAL';
  if (normalized === 'HR') return 'HR';
  if (normalized === 'GD' || normalized === 'GROUP_DISCUSSION') return 'GD';
  if (normalized === 'RESUME') return 'RESUME';
  return 'GENERAL';
}

export function isUpcomingInterview(interview: { date?: Date | string; status?: string }, now = new Date()) {
  if (!interview.date) return false;
  const date = new Date(interview.date);
  return date.getTime() >= now.getTime() && upcomingStatuses.has(String(interview.status ?? 'SCHEDULED'));
}

export function relevantCategoriesFromInterviews(interviews: Array<{ type?: string; date?: Date | string; status?: string }>, now = new Date()) {
  return [...new Set(interviews.filter((item) => isUpcomingInterview(item, now)).map((item) => interviewTypeToResourceCategory(String(item.type ?? ''))))];
}

export function interviewsBelongingToStudent<T extends { application?: unknown }>(interviews: T[], applicationIds: string[]) {
  const allowed = new Set(applicationIds);
  return interviews.filter((item) => {
    const application = item.application;
    const id = application && typeof application === 'object' && '_id' in application
      ? String((application as { _id: unknown })._id)
      : String(application ?? '');
    return allowed.has(id);
  });
}

export function missingSkillsFromEligibility(eligibility: EligibilityResult) {
  const reason = eligibility.reasons.find((item) => item.rule === 'Required Skills' && !item.passed);
  if (!reason) return [];
  const match = reason.message.match(/Missing required skills:\s*(.*)$/i);
  return match?.[1] ? match[1].split(',').map((skill) => skill.trim()).filter(Boolean) : [];
}

export function buildPreparationBrief(input: {
  drive: { _id?: unknown; role?: string; requiredSkills?: string[]; rounds?: Array<{ name?: string; type?: string; order?: number }>; company?: { name?: string } };
  eligibility: EligibilityResult;
  interviews: Array<{ _id?: unknown; type?: string; date?: Date | string; status?: string; mode?: string; selectionRoundName?: string }>;
}) {
  return {
    drive: {
      id: String(input.drive._id ?? ''),
      role: input.drive.role,
      company: input.drive.company?.name,
      requiredSkills: input.drive.requiredSkills ?? [],
      roundTypes: (input.drive.rounds ?? []).map((round) => ({ name: round.name, type: round.type, order: round.order })),
    },
    eligibility: input.eligibility,
    missingSkills: missingSkillsFromEligibility(input.eligibility),
    interviews: input.interviews.map((item) => ({
      id: String(item._id ?? ''),
      type: item.type,
      round: item.selectionRoundName,
      date: item.date,
      status: item.status,
      mode: item.mode,
    })),
  };
}

const studentProfile = async (userId: string) => {
  const profile = await StudentProfile.findOne({ user: userId });
  if (!profile) throw new AppError(404, 'Student profile not found', 'PROFILE_NOT_FOUND');
  return profile;
};

export async function listPlacementResources(query: { category?: unknown }) {
  const filter: Record<string, unknown> = {};
  if (query.category) filter.category = query.category;
  return PreparationResource.find(filter).sort({ createdAt: -1 }).lean();
}

export async function createResource(input: { title: string; category: ResourceCategory; url: string; description?: string; isPublished?: boolean }, actorId?: string, ipAddress?: string) {
  const resource = await PreparationResource.create(input);
  await writeAuditLog({ actorId, action: 'PREPARATION_RESOURCE_CREATED', entityType: 'PreparationResource', entityId: resource.id, ipAddress });
  return resource;
}

export async function updateResource(id: string, input: Record<string, unknown>, actorId?: string, ipAddress?: string) {
  const resource = await PreparationResource.findByIdAndUpdate(id, { $set: input }, { new: true, runValidators: true }).lean();
  if (!resource) throw new AppError(404, 'Preparation resource not found', 'RESOURCE_NOT_FOUND');
  await writeAuditLog({ actorId, action: 'PREPARATION_RESOURCE_UPDATED', entityType: 'PreparationResource', entityId: id, ipAddress });
  return resource;
}

export async function publishResource(id: string, isPublished: boolean, actorId?: string, ipAddress?: string) {
  const resource = await PreparationResource.findByIdAndUpdate(id, { $set: { isPublished } }, { new: true }).lean();
  if (!resource) throw new AppError(404, 'Preparation resource not found', 'RESOURCE_NOT_FOUND');
  await writeAuditLog({ actorId, action: isPublished ? 'PREPARATION_RESOURCE_PUBLISHED' : 'PREPARATION_RESOURCE_UNPUBLISHED', entityType: 'PreparationResource', entityId: id, ipAddress });
  return resource;
}

export async function deleteResource(id: string, actorId?: string, ipAddress?: string) {
  const resource = await PreparationResource.findByIdAndDelete(id).lean();
  if (!resource) throw new AppError(404, 'Preparation resource not found', 'RESOURCE_NOT_FOUND');
  await PreparationProgress.deleteMany({ resource: id });
  await writeAuditLog({ actorId, action: 'PREPARATION_RESOURCE_DELETED', entityType: 'PreparationResource', entityId: id, ipAddress });
  return resource;
}

async function studentInterviews(userId: string) {
  const profile = await studentProfile(userId);
  const applications = await Application.find({ student: profile._id }).select('_id').lean();
  const applicationIds = applications.map((application) => String(application._id));
  const interviews = await Interview.find({ application: { $in: applications.map((application) => application._id) } })
    .populate({ path: 'drive', select: 'role location workMode rounds', populate: { path: 'company', select: 'name' } })
    .sort({ date: 1 })
    .lean();
  return { profile, applicationIds, interviews: interviewsBelongingToStudent(interviews, applicationIds) };
}

export async function listStudentPreparation(userId: string) {
  const profile = await studentProfile(userId);
  const [resources, progress, calendar] = await Promise.all([
    PreparationResource.find(publishedResourceFilter()).sort({ category: 1, title: 1 }).lean(),
    PreparationProgress.find({ student: profile._id }).lean(),
    studentInterviews(userId),
  ]);
  const interviews = calendar.interviews;
  const completed = new Set(progress.map((item) => String(item.resource)));
  const relevant = new Set(relevantCategoriesFromInterviews(interviews as Array<{ type?: string; date?: Date | string; status?: string }>));
  return {
    upcomingInterviewTypes: [...relevant],
    resources: resources.map((resource) => ({
      _id: resource._id,
      title: resource.title,
      category: resource.category,
      description: resource.description,
      url: resource.url,
      completed: completed.has(String(resource._id)),
      relevantToUpcomingInterview: relevant.has(resource.category as ResourceCategory),
    })),
  };
}

export async function setPreparationProgress(userId: string, resourceId: string, completed: boolean) {
  const profile = await studentProfile(userId);
  const resource = await PreparationResource.findOne({ _id: resourceId, ...publishedResourceFilter() });
  if (!resource) throw new AppError(404, 'Published preparation resource not found', 'RESOURCE_NOT_FOUND');
  const filter = ownedProgressFilter(String(profile._id), resourceId);
  assertProgressOwner(String(filter.student), String(profile._id));
  if (completed) {
    await PreparationProgress.findOneAndUpdate(filter, { $setOnInsert: { student: profile._id, resource: resourceId }, $set: { completedAt: new Date() } }, { upsert: true, new: true });
  } else {
    await PreparationProgress.deleteOne(filter);
  }
  return { resourceId, completed, studentId: String(profile._id) };
}

export async function listStudentCalendar(userId: string) {
  return (await studentInterviews(userId)).interviews;
}

export async function getPreparationBrief(userId: string, driveId: string) {
  const profile = await studentProfile(userId);
  const drive = await PlacementDrive.findOne({ _id: driveId, status: 'PUBLISHED' }).populate('company', 'name').lean();
  if (!drive) throw new AppError(404, 'Published placement drive not found', 'DRIVE_NOT_FOUND');
  const rule = await EligibilityRule.findOne({ drive: driveId }).lean();
  const eligibility = evaluateEligibility(toEligibilityStudent(profile.toObject()), (rule ?? drive) as EligibilityRules);
  const interviews = (await studentInterviews(userId)).interviews.filter((item) => {
    const driveRef = (item as { drive?: unknown }).drive;
    const id = driveRef && typeof driveRef === 'object' && '_id' in driveRef ? String((driveRef as { _id: unknown })._id) : String(driveRef ?? '');
    return id === driveId;
  });
  const company = drive.company && typeof drive.company === 'object' && 'name' in drive.company ? { name: String((drive.company as { name?: unknown }).name ?? '') } : undefined;
  return buildPreparationBrief({
    drive: { _id: drive._id, role: drive.role, requiredSkills: drive.requiredSkills, rounds: drive.rounds, company },
    eligibility,
    interviews: interviews as never,
  });
}
