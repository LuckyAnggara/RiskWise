
export const LIKELIHOOD_LEVELS_DESC_MAP = {
  "Hampir tidak terjadi (1)": 1,
  "Jarang terjadi (2)": 2,
  "Kadang Terjadi (3)": 3,
  "Sering terjadi (4)": 4,
  "Hampir pasti terjadi (5)": 5,
} as const;
export type LikelihoodLevelDesc = keyof typeof LIKELIHOOD_LEVELS_DESC_MAP;
export const LIKELIHOOD_LEVELS_DESC = Object.keys(LIKELIHOOD_LEVELS_DESC_MAP) as LikelihoodLevelDesc[];


export const IMPACT_LEVELS_DESC_MAP = {
  "Tidak Signifikan (1)": 1,
  "Minor (2)": 2,
  "Moderat (3)": 3,
  "Signifikan (4)": 4,
  "Sangat Signifikan (5)": 5,
} as const;
export type ImpactLevelDesc = keyof typeof IMPACT_LEVELS_DESC_MAP;
export const IMPACT_LEVELS_DESC = Object.keys(IMPACT_LEVELS_DESC_MAP) as ImpactLevelDesc[];


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
  period: string; 
  userId: string; 
}

export interface PotentialRisk {
  id: string; 
  goalId: string;
  period: string;
  userId: string;
  description: string;
  category: RiskCategory | null;
  owner: string | null; 
  identifiedAt: string; 
  sequenceNumber: number; 
  updatedAt?: string;
}

export interface RiskCause {
  id: string; 
  potentialRiskId: string; 
  goalId: string; 
  period: string;
  userId: string;
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
  potentialRiskId: string; 
  goalId: string; 
  period: string;
  userId: string;
  controlType: ControlMeasureTypeKey;
  sequenceNumber: number; 
  description: string;
  keyControlIndicator: string | null;
  target: string | null;
  responsiblePerson: string | null;
  deadline: string | null; 
  budget: number | null;
  createdAt: string;
  updatedAt?: string;
}


export type UserRole = 'admin' | 'userSatker';

export interface AppUser {
  uid: string; // Firebase Auth UID
  email: string | null;
  displayName: string | null; // This will serve as the "UPR Name"
  photoURL: string | null;
  role: UserRole;
  activePeriod: string | null;
  availablePeriods: string[] | null;
  createdAt: string;
  updatedAt?: string;
  // uprId field is removed as per new model: 1 user = 1 UPR, UPR name is displayName
}

export const getControlTypeName = (typeKey: ControlMeasureTypeKey): string => {
  return CONTROL_MEASURE_TYPES[typeKey];
};
