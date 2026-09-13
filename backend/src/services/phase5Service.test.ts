import { describe, expect, it } from 'vitest';
import { communicationAudience } from './phase5Service.js';

describe('communication audience rules', () => {
  it('accepts exactly one audience mode', () => {
    expect(communicationAudience({ title: 'Notice', message: 'Body', allStudents: true })).toBe('ALL_STUDENTS');
    expect(communicationAudience({ title: 'Notice', message: 'Body', studentIds: ['abc'] })).toBe('SELECTED_STUDENTS');
    expect(communicationAudience({ title: 'Notice', message: 'Body', driveId: 'drive' })).toBe('DRIVE_APPLICANTS');
  });
  it('rejects missing or mixed audiences', () => {
    expect(() => communicationAudience({ title: 'Notice', message: 'Body' })).toThrow();
    expect(() => communicationAudience({ title: 'Notice', message: 'Body', allStudents: true, driveId: 'drive' })).toThrow();
  });
});
