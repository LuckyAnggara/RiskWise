
// src/lib/types.ts

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

export const MONITORING_PERIOD_FREQUENCIES = ['Bulanan', 'Triwulanan', 'Semesteran', 'Tahunan'] as const;
export type MonitoringPeriodFrequency = typeof MONITORING_PERIOD_FREQUENCIES[number];

export interface MonitoringSettings {
  defaultFrequency: MonitoringPeriodFrequency | null;
}

export interface Goal {
  id: string;
  name: string;
  description: string;
  code: string; // e.g., "A1", "B2"
  userId: string;
  period: string;
  createdAt: string; // ISO string
  updatedAt?: string; // ISO string
}

export interface PotentialRisk {
  id: string;
  goalId: string;
  userId: string;
  period: string;
  sequenceNumber: number; // Nomor urut untuk PR di dalam Goal, e.g., 1, 2, 3
  description: string;
  category: RiskCategory | null;
  owner: string | null;
  identifiedAt: string; // ISO string
  updatedAt?: string; // ISO string
}

export interface RiskCause {
  id: string;
  potentialRiskId: string;
  goalId: string; // Denormalized for easier querying/context
  userId: string;
  period: string;
  sequenceNumber: number; // Nomor urut untuk RC di dalam PotentialRisk, e.g., 1, 2, 3
  description: string;
  source: RiskSource;
  keyRiskIndicator: string | null;
  riskTolerance: string | null;
  likelihood: LikelihoodLevelDesc | null;
  impact: ImpactLevelDesc | null;
  createdAt: string; // ISO string
  analysisUpdatedAt?: string; // ISO string
}

export interface ControlMeasure {
  id: string;
  riskCauseId: string;
  potentialRiskId: string; // Denormalized
  goalId: string; // Denormalized
  userId: string;
  period: string;
  controlType: ControlMeasureTypeKey;
  sequenceNumber: number; // Nomor urut untuk CM di dalam RiskCause berdasarkan type
  description: string;
  keyControlIndicator: string | null;
  target: string | null;
  responsiblePerson: string | null;
  deadline: string | null; // ISO string date
  budget: number | null;
  createdAt: string; // ISO string
  updatedAt?: string; // ISO string
}

export type UserRole = 'admin' | 'userSatker';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null; // Ini juga akan menjadi Nama UPR
  photoURL: string | null;
  role: UserRole;
  uprId: string | null; // Akan selalu sama dengan displayName
  activePeriod: string | null;
  availablePeriods: string[] | null;
  riskAppetite: number | null; // Selera Risiko, default 5
  monitoringSettings?: MonitoringSettings | null;
  createdAt: string; // ISO string
  updatedAt?: string; // ISO string
}

export interface MonitoringSession {
  id: string;
  userId: string;
  period: string; 
  name: string; 
  startDate: string; // ISO string date
  endDate: string;   // ISO string date
  status: 'Aktif' | 'Selesai' | 'Dibatalkan';
  createdAt: string; // ISO string date
  updatedAt?: string; // ISO string date
}

export interface MonitoredControlMeasureData {
  controlMeasureId: string;
  realizationKci: string | number | null; 
  performancePercentage?: number | null; 
  supportingEvidenceUrl?: string | null;
  monitoringResultNotes?: string;
  followUpPlan?: string;
}

export interface RiskExposure {
  id: string; 
  monitoringSessionId: string;
  riskCauseId: string; 
  potentialRiskId: string; 
  goalId: string; 
  userId: string;
  period: string; 
  exposureValue: number | null; 
  exposureUnit: string | null; 
  exposureNotes?: string | null;
  recordedAt: string; // ISO string date
  monitoredControls?: MonitoredControlMeasureData[]; 
  updatedAt?: string; // ISO string date
}


export const getControlTypeName = (typeKey: ControlMeasureTypeKey): string => {
  return CONTROL_MEASURE_TYPES[typeKey];
};
