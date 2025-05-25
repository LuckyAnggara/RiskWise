
export const LIKELIHOOD_LEVELS_MAP = {
  "Hampir tidak terjadi": 1,
  "Jarang terjadi": 2,
  "Kadang terjadi": 3,
  "Sering terjadi": 4,
  "Hampir pasti terjadi": 5,
} as const;
export type LikelihoodLevelDesc = keyof typeof LIKELIHOOD_LEVELS_MAP;
export const LIKELIHOOD_LEVELS_DESC: LikelihoodLevelDesc[] = Object.keys(LIKELIHOOD_LEVELS_MAP) as LikelihoodLevelDesc[];

export const IMPACT_LEVELS_MAP = {
  "Tidak Signifikan": 1,
  "Minor": 2,
  "Moderat": 3,
  "Signifikan": 4,
  "Sangat Signifikan": 5,
} as const;
export type ImpactLevelDesc = keyof typeof IMPACT_LEVELS_MAP;
export const IMPACT_LEVELS_DESC: ImpactLevelDesc[] = Object.keys(IMPACT_LEVELS_MAP) as ImpactLevelDesc[];

// This type is for the calculated risk level category, not for individual selection.
export type CalculatedRiskLevelCategory = 'Sangat Rendah' | 'Rendah' | 'Sedang' | 'Tinggi' | 'Sangat Tinggi';

export const RISK_CATEGORIES = [
  'Kebijakan', 
  'Hukum', 
  'Reputasi', 
  'Kepatuhan', 
  'Keuangan', 
  'Fraud', 
  'Operasional'
] as const;
export type RiskCategory = typeof RISK_CATEGORIES[number];

export const RISK_SOURCES = ['Internal', 'Eksternal'] as const;
export type RiskSource = typeof RISK_SOURCES[number];

export interface Goal {
  id: string;
  name: string;
  description: string;
  createdAt: string; // ISO date string
  uprId: string; 
  period: string; 
  code: string; 
}

export interface PotentialRisk {
  id: string;
  goalId: string; 
  description: string;
  category: RiskCategory | null;
  owner: string | null; 
  identifiedAt: string; // ISO date string
  sequenceNumber: number; 
}

export interface RiskCause {
  id: string;
  potentialRiskId: string; 
  description: string;
  source: RiskSource;
  keyRiskIndicator: string | null;
  riskTolerance: string | null;
  likelihood: LikelihoodLevelDesc | null; // Updated type
  impact: ImpactLevelDesc | null;         // Updated type
  createdAt: string; // ISO date string
  analysisUpdatedAt?: string; 
  sequenceNumber: number; 
}

export interface Control {
  id:string;
  potentialRiskId: string; 
  description: string;
  effectiveness: 'Low' | 'Medium' | 'High' | null;
  status: 'Planned' | 'In Progress' | 'Implemented' | 'Ineffective';
  createdAt: string; // ISO date string
  updatedAt?: string; // ISO date string
}

export type RiskLevelDisplay = CalculatedRiskLevelCategory | 'N/A'; // For display in badges, etc.
