export type EligibilityStatus = 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'INCOMPLETE_PROFILE';
export interface EligibilityReason { rule: string; passed: boolean; message: string; }
export interface EligibilityResult { eligible: boolean; status: EligibilityStatus; reasons: EligibilityReason[]; checkedAt: string; }
export interface EligibilityStudent { cgpa?: number; tenthPercentage?: number; twelfthPercentage?: number; backlogs?: number; activeBacklogs?: number; skills?: string[]; department?: unknown; course?: unknown; batch?: unknown; graduationYear?: number; }
export interface EligibilityRules { minimumCgpa?: number; departments?: unknown[]; courses?: unknown[]; batches?: unknown[]; graduationYears?: number[]; minimumTenthPercentage?: number; minimumTwelfthPercentage?: number; maximumTotalBacklogs?: number; maximumActiveBacklogs?: number; requiredSkills?: string[]; skillMatchMode?: 'ALL' | 'ANY'; }

const id = (value: unknown) => String(value && typeof value === 'object' && '_id' in value ? (value as { _id: unknown })._id : value ?? '');
const normalized = (value: string) => value.trim().toLowerCase();
export function toEligibilityStudent(input: Record<string, unknown>): EligibilityStudent {
  return { cgpa: typeof input.cgpa === 'number' ? input.cgpa : undefined, tenthPercentage: typeof input.tenthPercentage === 'number' ? input.tenthPercentage : undefined, twelfthPercentage: typeof input.twelfthPercentage === 'number' ? input.twelfthPercentage : undefined, backlogs: typeof input.backlogs === 'number' ? input.backlogs : undefined, activeBacklogs: typeof input.activeBacklogs === 'number' ? input.activeBacklogs : undefined, skills: Array.isArray(input.skills) ? input.skills.filter((skill): skill is string => typeof skill === 'string') : [], department: input.department ?? undefined, course: input.course ?? undefined, batch: input.batch ?? undefined, graduationYear: typeof input.graduationYear === 'number' ? input.graduationYear : undefined };
}
const checkValue = (value: number | undefined, label: string, required: number, format: (value: number) => string, comparator: (value: number) => boolean, reasons: EligibilityReason[]) => {
  if (value === undefined || value === null) { reasons.push({ rule: label, passed: false, message: `${label} is required to calculate eligibility` }); return false; }
  const passed = comparator(value); reasons.push({ rule: label, passed, message: passed ? `${format(value)} meets the required ${format(required)}` : `${format(value)} does not meet the required ${format(required)}` }); return passed;
};

export function evaluateEligibility(student: EligibilityStudent, rules: EligibilityRules): EligibilityResult {
  const reasons: EligibilityReason[] = [];
  if (rules.minimumCgpa !== undefined) checkValue(student.cgpa, 'CGPA', rules.minimumCgpa, (value) => value.toFixed(2), (value) => value >= rules.minimumCgpa!, reasons);
  if (rules.departments?.length) { const passed = student.department !== undefined && rules.departments.some((value) => id(value) === id(student.department)); reasons.push({ rule: 'Department', passed, message: passed ? 'Student department is eligible' : student.department === undefined ? 'Department is required to calculate eligibility' : 'Student department is not eligible' }); }
  if (rules.courses?.length) { const passed = student.course !== undefined && rules.courses.some((value) => id(value) === id(student.course)); reasons.push({ rule: 'Course', passed, message: passed ? 'Student course is eligible' : student.course === undefined ? 'Course is required to calculate eligibility' : 'Student course is not eligible' }); }
  if (rules.batches?.length) { const passed = student.batch !== undefined && rules.batches.some((value) => id(value) === id(student.batch)); reasons.push({ rule: 'Batch', passed, message: passed ? 'Student batch is eligible' : student.batch === undefined ? 'Batch is required to calculate eligibility' : 'Student batch is not eligible' }); }
  if (rules.graduationYears?.length) { const passed = student.graduationYear !== undefined && rules.graduationYears.includes(student.graduationYear); reasons.push({ rule: 'Graduation Year', passed, message: passed ? `Graduation year ${student.graduationYear} is eligible` : student.graduationYear === undefined ? 'Graduation year is required to calculate eligibility' : `Graduation year ${student.graduationYear} is not eligible` }); }
  if (rules.minimumTenthPercentage !== undefined) checkValue(student.tenthPercentage, '10th Percentage', rules.minimumTenthPercentage, (value) => `${value}%`, (value) => value >= rules.minimumTenthPercentage!, reasons);
  if (rules.minimumTwelfthPercentage !== undefined) checkValue(student.twelfthPercentage, '12th Percentage', rules.minimumTwelfthPercentage, (value) => `${value}%`, (value) => value >= rules.minimumTwelfthPercentage!, reasons);
  if (rules.maximumTotalBacklogs !== undefined) checkValue(student.backlogs, 'Total Backlogs', rules.maximumTotalBacklogs, String, (value) => value <= rules.maximumTotalBacklogs!, reasons);
  if (rules.maximumActiveBacklogs !== undefined) checkValue(student.activeBacklogs, 'Active Backlogs', rules.maximumActiveBacklogs, String, (value) => value <= rules.maximumActiveBacklogs!, reasons);
  if (rules.requiredSkills?.length) {
    const studentSkills = new Set((student.skills ?? []).map(normalized)); const required = rules.requiredSkills.map(normalized); const matched = required.filter((skill) => studentSkills.has(skill)); const passed = rules.skillMatchMode === 'ANY' ? matched.length > 0 : matched.length === required.length;
    reasons.push({ rule: 'Required Skills', passed, message: passed ? `Required skill matching (${rules.skillMatchMode ?? 'ALL'}) satisfied` : `Missing required skills: ${required.filter((skill) => !studentSkills.has(skill)).join(', ')}` });
  }
  const eligible = reasons.length > 0 && reasons.every((reason) => reason.passed); const incomplete = reasons.some((reason) => !reason.passed && /required to calculate/.test(reason.message));
  return { eligible, status: eligible ? 'ELIGIBLE' : incomplete ? 'INCOMPLETE_PROFILE' : 'NOT_ELIGIBLE', reasons, checkedAt: new Date().toISOString() };
}
