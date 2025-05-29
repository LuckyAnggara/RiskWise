
"use client";

import { create } from 'zustand';
import type { Goal, PotentialRisk, RiskCause, ControlMeasure, MonitoringSession, RiskExposure, AppUser, ControlMeasureTypeKey } from '@/lib/types';
import {
  addGoal as addGoalToService,
  getGoals as fetchGoalsFromService,
  updateGoal as updateGoalInService,
  deleteGoal as deleteGoalFromService,
  getGoalById as getGoalByIdFromService
} from '@/services/goalService';
import {
  addPotentialRisk as addPotentialRiskToService,
  getPotentialRisksByGoalId as fetchPotentialRisksByGoalIdFromService,
  updatePotentialRisk as updatePotentialRiskInService,
  deletePotentialRiskAndSubCollections as deletePotentialRiskFromService,
  getPotentialRiskById as getPotentialRiskByIdFromService
} from '@/services/potentialRiskService';
import {
  addRiskCause as addRiskCauseToService,
  getRiskCausesByPotentialRiskId as fetchRiskCausesByPotentialRiskIdFromService,
  updateRiskCause as updateRiskCauseInService,
  deleteRiskCauseAndSubCollections as deleteRiskCauseFromService,
  getRiskCauseById as getRiskCauseByIdFromService
} from '@/services/riskCauseService';
import {
  addControlMeasure as addControlMeasureToService,
  getControlMeasuresByRiskCauseId as fetchControlMeasuresByRiskCauseIdFromService,
  updateControlMeasure as updateControlMeasureInService,
  deleteControlMeasure as deleteControlMeasureFromService,
  getControlMeasureById as getControlMeasureByIdFromService
} from '@/services/controlMeasureService';
import {
  addMonitoringSession as addMonitoringSessionToService,
  getMonitoringSessions as fetchMonitoringSessionsFromService,
  getMonitoringSessionById as getMonitoringSessionByIdFromService,
} from '@/services/monitoringService';
import {
  getRiskExposuresBySession as fetchRiskExposuresBySessionFromService,
  upsertRiskExposure as upsertRiskExposureToService,
} from '@/services/riskExposureService';

const CONTROL_MEASURE_TYPE_KEYS: ControlMeasureTypeKey[] = ['Prv', 'RM', 'Crr'];

interface GoalState {
  goals: Goal[];
  goalsLoading: boolean;
  fetchGoals: (userId: string, period: string) => Promise<void>;
  addGoal: (
    goalData: Omit<Goal, 'id' | 'code' | 'createdAt' | 'userId' | 'period'>,
    userId: string,
    period: string
  ) => Promise<Goal | null>;
  updateGoal: (
    goalId: string,
    updatedData: Partial<Omit<Goal, 'id' | 'userId' | 'period' | 'code' | 'createdAt' | 'updatedAt'>>
  ) => Promise<Goal | null>;
  deleteGoal: (goalId: string, userId: string, period: string) => Promise<void>;
  getGoalById: (id: string, userId: string, period: string) => Promise<Goal | null>;
}

interface PotentialRiskState {
  potentialRisks: PotentialRisk[];
  potentialRisksLoading: boolean;
  fetchPotentialRisks: (userId: string, period: string) => Promise<void>;
  addPotentialRisk: (
    data: Omit<PotentialRisk, 'id' | 'identifiedAt' | 'userId' | 'period' | 'sequenceNumber' | 'goalId'>,
    goalId: string,
    userId: string,
    period: string,
    sequenceNumber: number
  ) => Promise<PotentialRisk | null>;
  updatePotentialRisk: (
    potentialRiskId: string,
    updatedData: Partial<Omit<PotentialRisk, 'id' | 'userId' | 'period' | 'goalId' | 'identifiedAt' | 'sequenceNumber' | 'updatedAt'>>
  ) => Promise<PotentialRisk | null>;
  deletePotentialRisk: (potentialRiskId: string, userId: string, period: string) => Promise<void>;
  getPotentialRiskById: (id: string, userId: string, period: string) => Promise<PotentialRisk | null>;
}

interface RiskCauseState {
  riskCauses: RiskCause[];
  riskCausesLoading: boolean;
  fetchRiskCauses: (userId: string, period: string) => Promise<void>;
  addRiskCause: (
    data: Omit<RiskCause, 'id' | 'createdAt' | 'userId' | 'period' | 'potentialRiskId' | 'goalId' | 'sequenceNumber'>,
    potentialRiskId: string,
    goalId: string,
    userId: string,
    period: string,
    sequenceNumber: number
  ) => Promise<RiskCause | null>;
  updateRiskCause: (
    riskCauseId: string,
    updatedData: Partial<Omit<RiskCause, 'id' | 'potentialRiskId' | 'goalId' | 'userId' | 'period' | 'createdAt' | 'sequenceNumber'>>
  ) => Promise<RiskCause | null>;
  deleteRiskCause: (riskCauseId: string, userId: string, period: string) => Promise<void>;
  getRiskCauseById: (id: string, userId: string, period: string) => Promise<RiskCause | null>;
}

interface ControlMeasureState {
  controlMeasures: ControlMeasure[];
  controlMeasuresLoading: boolean;
  fetchControlMeasures: (userId: string, period: string, riskCauseId?: string) => Promise<void>;
  addControlMeasure: (
    data: Omit<ControlMeasure, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'period' | 'riskCauseId' | 'potentialRiskId' | 'goalId' | 'sequenceNumber'>,
    riskCauseId: string,
    potentialRiskId: string,
    goalId: string,
    userId: string,
    period: string,
    sequenceNumber: number
  ) => Promise<ControlMeasure | null>;
  updateControlMeasure: (
    controlMeasureId: string,
    updatedData: Partial<Omit<ControlMeasure, 'id' | 'riskCauseId' | 'potentialRiskId' | 'goalId' | 'userId' | 'period' | 'createdAt' | 'sequenceNumber' | 'updatedAt'>>
  ) => Promise<ControlMeasure | null>;
  deleteControlMeasure: (controlMeasureId: string, userId: string, period: string) => Promise<void>;
  getControlMeasureById: (id: string, userId: string, period: string) => Promise<ControlMeasure | null>;
}

interface MonitoringState {
  monitoringSessions: MonitoringSession[];
  monitoringSessionsLoading: boolean;
  currentMonitoringSession: MonitoringSession | null;
  currentMonitoringSessionLoading: boolean;
  riskExposures: RiskExposure[];
  riskExposuresLoading: boolean;
  fetchMonitoringSessions: (userId: string, period: string) => Promise<void>;
  fetchCurrentMonitoringSession: (sessionId: string, userId: string, period: string) => Promise<void>;
  fetchRiskExposuresForSession: (monitoringSessionId: string, userId: string, period: string) => Promise<void>;
  addMonitoringSessionToState: (session: MonitoringSession) => void;
  upsertRiskExposureInState: (exposureData: Omit<RiskExposure, 'id' | 'recordedAt' | 'updatedAt'>) => Promise<RiskExposure>;
}


interface AppStoreGeneralState {
  dataFetchedForPeriod: string | null;
  triggerInitialDataFetch: (userId: string, period: string) => Promise<void>;
  resetAllData: () => void;
  getControlTypeName: (typeKey: ControlMeasureTypeKey) => string;
}

type AppState = GoalState & PotentialRiskState & RiskCauseState & ControlMeasureState & MonitoringState & AppStoreGeneralState;

export const useAppStore = create<AppState>((set, get) => ({
  // --- General State and Actions ---
  dataFetchedForPeriod: null,
  triggerInitialDataFetch: async (userId, period) => {
    if (!userId || !period) {
      console.warn("[AppStore] triggerInitialDataFetch: userId or period is missing. Aborting.");
      get().resetAllData(); // Pastikan reset jika konteks tidak valid
      return;
    }
    if (period === get().dataFetchedForPeriod && !get().goalsLoading && !get().potentialRisksLoading && !get().riskCausesLoading && !get().controlMeasuresLoading && !get().monitoringSessionsLoading) {
      console.log(`[AppStore] Data for period ${period} already seems fetched and not loading. Skipping.`);
      return;
    }
    console.log(`[AppStore] Triggering initial data fetch for userId: ${userId}, period: ${period}. Current dataFetchedForPeriod: ${get().dataFetchedForPeriod}`);
    set({ 
      dataFetchedForPeriod: period, 
      goalsLoading: true, 
      potentialRisksLoading: true, 
      riskCausesLoading: true, 
      controlMeasuresLoading: true,
      monitoringSessionsLoading: true,
      riskExposuresLoading: false, 
    });
    try {
      await get().fetchGoals(userId, period); 
      await get().fetchMonitoringSessions(userId, period);
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      console.error("[AppStore] Error during triggerInitialDataFetch chain:", errorMessage);
      set({ // Reset semua loading dan dataFetchedForPeriod jika ada error di chain awal
        goalsLoading: false,
        potentialRisksLoading: false,
        riskCausesLoading: false,
        controlMeasuresLoading: false,
        monitoringSessionsLoading: false,
        dataFetchedForPeriod: null, 
      });
    }
  },
  resetAllData: () => {
    console.log("[AppStore] resetAllData called.");
    set({
      goals: [],
      goalsLoading: false,
      potentialRisks: [],
      potentialRisksLoading: false,
      riskCauses: [],
      riskCausesLoading: false,
      controlMeasures: [],
      controlMeasuresLoading: false,
      monitoringSessions: [],
      monitoringSessionsLoading: false,
      currentMonitoringSession: null,
      currentMonitoringSessionLoading: false,
      riskExposures: [],
      riskExposuresLoading: false,
      dataFetchedForPeriod: null,
    });
  },
  getControlTypeName: (typeKey) => {
    const types: Record<ControlMeasureTypeKey, string> = {
      'Prv': 'Preventif',
      'RM': 'Mitigasi Risiko',
      'Crr': 'Korektif'
    };
    return types[typeKey] || typeKey;
  },

  // --- Goals State and Actions ---
  goals: [],
  goalsLoading: false,
  fetchGoals: async (userId, period) => {
    if (!userId || !period) {
      set({ goals: [], goalsLoading: false, potentialRisksLoading: false, riskCausesLoading: false, controlMeasuresLoading: false });
      return;
    }
    set({ goalsLoading: true });
    try {
      const result = await fetchGoalsFromService(userId, period);
      if (result.success && result.goals) {
        const sortedGoals = result.goals.sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' }));
        set({ goals: sortedGoals });
        await get().fetchPotentialRisks(userId, period);
      } else {
        const message = result.message || "Unknown error fetching goals.";
        console.error("[AppStore] fetchGoals: Failed:", message);
        set({ goals: [], potentialRisksLoading: false, riskCausesLoading: false, controlMeasuresLoading: false, dataFetchedForPeriod: null });
        throw new Error(`Gagal memuat sasaran: ${message}`);
      }
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      console.error("[AppStore] fetchGoals: Error:", errorMessage);
      set({ goals: [], potentialRisksLoading: false, riskCausesLoading: false, controlMeasuresLoading: false, dataFetchedForPeriod: null });
      throw new Error(`Error fatal saat memuat sasaran: ${errorMessage}`);
    } finally {
      set({ goalsLoading: false });
    }
  },
  addGoal: async (goalData, userId, period) => {
    try {
      const newGoal = await addGoalToService(goalData, userId, period);
      if (newGoal) {
        set(state => ({
          goals: [...state.goals, newGoal].sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' })),
        }));
      }
      return newGoal;
    } catch (error: any) {
      console.error("[AppStore] addGoal: Failed:", error.message || String(error));
      throw error;
    }
  },
  updateGoal: async (goalId, updatedData) => {
    try {
      const goalToUpdate = get().goals.find(g => g.id === goalId);
      if (!goalToUpdate) throw new Error("Sasaran tidak ditemukan di store untuk diperbarui.");
      
      const updatedGoalFromService = await updateGoalInService(goalId, updatedData);
      if (updatedGoalFromService) {
        set(state => ({
          goals: state.goals.map(g => g.id === goalId ? updatedGoalFromService : g).sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' })),
        }));
        return updatedGoalFromService;
      }
      return null;
    } catch (error: any) {
      console.error("[AppStore] updateGoal: Failed:", error.message || String(error));
      throw error;
    }
  },
  deleteGoal: async (goalId, userId, period) => {
    try {
      await deleteGoalFromService(goalId, userId, period);
      set(state => ({
        goals: state.goals.filter(g => g.id !== goalId),
        potentialRisks: state.potentialRisks.filter(pr => pr.goalId !== goalId),
        riskCauses: state.riskCauses.filter(rc => rc.goalId !== goalId),
        controlMeasures: state.controlMeasures.filter(cm => cm.goalId !== goalId),
      }));
    } catch (error: any) {
      console.error("[AppStore] deleteGoal: Failed:", error.message || String(error));
      throw error;
    }
  },
  getGoalById: async (id, userId, period) => {
    const goalFromStore = get().goals.find(g => g.id === id && g.userId === userId && g.period === period);
    if (goalFromStore) return goalFromStore;
    try {
      return await getGoalByIdFromService(id, userId, period);
    } catch (error: any) {
      console.error(`[AppStore] getGoalById: Error fetching goal ${id} from service:`, error.message || String(error));
      throw new Error(`Gagal mengambil detail sasaran: ${error.message || String(error)}`);
    }
  },

  // --- PotentialRisks State and Actions ---
  potentialRisks: [],
  potentialRisksLoading: false,
  fetchPotentialRisks: async (userId, period) => {
    if (!userId || !period) {
      set({ potentialRisks: [], potentialRisksLoading: false, riskCausesLoading: false, controlMeasuresLoading: false });
      return;
    }
    set({ potentialRisksLoading: true });
    try {
      const currentGoals = get().goals;
      if (currentGoals.length === 0 && !get().goalsLoading) {
        console.warn("[AppStore] fetchPotentialRisks: No goals loaded. Re-fetching goals first.");
        await get().fetchGoals(userId, period); // Should trigger this fetch again if successful
        // If fetchGoals fails, it will reset loading flags including potentialRisksLoading
        return; 
      }
      let allPRs: PotentialRisk[] = [];
      for (const goal of get().goals) { // Use get().goals to ensure latest state
        if (goal.userId === userId && goal.period === period) {
          const prsForGoal = await fetchPotentialRisksByGoalIdFromService(goal.id, userId, period);
          allPRs.push(...prsForGoal);
        }
      }
      const sortedPRs = allPRs.sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0) || a.description.localeCompare(b.description));
      set({ potentialRisks: sortedPRs });
      await get().fetchRiskCauses(userId, period);
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      console.error("[AppStore] fetchPotentialRisks: Failed:", errorMessage);
      set({ potentialRisks: [], riskCausesLoading: false, controlMeasuresLoading: false, dataFetchedForPeriod: null });
      throw new Error(`Gagal memuat potensi risiko: ${errorMessage}`);
    } finally {
      set({ potentialRisksLoading: false });
    }
  },
  addPotentialRisk: async (data, goalId, userId, period, sequenceNumber) => {
    try {
      const newPotentialRisk = await addPotentialRiskToService(data, goalId, userId, period, sequenceNumber);
      if (newPotentialRisk) {
        set(state => ({
          potentialRisks: [...state.potentialRisks, newPotentialRisk].sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0) || a.description.localeCompare(b.description)),
        }));
      }
      return newPotentialRisk;
    } catch (error: any) {
      console.error("[AppStore] addPotentialRisk: Failed:", error.message || String(error));
      throw error;
    }
  },
  updatePotentialRisk: async (potentialRiskId, updatedData) => {
    try {
      const updatedPR = await updatePotentialRiskInService(potentialRiskId, updatedData);
      if (updatedPR) {
        set(state => ({
          potentialRisks: state.potentialRisks.map(pr => pr.id === potentialRiskId ? updatedPR : pr)
                                              .sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0) || a.description.localeCompare(b.description)),
        }));
      }
      return updatedPR;
    } catch (error: any) {
      console.error("[AppStore] updatePotentialRisk: Failed:", error.message || String(error));
      throw error;
    }
  },
  deletePotentialRisk: async (potentialRiskId, userId, period) => {
    try {
      await deletePotentialRiskFromService(potentialRiskId, userId, period);
      set(state => ({
        potentialRisks: state.potentialRisks.filter(pr => pr.id !== potentialRiskId),
        riskCauses: state.riskCauses.filter(rc => rc.potentialRiskId !== potentialRiskId),
        controlMeasures: state.controlMeasures.filter(cm => cm.potentialRiskId !== potentialRiskId),
      }));
    } catch (error: any) {
      console.error("[AppStore] deletePotentialRisk: Failed:", error.message || String(error));
      throw error;
    }
  },
  getPotentialRiskById: async (id, userId, period) => {
    const riskFromStore = get().potentialRisks.find(pr => pr.id === id && pr.userId === userId && pr.period === period);
    if (riskFromStore) return riskFromStore;
    try {
      return await getPotentialRiskByIdFromService(id, userId, period);
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      console.error(`[AppStore] getPotentialRiskById: Error fetching PR ${id} from service:`, errorMessage);
      throw new Error(`Gagal mengambil detail potensi risiko: ${errorMessage}`);
    }
  },

  // --- RiskCauses State and Actions ---
  riskCauses: [],
  riskCausesLoading: false,
  fetchRiskCauses: async (userId, period) => {
    if (!userId || !period) {
      set({ riskCauses: [], riskCausesLoading: false, controlMeasuresLoading: false });
      return;
    }
    set({ riskCausesLoading: true });
    try {
      const currentPotentialRisks = get().potentialRisks;
      if (currentPotentialRisks.length === 0 && !get().potentialRisksLoading) {
        console.warn("[AppStore] fetchRiskCauses: No potential risks loaded. Re-fetching PRs first.");
        await get().fetchPotentialRisks(userId, period);
        return;
      }
      let allRCs: RiskCause[] = [];
      for (const pRisk of get().potentialRisks) { // Use get().potentialRisks
        if (pRisk.userId === userId && pRisk.period === period) {
          const rcsForPR = await fetchRiskCausesByPotentialRiskIdFromService(pRisk.id, userId, period);
          allRCs.push(...rcsForPR);
        }
      }
      const sortedRCs = allRCs.sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0) || a.description.localeCompare(b.description));
      set({ riskCauses: sortedRCs });
      await get().fetchControlMeasures(userId, period); // Fetch all CMs for the period
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      console.error("[AppStore] fetchRiskCauses: Failed:", errorMessage);
      set({ riskCauses: [], controlMeasuresLoading: false, dataFetchedForPeriod: null });
      throw new Error(`Gagal memuat penyebab risiko: ${errorMessage}`);
    } finally {
      set({ riskCausesLoading: false });
    }
  },
  addRiskCause: async (data, potentialRiskId, goalId, userId, period, sequenceNumber) => {
    try {
      const newRiskCause = await addRiskCauseToService(data, potentialRiskId, goalId, userId, period, sequenceNumber);
      if (newRiskCause) {
        set(state => ({
          riskCauses: [...state.riskCauses, newRiskCause].sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0) || a.description.localeCompare(b.description)),
        }));
      }
      return newRiskCause;
    } catch (error: any) {
      console.error("[AppStore] addRiskCause: Failed:", error.message || String(error));
      throw error;
    }
  },
  updateRiskCause: async (riskCauseId, updatedData) => {
    try {
      const updatedRC = await updateRiskCauseInService(riskCauseId, updatedData);
      if (updatedRC) {
        set(state => ({
          riskCauses: state.riskCauses.map(rc => rc.id === riskCauseId ? updatedRC : rc)
                                      .sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0) || a.description.localeCompare(b.description)),
        }));
      }
      return updatedRC;
    } catch (error: any) {
      console.error("[AppStore] updateRiskCause: Failed:", error.message || String(error));
      throw error;
    }
  },
  deleteRiskCause: async (riskCauseId, userId, period) => {
    try {
      await deleteRiskCauseFromService(riskCauseId, userId, period);
      set(state => ({
        riskCauses: state.riskCauses.filter(rc => rc.id !== riskCauseId),
        controlMeasures: state.controlMeasures.filter(cm => cm.riskCauseId !== riskCauseId),
      }));
    } catch (error: any) {
      console.error("[AppStore] deleteRiskCause: Failed:", error.message || String(error));
      throw error;
    }
  },
  getRiskCauseById: async (id, userId, period) => {
    const causeFromStore = get().riskCauses.find(rc => rc.id === id && rc.userId === userId && rc.period === period);
    if (causeFromStore) return causeFromStore;
    try {
      return await getRiskCauseByIdFromService(id, userId, period);
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      console.error(`[AppStore] getRiskCauseById: Error fetching RC ${id} from service:`, errorMessage);
      throw new Error(`Gagal mengambil detail penyebab risiko: ${errorMessage}`);
    }
  },

  // --- ControlMeasures State and Actions ---
  controlMeasures: [],
  controlMeasuresLoading: false,
  fetchControlMeasures: async (userId, period, riskCauseId_optional?: string) => {
    if (!userId || !period) {
      set({ controlMeasures: [], controlMeasuresLoading: false });
      return;
    }
    set({ controlMeasuresLoading: true });
    try {
      let allCMs: ControlMeasure[] = [];
      if (riskCauseId_optional) { // Fetch for a specific risk cause (e.g., on RiskCauseAnalysisPage)
        console.log(`[AppStore] fetchControlMeasures: Fetching for specific RC ID: ${riskCauseId_optional}`);
        allCMs = await fetchControlMeasuresByRiskCauseIdFromService(riskCauseId_optional, userId, period);
         // Update only CMs for this specific riskCauseId or merge smartly
        set(state => ({
          controlMeasures: [
            ...state.controlMeasures.filter(cm => cm.riskCauseId !== riskCauseId_optional),
            ...allCMs
          ].sort((a, b) => 
            (CONTROL_MEASURE_TYPE_KEYS.indexOf(a.controlType) - CONTROL_MEASURE_TYPE_KEYS.indexOf(b.controlType)) || 
            (a.sequenceNumber - b.sequenceNumber)
          ),
        }));
      } else { // Fetch all control measures for all relevant risk causes (e.g., on initial load)
        console.log(`[AppStore] fetchControlMeasures: Fetching all for period ${period}`);
        const currentRiskCauses = get().riskCauses;
        if (currentRiskCauses.length === 0 && !get().riskCausesLoading) {
          console.warn("[AppStore] fetchControlMeasures: No risk causes loaded. Re-fetching RCs first.");
          await get().fetchRiskCauses(userId, period);
          return; 
        }
        for (const riskCause of get().riskCauses) { // Use get().riskCauses
          if (riskCause.userId === userId && riskCause.period === period) {
            const cmsForRC = await fetchControlMeasuresByRiskCauseIdFromService(riskCause.id, userId, period);
            allCMs.push(...cmsForRC);
          }
        }
        const sortedCMs = allCMs.sort((a, b) => 
          (CONTROL_MEASURE_TYPE_KEYS.indexOf(a.controlType) - CONTROL_MEASURE_TYPE_KEYS.indexOf(b.controlType)) || 
          (a.sequenceNumber - b.sequenceNumber)
        );
        set({ controlMeasures: sortedCMs });
      }
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      console.error("[AppStore] fetchControlMeasures: Failed:", errorMessage);
      set({ controlMeasures: [], dataFetchedForPeriod: riskCauseId_optional ? get().dataFetchedForPeriod : null }); // Only reset dataFetchedForPeriod if it was a global fetch
      throw new Error(`Gagal memuat tindakan pengendalian: ${errorMessage}`);
    } finally {
      set({ controlMeasuresLoading: false });
    }
  },
  addControlMeasure: async (data, riskCauseId, potentialRiskId, goalId, userId, period, sequenceNumber) => {
    try {
      const newCM = await addControlMeasureToService(data, riskCauseId, potentialRiskId, goalId, userId, period, sequenceNumber);
      if (newCM) {
        set(state => ({
          controlMeasures: [...state.controlMeasures, newCM].sort((a, b) => 
            (CONTROL_MEASURE_TYPE_KEYS.indexOf(a.controlType) - CONTROL_MEASURE_TYPE_KEYS.indexOf(b.controlType)) || 
            (a.sequenceNumber - b.sequenceNumber)
          ),
        }));
      }
      return newCM;
    } catch (error: any) {
      console.error("[AppStore] addControlMeasure: Failed:", error.message || String(error));
      throw error;
    }
  },
  updateControlMeasure: async (controlMeasureId, updatedData) => {
    try {
      const updatedCM = await updateControlMeasureInService(controlMeasureId, updatedData);
      if (updatedCM) {
        set(state => ({
          controlMeasures: state.controlMeasures.map(cm => cm.id === controlMeasureId ? updatedCM : cm)
                                              .sort((a, b) => 
                                                (CONTROL_MEASURE_TYPE_KEYS.indexOf(a.controlType) - CONTROL_MEASURE_TYPE_KEYS.indexOf(b.controlType)) || 
                                                (a.sequenceNumber - b.sequenceNumber)
                                              ),
        }));
      }
      return updatedCM;
    } catch (error: any) {
      console.error("[AppStore] updateControlMeasure: Failed:", error.message || String(error));
      throw error;
    }
  },
  deleteControlMeasure: async (controlMeasureId, userId, period) => {
    try {
      await deleteControlMeasureFromService(controlMeasureId); // Service handles Firestore deletion
      set(state => ({
        controlMeasures: state.controlMeasures.filter(cm => cm.id !== controlMeasureId),
      }));
    } catch (error: any) {
      console.error("[AppStore] deleteControlMeasure: Failed:", error.message || String(error));
      throw error;
    }
  },
  getControlMeasureById: async (id, userId, period) => {
    const cmFromStore = get().controlMeasures.find(cm => cm.id === id && cm.userId === userId && cm.period === period);
    if (cmFromStore) return cmFromStore;
    try {
      return await getControlMeasureByIdFromService(id, userId, period);
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      console.error(`[AppStore] getControlMeasureById: Error fetching CM ${id} from service:`, errorMessage);
      throw new Error(`Gagal mengambil detail tindakan pengendalian: ${errorMessage}`);
    }
  },

  // --- Monitoring State and Actions ---
  monitoringSessions: [],
  monitoringSessionsLoading: false,
  currentMonitoringSession: null,
  currentMonitoringSessionLoading: false,
  riskExposures: [],
  riskExposuresLoading: false,

  fetchMonitoringSessions: async (userId, period) => {
    if (!userId || !period) {
      set({ monitoringSessions: [], monitoringSessionsLoading: false });
      return;
    }
    set({ monitoringSessionsLoading: true });
    try {
      const sessions = await fetchMonitoringSessionsFromService(userId, period);
      set({ monitoringSessions: sessions.sort((a,b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()) });
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      console.error("[AppStore] fetchMonitoringSessions: Failed:", errorMessage);
      set({ monitoringSessions: [] });
      throw new Error(`Gagal memuat sesi pemantauan: ${errorMessage}`);
    } finally {
      set({ monitoringSessionsLoading: false });
    }
  },
  addMonitoringSessionToState: (session) => {
    set(state => ({
      monitoringSessions: [...state.monitoringSessions, session].sort((a,b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())
    }));
  },
  fetchCurrentMonitoringSession: async (sessionId, userId, period) => { 
    if (!sessionId || !userId || !period) {
      set({ currentMonitoringSession: null, currentMonitoringSessionLoading: false, riskExposures: [], riskExposuresLoading: false });
      return;
    }
    set({ currentMonitoringSessionLoading: true, riskExposuresLoading: true });
    try {
      const session = await getMonitoringSessionByIdFromService(sessionId, userId, period);
      set({ currentMonitoringSession: session });
      if (session) {
        await get().fetchRiskExposuresForSession(sessionId, userId, session.period); 
      } else {
        set({ riskExposures: [], riskExposuresLoading: false });
      }
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      console.error(`[AppStore] fetchCurrentMonitoringSession (ID: ${sessionId}): Failed:`, errorMessage);
      set({ currentMonitoringSession: null, riskExposures: [], riskExposuresLoading: false });
      throw new Error(`Gagal memuat detail sesi pemantauan: ${errorMessage}`);
    } finally {
      set({ currentMonitoringSessionLoading: false });
    }
  },
  fetchRiskExposuresForSession: async (monitoringSessionId, userId, sessionPeriod) => { 
    if (!monitoringSessionId || !userId || !sessionPeriod) {
      set({ riskExposures: [], riskExposuresLoading: false });
      return;
    }
    set({ riskExposuresLoading: true });
    try {
      const exposures = await fetchRiskExposuresBySessionFromService(monitoringSessionId, userId, sessionPeriod);
      set({ riskExposures: exposures });
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      console.error(`[AppStore] fetchRiskExposuresForSession (SessionID: ${monitoringSessionId}): Failed:`, errorMessage);
      set({ riskExposures: [] });
      throw new Error(`Gagal memuat data paparan risiko: ${errorMessage}`);
    } finally {
      set({ riskExposuresLoading: false });
    }
  },
  upsertRiskExposureInState: async (exposureData) => {
    try {
      const upsertedExposureFromService = await upsertRiskExposureToService(exposureData);
      set((state) => {
        const existingIndex = state.riskExposures.findIndex(
          (re) =>
            re.riskCauseId === upsertedExposureFromService.riskCauseId &&
            re.monitoringSessionId === upsertedExposureFromService.monitoringSessionId
        );
        if (existingIndex > -1) {
          const updatedExposures = [...state.riskExposures];
          updatedExposures[existingIndex] = upsertedExposureFromService;
          return { riskExposures: updatedExposures };
        } else {
          return {
            riskExposures: [...state.riskExposures, upsertedExposureFromService],
          };
        }
      });
      return upsertedExposureFromService;
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      console.error(`[AppStore] upsertRiskExposureInState (CauseID: ${exposureData.riskCauseId}): Failed:`, errorMessage);
      // Optional: Re-fetch exposures for the current session if upsert fails to ensure consistency
      // if (get().currentMonitoringSession) {
      //   await get().fetchRiskExposuresForSession(get().currentMonitoringSession!.id, exposureData.userId, exposureData.period);
      // }
      throw new Error(`Gagal menyimpan data paparan: ${errorMessage}`);
    }
  },
}));

// Function to be called from AuthContext or AppLayout when user context changes
export const triggerInitialDataFetch = (userId: string, period: string) => {
  const store = useAppStore.getState();
  if (userId && period) {
    store.triggerInitialDataFetch(userId, period);
  } else {
    store.resetAllData();
  }
};

    