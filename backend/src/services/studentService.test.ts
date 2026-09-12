import { describe, expect, it } from 'vitest';
import { getCompletion } from './studentService.js';

describe('student profile completion', () => {
  it('calculates completion from populated fields and resume state', () => {
    const result = getCompletion({ phone: '+911234567890', cgpa: 8.2, skills: ['typescript'] }, true);
    expect(result.completionPercentage).toBe(31);
    expect(result.completedSections).toContain('Phone number');
    expect(result.completedSections).toContain('Resume');
    expect(result.missingFields).toContain('University roll number');
  });

  it('does not count empty arrays or objects as completed', () => {
    const result = getCompletion({ skills: [], social: {} }, false);
    expect(result.completionPercentage).toBe(0);
    expect(result.missingFields).toContain('Skills');
    expect(result.missingFields).toContain('Social profiles');
    expect(result.missingFields).toContain('Resume');
  });
});
