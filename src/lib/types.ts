
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
  // Tambahkan pengaturan lain jika perlu
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
  deadline: string | null; // ISO string date
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
  uprId: string | null; // Akan sama dengan displayName
  activePeriod: string | null;
  availablePeriods: string[] | null;
  monitoringSettings?: MonitoringSettings | null; // Pengaturan pemantauan
  createdAt: string;
  updatedAt?: string;
}

export interface MonitoringSession {
  id: string;
  userId: string;
  period: string; // Periode aplikasi saat sesi ini dibuat (mis. "2024")
  name: string; // Nama periode pemantauan (mis. "Triwulan I 2024", "Pemantauan Bulanan - Jan 2024")
  startDate: string; // ISO string date
  endDate: string;   // ISO string date
  status: 'Aktif' | 'Selesai' | 'Dibatalkan';
  createdAt: string;
  updatedAt?: string;
  // Mungkin ada field untuk ringkasan hasil pemantauan jika perlu
}

export interface RiskExposure {
  id: string;
  monitoringSessionId: string;
  riskCauseId: string;
  userId: string;
  period: string; // Periode aplikasi
  exposureValue: number; // Nilai risiko yang terjadi (diinput manual)
  exposureUnit: string; // Satuan nilai (mis. "jumlah kejadian", "Rp", "%") - Opsional, tergantung KRI
  notes?: string;
  recordedAt: string; // Timestamp saat data ini direkam
  // Field untuk realisasi KCI dari ControlMeasure terkait
  monitoredControlMeasures?: Array<{
    controlMeasureId: string;
    realizationKci: string | number | null; // Realisasi dari KCI
    performancePercentage?: number | null; // Hasil perhitungan kinerja pengendalian
    supportingEvidenceUrl?: string | null;
    monitoringResultNotes?: string;
    followUpPlan?: string;
  }>;
}


export const getControlTypeName = (typeKey: ControlMeasureTypeKey): string => {
  return CONTROL_MEASURE_TYPES[typeKey];
};
