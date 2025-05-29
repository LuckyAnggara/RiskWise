
// src/lib/types.ts

export const LIKELIHOOD_LEVELS_DESC_MAP = {
  "Hampir tidak terjadi (1)": 1,
  "Jarang terjadi (2)": 2,
  "Kadang Terjadi (3)": 3, // Pastikan konsisten dengan input pengguna jika ada case sensitivity
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
  code: string; 
  userId: string;
  period: string;
  createdAt: string; 
  updatedAt?: string; 
}

export interface PotentialRisk {
  id: string;
  goalId: string;
  userId: string;
  period: string;
  sequenceNumber: number; 
  description: string;
  category: RiskCategory | null;
  owner: string | null;
  identifiedAt: string; 
  updatedAt?: string; 
}

export interface RiskCause {
  id: string;
  potentialRiskId: string;
  goalId: string; 
  userId: string;
  period: string;
  sequenceNumber: number; 
  description: string;
  source: RiskSource;
  keyRiskIndicator: string | null;
  riskTolerance: string | null;
  likelihood: LikelihoodLevelDesc | null;
  impact: ImpactLevelDesc | null;
  createdAt: string; 
  analysisUpdatedAt?: string; 
}

export interface ControlMeasure {
  id: string;
  riskCauseId: string;
  potentialRiskId: string; 
  goalId: string; 
  userId: string;
  period: string;
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
  uid: string;
  email: string | null;
  displayName: string | null; 
  photoURL: string | null;
  role: UserRole;
  uprId: string | null; 
  activePeriod: string | null;
  availablePeriods: string[] | null;
  riskAppetite: number | null; 
  monitoringSettings?: MonitoringSettings | null;
  createdAt: string; 
  updatedAt?: string; 
}

export interface MonitoringSession {
  id: string;
  userId: string;
  period: string; 
  name: string; 
  startDate: string; 
  endDate: string;   
  status: 'Aktif' | 'Selesai' | 'Dibatalkan';
  createdAt: string; 
  updatedAt?: string; 
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
  recordedAt: string; 
  monitoredControls?: MonitoredControlMeasureData[]; 
  updatedAt?: string; 
}


export const getControlTypeName = (typeKey: ControlMeasureTypeKey): string => {
  return CONTROL_MEASURE_TYPES[typeKey];
};

export const getCalculatedRiskLevel = (likelihood: LikelihoodLevelDesc | null, impact: ImpactLevelDesc | null): { level: CalculatedRiskLevelCategory | 'N/A'; score: number | null } => {
  if (!likelihood || !impact) return { level: 'N/A', score: null };
  
  const likelihoodValue = LIKELIHOOD_LEVELS_DESC_MAP[likelihood];
  const impactValue = IMPACT_LEVELS_DESC_MAP[impact];

  if (likelihoodValue === undefined || impactValue === undefined) return { level: 'N/A', score: null };

  const score = likelihoodValue * impactValue;

  let level: CalculatedRiskLevelCategory;
  if (score >= 20) level = 'Sangat Tinggi';
  else if (score >= 16) level = 'Tinggi';
  else if (score >= 12) level = 'Sedang';
  else if (score >= 6) level = 'Rendah';
  else if (score >= 1) level = 'Sangat Rendah';
  else level = 'Sangat Rendah'; // Default to Sangat Rendah if score is 0 or less, though not expected with 1-5 scale

  return { level, score };
};

export const getRiskLevelColor = (level: CalculatedRiskLevelCategory | 'N/A') => {
  switch (level?.toLowerCase()) {
    case 'sangat tinggi': return 'bg-red-600 hover:bg-red-700 text-white';
    case 'tinggi': return 'bg-orange-500 hover:bg-orange-600 text-white';
    case 'sedang': return 'bg-yellow-400 hover:bg-yellow-500 text-black dark:bg-yellow-500 dark:text-black';
    case 'rendah': return 'bg-blue-500 hover:bg-blue-600 text-white'; 
    case 'sangat rendah': return 'bg-green-500 hover:bg-green-600 text-white';
    default: return 'bg-gray-400 hover:bg-gray-500 text-white';
  }
};

// Fungsi ini juga lebih baik ditaruh di sini karena berkaitan dengan CalculatedRiskLevelCategory
export const getControlGuidance = (riskLevel: CalculatedRiskLevelCategory | 'N/A'): string => {
  switch (riskLevel) {
    case 'Sangat Tinggi':
    case 'Tinggi':
      return "Disarankan: Preventif (Prv), Mitigasi (RM), dan Korektif (Crr).";
    case 'Sedang':
      return "Disarankan: Preventif (Prv) dan Mitigasi (RM).";
    case 'Rendah':
    case 'Sangat Rendah':
      return "Disarankan: Preventif (Prv).";
    default:
      return "Tentukan tingkat risiko penyebab terlebih dahulu untuk mendapatkan panduan pengendalian.";
  }
};
