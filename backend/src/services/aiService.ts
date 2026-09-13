import { AppError } from '../lib/errors.js';
import { writeAuditLog } from '../lib/audit.js';
import { generateAiText } from '../lib/ai.js';
import { Application, EligibilityRule, Interview, PlacementDrive, Resume, StudentProfile } from '../models/index.js';
import { evaluateEligibility, toEligibilityStudent, type EligibilityResult, type EligibilityRules } from './eligibilityService.js';

export type AuthenticatedActor = { userId?: string; role?: string };

export function assertAuthenticated(actor?: AuthenticatedActor) {
  if (!actor?.userId) throw new AppError(401, 'Authentication required', 'UNAUTHENTICATED');
}

export function assertStudentActor(actor?: AuthenticatedActor) {
  assertAuthenticated(actor);
  if (actor!.role !== 'STUDENT') throw new AppError(403, 'Student access required', 'FORBIDDEN');
}

export function assertStudentInterviewAccess(ownerStudentId: string, actorStudentId: string) {
  if (ownerStudentId !== actorStudentId) throw new AppError(403, 'You cannot access another student\'s interview', 'AI_FORBIDDEN');
}

const studentProfile = async (userId: string) => {
  const profile = await StudentProfile.findOne({ user: userId }).populate('department', 'name').populate('course', 'name').lean();
  if (!profile) throw new AppError(404, 'Student profile not found', 'PROFILE_NOT_FOUND');
  return profile;
};

export function assertPublishedDrive(drive?: { status?: string } | null) {
  if (!drive || drive.status !== 'PUBLISHED') throw new AppError(404, 'Published placement drive not found', 'DRIVE_NOT_FOUND');
}

async function publishedDrive(driveId: string) {
  const drive = await PlacementDrive.findById(driveId).populate('company', 'name industry').lean();
  assertPublishedDrive(drive);
  return drive!;
}

function coachingFacts(profile: Record<string, unknown>, resume?: Record<string, unknown> | null) {
  const list = (value: unknown) => Array.isArray(value) ? value : [];
  return {
    skills: list(profile.skills),
    projects: list(profile.projects).map((item) => {
      const project = item as { name?: string; description?: string };
      return { name: project.name, description: project.description };
    }),
    internships: list(profile.internships).map((item) => {
      const internship = item as { organization?: string; role?: string; description?: string };
      return { organization: internship.organization, role: internship.role, description: internship.description };
    }),
    certifications: list(profile.certifications).map((item) => {
      const certification = item as { name?: string; issuer?: string };
      return { name: certification.name, issuer: certification.issuer };
    }),
    department: profile.department && typeof profile.department === 'object' && 'name' in profile.department ? (profile.department as { name?: string }).name : undefined,
    course: profile.course && typeof profile.course === 'object' && 'name' in profile.course ? (profile.course as { name?: string }).name : undefined,
    graduationYear: profile.graduationYear,
    resume: resume ? { filename: resume.filename, isPrimary: resume.isPrimary, status: resume.status, uploadedAt: resume.uploadedAt } : null,
  };
}

function driveFacts(drive: Record<string, unknown>) {
  const company = drive.company && typeof drive.company === 'object' ? drive.company as { name?: string; industry?: string } : undefined;
  return {
    role: drive.role,
    company: company?.name,
    industry: company?.industry,
    jobDescription: drive.jobDescription ?? null,
    requiredSkills: drive.requiredSkills ?? [],
    rounds: Array.isArray(drive.rounds) ? drive.rounds.map((round) => {
      const item = round as { name?: string; type?: string; order?: number };
      return { name: item.name, type: item.type, order: item.order };
    }) : [],
  };
}

async function audit(actorId: string, feature: string, entityId?: string, ipAddress?: string) {
  await writeAuditLog({ actorId, action: 'AI_REQUEST', entityType: 'AiCoaching', entityId, metadata: { feature }, ipAddress });
}

export function eligibilityExplanationPayload(eligibility: EligibilityResult) {
  return { status: eligibility.status, eligible: eligibility.eligible, reasons: eligibility.reasons };
}

export async function resumeCoach(userId: string, driveId: string, ipAddress?: string) {
  const profile = await studentProfile(userId);
  const drive = await publishedDrive(driveId);
  const resume = await Resume.findOne({ student: profile._id, isPrimary: true, status: 'ACTIVE' }).select('filename isPrimary status uploadedAt').lean();
  const suggestion = await generateAiText(`Resume coaching request. Do not invent facts. Facts JSON:\n${JSON.stringify({ student: coachingFacts(profile as never, resume as never), drive: driveFacts(drive as never) })}\nReturn concise suggestions: skills to highlight from the listed skills, projects/internships to emphasize from listed items, gaps versus listed required skills, and resume improvements for this role. Say when resume file content is unavailable.`);
  await audit(userId, 'RESUME_COACH', driveId, ipAddress);
  return { suggestion, disclaimer: 'AI suggestions do not change eligibility, application status, or official placement decisions.' };
}

export async function interviewPractice(userId: string, input: { interviewId?: string; driveId?: string; roundType?: string }, ipAddress?: string) {
  const profile = await studentProfile(userId);
  let drive;
  let roundType = input.roundType;
  let interviewId = input.interviewId;
  if (input.interviewId) {
    const interview = await Interview.findById(input.interviewId).populate({ path: 'drive', populate: { path: 'company', select: 'name industry' } }).lean();
    if (!interview) throw new AppError(404, 'Interview not found', 'INTERVIEW_NOT_FOUND');
    const application = await Application.findById(interview.application).select('student').lean();
    if (!application) throw new AppError(404, 'Interview not found', 'INTERVIEW_NOT_FOUND');
    assertStudentInterviewAccess(String(application.student), String(profile._id));
    const populated = interview.drive && typeof interview.drive === 'object' && 'role' in interview.drive;
    drive = populated ? interview.drive as unknown as Record<string, unknown> : await publishedDrive(String(interview.drive));
    roundType = String(interview.type);
    interviewId = String(interview._id);
  } else {
    if (!input.driveId || !input.roundType) throw new AppError(400, 'Provide interviewId or both driveId and roundType', 'VALIDATION_ERROR');
    drive = await publishedDrive(input.driveId);
    roundType = input.roundType;
  }
  const suggestion = await generateAiText(`Interview practice request. Do not invent facts or an interview record. Facts JSON:\n${JSON.stringify({ drive: driveFacts(drive as never), roundType, studentSkills: (profile.skills ?? []) })}\nGenerate practice questions and brief guidance appropriate to this round type using only the supplied drive/role/job description/required skills.`);
  await audit(userId, 'INTERVIEW_PRACTICE', interviewId ?? String((drive as { _id?: unknown })._id ?? input.driveId), ipAddress);
  return { suggestion, roundType, disclaimer: 'AI suggestions do not change eligibility, application status, or official placement decisions.' };
}

export async function explainEligibility(userId: string, driveId: string, ipAddress?: string) {
  const profile = await studentProfile(userId);
  const drive = await publishedDrive(driveId);
  const rule = await EligibilityRule.findOne({ drive: driveId }).lean();
  const eligibility = evaluateEligibility(toEligibilityStudent(profile), (rule ?? drive) as EligibilityRules);
  const payload = eligibilityExplanationPayload(eligibility);
  const explanation = await generateAiText(`Explain this existing eligibility result in simple student-friendly language. Do not recalculate or change eligibility. Facts JSON:\n${JSON.stringify({ eligibility: payload, requiredSkills: drive.requiredSkills ?? [] })}`);
  await audit(userId, 'ELIGIBILITY_EXPLANATION', driveId, ipAddress);
  return {
    eligibility,
    explanation,
    disclaimer: 'AI suggestions do not change eligibility, application status, or official placement decisions. The backend eligibility result remains the source of truth.',
  };
}
