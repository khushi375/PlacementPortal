export interface PlacementDrive { _id: string; role: string; location?: string; workMode: 'ONSITE' | 'REMOTE' | 'HYBRID'; applicationDeadline?: string; graduationYear?: number; requiredSkills?: string[]; company: { name: string; logoUrl?: string; industry?: string }; }
export interface EligibilityReason { rule: string; passed: boolean; message: string; }
export interface EligibilityResult { eligible: boolean; status: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'INCOMPLETE_PROFILE'; reasons: EligibilityReason[]; checkedAt: string; }
export interface StudentDrive { drive: PlacementDrive; eligibility: EligibilityResult; }
