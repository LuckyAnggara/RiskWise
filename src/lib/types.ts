
export type LikelihoodImpactLevel = 'Sangat Rendah' | 'Rendah' | 'Sedang' | 'Tinggi' | 'Sangat Tinggi';
export const LIKELIHOOD_IMPACT_LEVELS: LikelihoodImpactLevel[] = ['Sangat Rendah', 'Rendah', 'Sedang', 'Tinggi', 'Sangat Tinggi'];

export const RISK_CATEGORIES = [
  'Kebijakan', 
  'Fraud', 
  'Keuangan', 
  'Operasional', 
  'Reputasi', 
  'Kepatuhan', 
  'Strategis', 
  'Bencana Alam', 
  'Teknologi Informasi', 
  'Sumber Daya Manusia',
  'Hukum',
  'Proyek',
  'Lainnya'
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
  code: string; // e.g., "A1", "B12"
}

export interface PotentialRisk {
  id: string;
  goalId: string; 
  description: string;
  category: RiskCategory | null;
  owner: string | null; 
  likelihood: LikelihoodImpactLevel | null; // Inherent likelihood
  impact: LikelihoodImpactLevel | null; // Inherent impact
  identifiedAt: string; // ISO date string
  analysisCompletedAt?: string; 
  sequenceNumber: number; 
}

export interface RiskCause {
  id: string;
  potentialRiskId: string; 
  description: string;
  source: RiskSource;
  keyRiskIndicator: string | null;
  riskTolerance: string | null;
  likelihood: LikelihoodImpactLevel | null; // Likelihood of the cause
  impact: LikelihoodImpactLevel | null; // Impact if the cause occurs
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

export type RiskLevel = 'Sangat Rendah' | 'Rendah' | 'Sedang' | 'Tinggi' | 'Sangat Tinggi' | 'N/A';
