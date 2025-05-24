
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
  effectiveness: 'Low' | 'Medium' | 'High' | null; // Tetap Inggris untuk kemudahan internal jika perlu, atau bisa juga dilokalisasi
  status: 'Planned' | 'In Progress' | 'Implemented' | 'Ineffective'; // Sama, bisa dilokalisasi
  createdAt: string; // ISO date string
  updatedAt?: string; // ISO date string
}

// Example: Combined Risk Level (can be calculated)
export type RiskLevel = 'Sangat Rendah' | 'Rendah' | 'Sedang' | 'Tinggi' | 'Sangat Tinggi';

