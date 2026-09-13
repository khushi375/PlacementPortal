import { Schema, model, type InferSchemaType } from 'mongoose';

const timestamps = true;
const objectId = Schema.Types.ObjectId;

export const userRoles = ['STUDENT', 'PLACEMENT_OFFICER', 'PLACEMENT_STAFF', 'SUPER_ADMIN'] as const;
export type UserRole = (typeof userRoles)[number];

const userSchema = new Schema({
  firebaseUid: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, lowercase: true, trim: true, unique: true, index: true },
  displayName: { type: String, required: true, trim: true },
  role: { type: String, enum: userRoles, required: true, default: 'STUDENT', index: true },
  emailVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps });

const studentProfileSchema = new Schema({
  user: { type: objectId, ref: 'User', required: true, unique: true, index: true },
  phone: String, profilePhotoUrl: String, dateOfBirth: Date, address: { line1: String, city: String, state: String, postalCode: String },
  rollNumber: { type: String, unique: true, sparse: true, index: true },
  course: { type: objectId, ref: 'Course', index: true }, department: { type: objectId, ref: 'Department', index: true },
  batch: { type: objectId, ref: 'Batch', index: true }, graduationYear: { type: Number, index: true }, cgpa: { type: Number, min: 0, max: 10 },
  tenthPercentage: { type: Number, min: 0, max: 100 }, twelfthPercentage: { type: Number, min: 0, max: 100 },
  backlogs: { type: Number, min: 0, default: 0 }, activeBacklogs: { type: Number, min: 0, default: 0 }, academicGaps: Number,
  skills: [{ type: String, trim: true, lowercase: true }], projects: [{ name: String, description: String, url: String }],
  certifications: [{ name: String, issuer: String, issuedOn: Date, url: String }], internships: [{ organization: String, role: String, startDate: Date, endDate: Date, description: String }],
  achievements: [{ title: String, description: String, achievedOn: Date }], social: { github: String, linkedin: String, portfolio: String },
  verificationStatus: { type: String, enum: ['UNVERIFIED', 'PENDING', 'VERIFIED', 'REQUIRES_UPDATE'], default: 'UNVERIFIED', index: true },
  verifiedAt: Date, verifiedBy: { type: objectId, ref: 'User' },
}, { timestamps });
studentProfileSchema.index({ department: 1, batch: 1, cgpa: -1 });

const academicRecordSchema = new Schema({ student: { type: objectId, ref: 'StudentProfile', required: true, index: true }, semester: { type: Number, required: true }, sgpa: { type: Number, min: 0, max: 10, required: true }, credits: Number }, { timestamps });
academicRecordSchema.index({ student: 1, semester: 1 }, { unique: true });
const departmentSchema = new Schema({ name: { type: String, required: true, unique: true, trim: true }, code: { type: String, required: true, unique: true, uppercase: true } }, { timestamps });
const courseSchema = new Schema({ name: { type: String, required: true, unique: true, trim: true }, code: { type: String, required: true, unique: true, uppercase: true }, department: { type: objectId, ref: 'Department', required: true, index: true } }, { timestamps });
const batchSchema = new Schema({ year: { type: Number, required: true, unique: true, index: true }, graduationYear: { type: Number, required: true, index: true }, isActive: { type: Boolean, default: true } }, { timestamps });

const companySchema = new Schema({ name: { type: String, required: true, trim: true, index: true }, normalizedName: { type: String, required: true, unique: true, index: true }, logoUrl: String, industry: String, website: String, description: String, locations: [String], contact: { name: String, email: String, phone: String }, status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'ARCHIVED'], default: 'ACTIVE', index: true }, archivedAt: Date }, { timestamps });
const roundSchema = new Schema({ name: { type: String, required: true, trim: true, maxlength: 100 }, type: { type: String, enum: ['APTITUDE', 'CODING', 'TECHNICAL', 'GROUP_DISCUSSION', 'HR', 'FINAL_INTERVIEW', 'CUSTOM'], required: true }, order: { type: Number, required: true, min: 1 }, durationMinutes: { type: Number, min: 1 }, instructions: String }, { _id: false });
const placementDriveSchema = new Schema({ company: { type: objectId, ref: 'Company', required: true, index: true }, role: { type: String, required: true, trim: true }, jobDescription: String, location: String, workMode: { type: String, enum: ['ONSITE', 'HYBRID', 'REMOTE'], required: true }, salary: { min: { type: Number, min: 0 }, max: { type: Number, min: 0 }, currency: { type: String, default: 'INR' }, period: { type: String, enum: ['YEARLY', 'MONTHLY', 'HOURLY'], default: 'YEARLY' } }, ctc: { type: Number, min: 0 }, batch: { type: objectId, ref: 'Batch', index: true }, graduationYear: { type: Number, index: true }, eligibleCourses: [{ type: objectId, ref: 'Course', index: true }], eligibleDepartments: [{ type: objectId, ref: 'Department', index: true }], minimumCgpa: { type: Number, min: 0, max: 10 }, minimumTenth: { type: Number, min: 0, max: 100 }, minimumTwelfth: { type: Number, min: 0, max: 100 }, allowActiveBacklogs: Boolean, maximumTotalBacklogs: { type: Number, min: 0 }, maximumActiveBacklogs: { type: Number, min: 0 }, requiredSkills: [{ type: String, trim: true, lowercase: true }], skillMatchMode: { type: String, enum: ['ALL', 'ANY'], default: 'ALL' }, applicationDeadline: { type: Date, index: true }, status: { type: String, enum: ['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED'], default: 'DRAFT', index: true }, rounds: [roundSchema], selectionProcess: [String], numberOfRounds: Number, instructions: String, requiredDocuments: [String] }, { timestamps });
placementDriveSchema.index({ status: 1, applicationDeadline: 1 });
const eligibilityRuleSchema = new Schema({ drive: { type: objectId, ref: 'PlacementDrive', required: true, unique: true }, minimumCgpa: { type: Number, min: 0, max: 10 }, departments: [{ type: objectId, ref: 'Department' }], courses: [{ type: objectId, ref: 'Course' }], batches: [{ type: objectId, ref: 'Batch' }], graduationYears: [Number], minimumTenthPercentage: { type: Number, min: 0, max: 100 }, minimumTwelfthPercentage: { type: Number, min: 0, max: 100 }, maximumTotalBacklogs: { type: Number, min: 0 }, maximumActiveBacklogs: { type: Number, min: 0 }, requiredSkills: [{ type: String, trim: true, lowercase: true }], skillMatchMode: { type: String, enum: ['ALL', 'ANY'], default: 'ALL' }, version: { type: Number, default: 1 } }, { timestamps });

const applicationSchema = new Schema({ student: { type: objectId, ref: 'StudentProfile', required: true, index: true }, drive: { type: objectId, ref: 'PlacementDrive', required: true, index: true }, resume: { type: objectId, ref: 'Resume' }, currentStage: { type: String, enum: ['APPLIED', 'UNDER_REVIEW', 'SHORTLISTED', 'APTITUDE', 'CODING', 'TECHNICAL', 'GD', 'HR', 'SELECTED', 'REJECTED', 'WITHDRAWN', 'WAITLISTED', 'PLACED'], default: 'APPLIED', index: true }, notes: String, rejectionReason: String, appliedAt: { type: Date, default: Date.now }, reviewedAt: Date, shortlistedAt: Date, withdrawnAt: Date }, { timestamps });
applicationSchema.index({ student: 1, drive: 1 }, { unique: true });
const applicationStageSchema = new Schema({ application: { type: objectId, ref: 'Application', required: true, index: true }, stage: { type: String, required: true }, changedBy: { type: objectId, ref: 'User', required: true }, note: String, enteredAt: { type: Date, default: Date.now }, exitedAt: Date }, { timestamps });
const interviewSchema = new Schema({ drive: { type: objectId, ref: 'PlacementDrive', required: true, index: true }, application: { type: objectId, ref: 'Application', index: true }, selectionRoundOrder: Number, selectionRoundName: String, type: { type: String, required: true }, date: { type: Date, required: true, index: true }, startTime: Date, endTime: Date, mode: { type: String, enum: ['ONSITE', 'OFFLINE', 'ONLINE', 'HYBRID'], required: true }, venueOrLink: String, instructions: String, status: { type: String, enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED'], default: 'SCHEDULED', index: true }, notes: String }, { timestamps });
const attendanceSchema = new Schema({ interview: { type: objectId, ref: 'Interview', required: true, index: true }, application: { type: objectId, ref: 'Application', index: true }, student: { type: objectId, ref: 'StudentProfile', required: true, index: true }, status: { type: String, enum: ['PRESENT', 'ABSENT', 'EXCUSED', 'NOT_MARKED'], default: 'NOT_MARKED', required: true }, remarks: String, markedBy: { type: objectId, ref: 'User', required: true }, markedAt: { type: Date, default: Date.now } }, { timestamps });
attendanceSchema.index({ interview: 1, student: 1 }, { unique: true });
const documentSchema = new Schema({ owner: { type: objectId, ref: 'User', required: true, index: true }, student: { type: objectId, ref: 'StudentProfile', required: true, index: true }, type: { type: String, required: true, index: true }, storageKey: { type: String, required: true, unique: true }, secureUrl: String, originalName: String, mimeType: String, sizeBytes: Number, status: { type: String, enum: ['PENDING', 'VERIFIED', 'REJECTED', 'REUPLOAD_REQUIRED'], default: 'PENDING', index: true }, reviewedBy: { type: objectId, ref: 'User' }, reviewedAt: Date, reviewComment: String }, { timestamps });
const notificationSchema = new Schema({ recipient: { type: objectId, ref: 'User', required: true, index: true }, type: { type: String, required: true }, title: { type: String, required: true }, message: { type: String, required: true }, readAt: Date, metadata: Schema.Types.Mixed }, { timestamps });
notificationSchema.index({ recipient: 1, readAt: 1, createdAt: -1 });
const grievanceSchema = new Schema({ student: { type: objectId, ref: 'StudentProfile', required: true, index: true }, category: String, subject: String, description: String, priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' }, status: { type: String, enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'], default: 'OPEN', index: true } }, { timestamps });
const placementResultSchema = new Schema({ student: { type: objectId, ref: 'StudentProfile', required: true, index: true }, application: { type: objectId, ref: 'Application', required: true, unique: true }, drive: { type: objectId, ref: 'PlacementDrive', required: true, index: true }, company: { type: objectId, ref: 'Company', required: true, index: true }, status: { type: String, enum: ['SELECTED', 'NOT_SELECTED', 'WAITLISTED'], required: true, index: true }, announcedAt: { type: Date, default: Date.now }, packageCtc: Number, joiningDate: Date, notes: String, recordedBy: { type: objectId, ref: 'User', required: true } }, { timestamps });
const auditLogSchema = new Schema({ actorId: { type: objectId, ref: 'User', index: true }, action: { type: String, required: true, index: true }, entityType: { type: String, required: true }, entityId: String, metadata: Schema.Types.Mixed, ipAddress: String }, { timestamps });
auditLogSchema.index({ createdAt: -1, action: 1 });
export const preparationCategories = ['APTITUDE', 'CODING', 'TECHNICAL', 'HR', 'GD', 'RESUME', 'GENERAL'] as const;
const preparationResourceSchema = new Schema({ title: { type: String, required: true, trim: true, maxlength: 160 }, category: { type: String, enum: preparationCategories, required: true, index: true }, url: { type: String, trim: true }, description: { type: String, trim: true, maxlength: 3000 }, isPublished: { type: Boolean, default: false, index: true } }, { timestamps });
const preparationProgressSchema = new Schema({ student: { type: objectId, ref: 'StudentProfile', required: true, index: true }, resource: { type: objectId, ref: 'PreparationResource', required: true, index: true }, completedAt: { type: Date, default: Date.now } }, { timestamps });
preparationProgressSchema.index({ student: 1, resource: 1 }, { unique: true });
const resumeSchema = new Schema({ student: { type: objectId, ref: 'StudentProfile', required: true, index: true }, filename: { type: String, required: true }, storageKey: { type: String, required: true, unique: true }, secureUrl: String, uploadedAt: { type: Date, default: Date.now }, isPrimary: { type: Boolean, default: false, index: true }, status: { type: String, enum: ['ACTIVE', 'ARCHIVED'], default: 'ACTIVE', index: true }, mimeType: String, sizeBytes: Number }, { timestamps });
resumeSchema.index({ student: 1, isPrimary: 1 });

export const User = model('User', userSchema);
export const StudentProfile = model('StudentProfile', studentProfileSchema);
export const AcademicRecord = model('AcademicRecord', academicRecordSchema);
export const Department = model('Department', departmentSchema);
export const Course = model('Course', courseSchema);
export const Batch = model('Batch', batchSchema);
export const Company = model('Company', companySchema);
export const PlacementDrive = model('PlacementDrive', placementDriveSchema);
export const EligibilityRule = model('EligibilityRule', eligibilityRuleSchema);
export const Application = model('Application', applicationSchema);
export const ApplicationStage = model('ApplicationStage', applicationStageSchema);
export const Interview = model('Interview', interviewSchema);
export const Attendance = model('Attendance', attendanceSchema);
export const Document = model('Document', documentSchema);
export const Notification = model('Notification', notificationSchema);
export const Grievance = model('Grievance', grievanceSchema);
export const PlacementResult = model('PlacementResult', placementResultSchema);
export const AuditLog = model('AuditLog', auditLogSchema);
export const PreparationResource = model('PreparationResource', preparationResourceSchema);
export const PreparationProgress = model('PreparationProgress', preparationProgressSchema);
export const Resume = model('Resume', resumeSchema);
export type UserDocument = InferSchemaType<typeof userSchema>;
