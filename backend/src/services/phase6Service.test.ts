import { describe, expect, it } from 'vitest';
import { evaluateEligibility } from './eligibilityService.js';
import { AppError } from '../lib/errors.js';
import {
  assertProgressOwner,
  buildPreparationBrief,
  interviewTypeToResourceCategory,
  interviewsBelongingToStudent,
  isUpcomingInterview,
  missingSkillsFromEligibility,
  ownedProgressFilter,
  publishedResourceFilter,
  relevantCategoriesFromInterviews,
} from './phase6Service.js';

const rules = { minimumCgpa: 7.5, requiredSkills: ['react', 'typescript'], skillMatchMode: 'ALL' as const };
const student = { cgpa: 8.2, skills: ['React', 'TypeScript'] };

describe('preparation resource visibility', () => {
  it('returns only published resources to students', () => {
    expect(publishedResourceFilter()).toEqual({ isPublished: true });
    const catalog = [
      { title: 'Published coding set', isPublished: true },
      { title: 'Draft aptitude notes', isPublished: false },
    ];
    expect(catalog.filter((item) => item.isPublished === publishedResourceFilter().isPublished).map((item) => item.title)).toEqual(['Published coding set']);
  });
});

describe('student progress ownership', () => {
  it('binds progress writes to the authenticated student', () => {
    expect(ownedProgressFilter('student-a', 'resource-1')).toEqual({ student: 'student-a', resource: 'resource-1' });
    expect(ownedProgressFilter('student-a', 'resource-1').student).not.toBe('student-b');
  });
  it('rejects progress belonging to another student', () => {
    expect(() => assertProgressOwner('student-a', 'student-b')).toThrow(AppError);
    expect(() => assertProgressOwner('student-a', 'student-a')).not.toThrow();
  });
});

describe('student interview scoping', () => {
  it('returns only interviews tied to the student applications', () => {
    const scoped = interviewsBelongingToStudent([
      { _id: 'own', application: 'app-1' },
      { _id: 'other', application: 'app-9' },
      { _id: 'populated', application: { _id: 'app-2' } },
    ], ['app-1', 'app-2']);
    expect(scoped.map((item) => item._id)).toEqual(['own', 'populated']);
  });
});

describe('interview-relevant preparation', () => {
  it('maps interview round types to resource categories deterministically', () => {
    expect(interviewTypeToResourceCategory('APTITUDE')).toBe('APTITUDE');
    expect(interviewTypeToResourceCategory('CODING')).toBe('CODING');
    expect(interviewTypeToResourceCategory('TECHNICAL')).toBe('TECHNICAL');
    expect(interviewTypeToResourceCategory('GD')).toBe('GD');
    expect(interviewTypeToResourceCategory('GROUP_DISCUSSION')).toBe('GD');
    expect(interviewTypeToResourceCategory('HR')).toBe('HR');
  });
  it('marks resources from upcoming interview types only', () => {
    const now = new Date('2026-09-12T10:00:00.000Z');
    const categories = relevantCategoriesFromInterviews([
      { type: 'CODING', status: 'SCHEDULED', date: '2026-09-20T10:00:00.000Z' },
      { type: 'HR', status: 'COMPLETED', date: '2026-09-20T10:00:00.000Z' },
      { type: 'APTITUDE', status: 'SCHEDULED', date: '2026-09-01T10:00:00.000Z' },
    ], now);
    expect(categories).toEqual(['CODING']);
    expect(isUpcomingInterview({ status: 'CANCELLED', date: '2026-09-20T10:00:00.000Z' }, now)).toBe(false);
  });
});

describe('deterministic preparation brief', () => {
  it('reuses the existing eligibility evaluation without changing it', () => {
    const eligibility = evaluateEligibility(student, rules);
    const brief = buildPreparationBrief({ drive: { _id: 'drive-1', role: 'SDE', requiredSkills: rules.requiredSkills, rounds: [{ name: 'Coding', type: 'CODING', order: 1 }] }, eligibility, interviews: [] });
    expect(brief.eligibility).toEqual(eligibility);
    expect(brief.eligibility.status).toBe('ELIGIBLE');
    expect(brief.missingSkills).toEqual([]);
    expect(brief.drive.requiredSkills).toEqual(['react', 'typescript']);
    expect(brief.drive.roundTypes[0]?.type).toBe('CODING');
  });
  it('surfaces missing skills from the eligibility engine result', () => {
    const eligibility = evaluateEligibility({ ...student, skills: ['sql'] }, rules);
    expect(missingSkillsFromEligibility(eligibility)).toEqual(['react', 'typescript']);
    const brief = buildPreparationBrief({
      drive: { _id: 'drive-2', requiredSkills: rules.requiredSkills, rounds: [{ type: 'HR' }] },
      eligibility,
      interviews: [{ _id: 'int-1', type: 'HR', status: 'SCHEDULED', date: '2026-09-18T09:00:00.000Z', mode: 'ONLINE', selectionRoundName: 'HR round' }],
    });
    expect(brief.eligibility.status).toBe('NOT_ELIGIBLE');
    expect(brief.missingSkills).toEqual(['react', 'typescript']);
    expect(brief.interviews).toHaveLength(1);
    expect(brief.interviews[0]?.mode).toBe('ONLINE');
  });
});
