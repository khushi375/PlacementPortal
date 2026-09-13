const statusTransitions: Record<string, string[]> = { APPLIED: ['UNDER_REVIEW', 'WITHDRAWN'], UNDER_REVIEW: ['SHORTLISTED', 'REJECTED', 'WAITLISTED'], SHORTLISTED: ['SELECTED', 'REJECTED', 'WAITLISTED'], WAITLISTED: ['SHORTLISTED', 'REJECTED', 'SELECTED'], SELECTED: [], REJECTED: [], WITHDRAWN: [], PLACED: [] };
export function isValidApplicationTransition(from: string, to: string) { return statusTransitions[from]?.includes(to) === true; }
export function allowedApplicationTransitions(from: string) { return [...(statusTransitions[from] ?? [])]; }
