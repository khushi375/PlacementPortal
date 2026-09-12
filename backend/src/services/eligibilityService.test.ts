import { describe, expect, it } from 'vitest';
import { evaluateEligibility } from './eligibilityService.js';

const rules = { minimumCgpa: 7.5, departments: ['cse'], courses: ['btech'], batches: ['2027'], graduationYears: [2027], minimumTenthPercentage: 60, minimumTwelfthPercentage: 60, maximumTotalBacklogs: 2, maximumActiveBacklogs: 0, requiredSkills: ['react', 'typescript'], skillMatchMode: 'ALL' as const };
const student = { cgpa: 8.2, department: 'cse', course: 'btech', batch: '2027', graduationYear: 2027, tenthPercentage: 80, twelfthPercentage: 75, backlogs: 0, activeBacklogs: 0, skills: ['React', 'TypeScript'] };

describe('deterministic eligibility engine', () => {
  it('passes every rule with AND behavior', () => expect(evaluateEligibility(student, rules).status).toBe('ELIGIBLE'));
  it('explains a CGPA failure', () => { const result = evaluateEligibility({ ...student, cgpa: 6.9 }, rules); expect(result.status).toBe('NOT_ELIGIBLE'); expect(result.reasons.find((reason) => reason.rule === 'CGPA')?.passed).toBe(false); });
  it('returns incomplete profile for missing required data', () => { const result = evaluateEligibility({ ...student, twelfthPercentage: undefined }, rules); expect(result.status).toBe('INCOMPLETE_PROFILE'); expect(result.reasons.find((reason) => reason.rule === '12th Percentage')?.passed).toBe(false); });
  it('supports ANY skill matching deterministically', () => { const result = evaluateEligibility({ ...student, skills: ['react'] }, { requiredSkills: ['react', 'node'], skillMatchMode: 'ANY' }); expect(result.status).toBe('ELIGIBLE'); });
  it('returns multiple failures instead of short circuiting', () => { const result = evaluateEligibility({ ...student, cgpa: 5, activeBacklogs: 2, skills: [] }, rules); expect(result.reasons.filter((reason) => !reason.passed).length).toBeGreaterThanOrEqual(3); });
});
