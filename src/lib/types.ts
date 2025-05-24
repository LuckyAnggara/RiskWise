
export type LikelihoodImpactLevel = 'Very Low' | 'Low' | 'Medium' | 'High' | 'Very High';
export const LIKELIHOOD_IMPACT_LEVELS: LikelihoodImpactLevel[] = ['Very Low', 'Low', 'Medium', 'High', 'Very High'];

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
  uprId: string; // Unit Pemilik Risiko ID
  period: string; // e.g., "2024", "2025"
}

export interface PotentialRisk {
  id: string;
  goalId: string; // Will link to a Goal that has uprId and period
  description: string;
  category: RiskCategory | null;
  owner: string | null; // Nama atau jabatan pemilik risiko
  likelihood: LikelihoodImpactLevel | null;
  impact: LikelihoodImpactLevel | null;
  identifiedAt: string; // ISO date string
  analysisCompletedAt?: string; // ISO date string
}

export interface RiskCause {
  id: string;
  potentialRiskId: string; // Links to PotentialRisk
  description: string;
  source: RiskSource;
  createdAt: string; // ISO date string
}

export interface Control {
  id:string;
  potentialRiskId: string; // Links to PotentialRisk
  description: string;
  effectiveness: 'Low' | 'Medium' | 'High' | null;
  status: 'Planned' | 'In Progress' | 'Implemented' | 'Ineffective';
  createdAt: string; // ISO date string
  updatedAt?: string; // ISO date string
}

// Example: Combined Risk Level (can be calculated)
export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';
