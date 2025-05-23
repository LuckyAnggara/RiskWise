
export type LikelihoodImpactLevel = 'Very Low' | 'Low' | 'Medium' | 'High' | 'Very High';
export const LIKELIHOOD_IMPACT_LEVELS: LikelihoodImpactLevel[] = ['Very Low', 'Low', 'Medium', 'High', 'Very High'];

export interface Goal {
  id: string;
  name: string;
  description: string;
  createdAt: string; // ISO date string
}

export interface Risk {
  id: string;
  goalId: string;
  description: string;
  likelihood: LikelihoodImpactLevel | null;
  impact: LikelihoodImpactLevel | null;
  identifiedAt: string; // ISO date string
  analysisCompletedAt?: string; // ISO date string
  // controls are managed separately or implicitly linked
}

export interface Control {
  id:string;
  riskId: string;
  description: string;
  effectiveness: 'Low' | 'Medium' | 'High' | null;
  status: 'Planned' | 'In Progress' | 'Implemented' | 'Ineffective';
  createdAt: string; // ISO date string
  updatedAt?: string; // ISO date string
}

// Example: Combined Risk Level (can be calculated)
export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';
