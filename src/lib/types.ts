
export type LikelihoodImpactLevel = 'Very Low' | 'Low' | 'Medium' | 'High' | 'Very High';
export const LIKELIHOOD_IMPACT_LEVELS: LikelihoodImpactLevel[] = ['Very Low', 'Low', 'Medium', 'High', 'Very High'];

export interface Goal {
  id: string;
  name: string;
  description: string;
  createdAt: string; // ISO date string
  uprId: string; // Unit Pemilik Risiko ID
  period: string; // e.g., "2024", "2025"
}

export interface Risk {
  id: string;
  goalId: string; // Will link to a Goal that has uprId and period
  description: string;
  likelihood: LikelihoodImpactLevel | null;
  impact: LikelihoodImpactLevel | null;
  identifiedAt: string; // ISO date string
  analysisCompletedAt?: string; // ISO date string
}

export interface Control {
  id:string;
  riskId: string; // Will link to a Risk, which links to a Goal with uprId and period
  description: string;
  effectiveness: 'Low' | 'Medium' | 'High' | null;
  status: 'Planned' | 'In Progress' | 'Implemented' | 'Ineffective';
  createdAt: string; // ISO date string
  updatedAt?: string; // ISO date string
}

// Example: Combined Risk Level (can be calculated)
export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';
