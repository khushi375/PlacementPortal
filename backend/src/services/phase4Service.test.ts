import { describe, expect, it } from 'vitest';
import { allowedApplicationTransitions, isValidApplicationTransition } from './applicationWorkflow.js';

describe('application lifecycle transitions', () => {
  it('allows review and shortlist progression', () => {
    expect(isValidApplicationTransition('APPLIED', 'UNDER_REVIEW')).toBe(true);
    expect(isValidApplicationTransition('UNDER_REVIEW', 'SHORTLISTED')).toBe(true);
  });
  it('rejects arbitrary backward transitions', () => {
    expect(isValidApplicationTransition('REJECTED', 'SHORTLISTED')).toBe(false);
    expect(isValidApplicationTransition('CLOSED', 'APPLIED')).toBe(false);
  });
  it('allows withdrawal only before terminal review outcomes', () => {
    expect(isValidApplicationTransition('APPLIED', 'WITHDRAWN')).toBe(true);
    expect(isValidApplicationTransition('SELECTED', 'WITHDRAWN')).toBe(false);
  });
  it('exposes only backend-defined next statuses', () => {
    expect(allowedApplicationTransitions('APPLIED')).toEqual(['UNDER_REVIEW', 'WITHDRAWN']);
    expect(allowedApplicationTransitions('SELECTED')).toEqual([]);
  });
});

