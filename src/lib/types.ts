
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

export type CalculatedRiskLevelCategory = 'Sangat Rendah' | 'Rendah' | 'Sedang' | 'Tinggi' | 'Sangat Tinggi';
export type RiskLevelDisplay = CalculatedRiskLevelCategory | 'N/A';

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

export const CONTROL_MEASURE_TYPES = {
  'Prv': 'Preventif',
  'RM': 'Mitigasi Risiko',
  'Crr': 'Korektif'
} as const;
export type ControlMeasureTypeKey = keyof typeof CONTROL_MEASURE_TYPES;
export const CONTROL_MEASURE_TYPE_KEYS = Object.keys(CONTROL_MEASURE_TYPES) as ControlMeasureTypeKey[];


export interface Goal {
  id: string;
  name: string;
  description: string;
  code: string; 
  createdAt: string; 
  uprId: string; 
  period: string; 
}

export interface PotentialRisk {
  id: string;
  goalId: string; 
  description: string;
  category: RiskCategory | null;
  owner: string | null; 
  identifiedAt: string; 
  sequenceNumber: number; 
}

export interface RiskCause {
  id: string;
  potentialRiskId: string; 
  description: string;
  source: RiskSource;
  keyRiskIndicator: string | null;
  riskTolerance: string | null;
  likelihood: LikelihoodLevelDesc | null;
  impact: ImpactLevelDesc | null;        
  createdAt: string; 
  analysisUpdatedAt?: string; 
  sequenceNumber: number; 
}

export interface ControlMeasure {
  id: string;
  riskCauseId: string;
  potentialRiskId: string; // For context and easier data retrieval/deletion
  goalId: string; // For context
  uprId: string;
  period: string;
  controlType: ControlMeasureTypeKey;
  sequenceNumber: number; // Sequence per type, per riskCause
  description: string;
  keyControlIndicator: string | null;
  target: string | null;
  responsiblePerson: string | null;
  deadline: string | null; // Consider using Date object or ISO string, for now string
  budget: number | null;
  createdAt: string;
  updatedAt?: string;
}

// Helper to get display name for control type
export const getControlTypeName = (typeKey: ControlMeasureTypeKey): string => {
  return CONTROL_MEASURE_TYPES[typeKey];
};
