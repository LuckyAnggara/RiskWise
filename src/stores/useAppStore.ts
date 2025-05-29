
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
    data: Omit<RiskCause, 'id' | 'createdAt' | 'userId' | 'period' | 'potentialRiskId' | 'goalId' | 'sequenceNumber' >,
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
    const currentState = get();
    if (!userId || !period) {
      console.warn("[AppStore] triggerInitialDataFetch: userId or period is missing. Resetting data.");
      currentState.resetAllData();
      return;
    }
    if (period === currentState.dataFetchedForPeriod && 
        !currentState.goalsLoading && 
        !currentState.potentialRisksLoading && 
        !currentState.riskCausesLoading && 
        !currentState.controlMeasuresLoading &&
        !currentState.monitoringSessionsLoading
    ) {
      console.log(`[AppStore] Data for period ${period} already available or not in loading state. Skipping fetch chain.`);
      return;
    }

    console.log(`[AppStore] Triggering initial data fetch for userId: ${userId}, period: ${period}. Current dataFetchedForPeriod: ${currentState.dataFetchedForPeriod}`);
    set({ 
      dataFetchedForPeriod: period, 
      goalsLoading: true, 
      potentialRisksLoading: true, 
      riskCausesLoading: true, 
      controlMeasuresLoading: true,
      monitoringSessionsLoading: true, // Start loading monitoring sessions as well
      riskExposuresLoading: false, // This will be set by specific session fetch
    });

    try {
      await get().fetchGoals(userId, period); // This will chain fetchPotentialRisks -> fetchRiskCauses -> fetchControlMeasures
      await get().fetchMonitoringSessions(userId, period); // Fetch monitoring sessions separately
    } catch (error: any) {
      const serviceErrorMessage = error.message || String(error);
      console.error("[AppStore] Error during triggerInitialDataFetch chain:", serviceErrorMessage);
      // Reset loading flags and dataFetchedForPeriod on error to allow re-fetch attempt
      set({
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
      set({ goals: [], goalsLoading: false, potentialRisksLoading: false, riskCausesLoading: false, controlMeasuresLoading: false, dataFetchedForPeriod: null });
      return;
    }
    console.log(`[AppStore] fetchGoals called for ${userId}, ${period}`);
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
        throw new Error(`Gagal memuat sasaran dari store: ${message}`);
      }
    } catch (error: any) {
      const serviceErrorMessage = error.message || String(error);
      console.error("[AppStore] fetchGoals: Error:", serviceErrorMessage);
      set({ goals: [], potentialRisksLoading: false, riskCausesLoading: false, controlMeasuresLoading: false, dataFetchedForPeriod: null });
      throw error; // Re-throw to be caught by triggerInitialDataFetch if applicable
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
      const serviceErrorMessage = error.message || String(error);
      console.error("[AppStore] addGoal: Failed:", serviceErrorMessage);
      throw new Error(`Gagal menambahkan sasaran di store: ${serviceErrorMessage}`);
    }
  },
  updateGoal: async (goalId, updatedData) => {
    try {
      const updatedGoalFromService = await updateGoalInService(goalId, updatedData);
      if (updatedGoalFromService) { 
        set(state => ({
          goals: state.goals.map(g => g.id === goalId ? { ...g, ...updatedData, updatedAt: updatedGoalFromService.updatedAt } : g).sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' })),
        }));
        return get().goals.find(g => g.id === goalId) || null; // Return from updated state
      }
      return null;
    } catch (error: any) {
      const serviceErrorMessage = error.message || String(error);
      console.error("[AppStore] updateGoal: Failed:", serviceErrorMessage);
      throw new Error(`Gagal memperbarui sasaran di store: ${serviceErrorMessage}`);
    }
  },
  deleteGoal: async (goalId, userId, period) => {
    try {
      await deleteGoalFromService(goalId, userId, period);
      const state = get();
      const goals = state.goals.filter(g => g.id !== goalId);
      const potentialRisks = state.potentialRisks.filter(pr => pr.goalId !== goalId);
      const riskCauses = state.riskCauses.filter(rc => rc.goalId !== goalId);
      const controlMeasures = state.controlMeasures.filter(cm => cm.goalId !== goalId);
      set({ goals, potentialRisks, riskCauses, controlMeasures });
    } catch (error: any) {
      const serviceErrorMessage = error.message || String(error);
      console.error("[AppStore] deleteGoal: Failed:", serviceErrorMessage);
      throw new Error(`Gagal menghapus sasaran di store: ${serviceErrorMessage}`);
    }
  },
  getGoalById: async (id, userId, period) => {
    const goalFromStore = get().goals.find(g => g.id === id && g.userId === userId && g.period === period);
    if (goalFromStore) {
      console.log(`[AppStore] getGoalById: Found goal ${id} in store.`);
      return goalFromStore;
    }
    console.log(`[AppStore] getGoalById: Goal ${id} not in store, fetching from service...`);
    try {
      return await getGoalByIdFromService(id, userId, period);
    } catch (error: any) {
      const serviceErrorMessage = error.message || String(error);
      console.error(`[AppStore] getGoalById: Error fetching goal ${id} from service:`, serviceErrorMessage);
      throw new Error(`Gagal mengambil detail sasaran dari store/service: ${serviceErrorMessage}`);
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
    console.log(`[AppStore] fetchPotentialRisks called for ${userId}, ${period}`);
    set({ potentialRisksLoading: true });
    try {
      const currentGoals = get().goals;
      if (currentGoals.length === 0 && !get().goalsLoading) {
        console.warn("[AppStore] fetchPotentialRisks: No goals loaded. fetchGoals should handle this chain, or no goals exist for this context.");
        set({ potentialRisks: [], riskCausesLoading: false, controlMeasuresLoading: false });
        await get().fetchRiskCauses(userId, period); // Still try to fetch causes in case PRs were loaded by other means
        return; 
      }
      let allPRs: PotentialRisk[] = [];
      for (const goal of currentGoals) {
        if (goal.userId === userId && goal.period === period) {
          const prsForGoal = await fetchPotentialRisksByGoalIdFromService(goal.id, userId, period);
          allPRs.push(...prsForGoal);
        }
      }
      const sortedPRs = allPRs.sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0) || a.description.localeCompare(b.description));
      set({ potentialRisks: sortedPRs });
      await get().fetchRiskCauses(userId, period);
    } catch (error: any) {
      const serviceErrorMessage = error.message || String(error);
      console.error("[AppStore] fetchPotentialRisks: Failed:", serviceErrorMessage);
      set({ potentialRisks: [], riskCausesLoading: false, controlMeasuresLoading: false });
      throw error; // Re-throw to be caught by triggerInitialDataFetch if applicable
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
      const serviceErrorMessage = error.message || String(error);
      console.error("[AppStore] addPotentialRisk: Failed:", serviceErrorMessage);
      throw new Error(`Gagal menambahkan potensi risiko di store: ${serviceErrorMessage}`);
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
      const serviceErrorMessage = error.message || String(error);
      console.error("[AppStore] updatePotentialRisk: Failed:", serviceErrorMessage);
      throw new Error(`Gagal memperbarui potensi risiko di store: ${serviceErrorMessage}`);
    }
  },
  deletePotentialRisk: async (potentialRiskId, userId, period) => {
    try {
      await deletePotentialRiskFromService(potentialRiskId, userId, period);
      const state = get();
      const potentialRisks = state.potentialRisks.filter(pr => pr.id !== potentialRiskId);
      const riskCauses = state.riskCauses.filter(rc => rc.potentialRiskId !== potentialRiskId);
      const controlMeasures = state.controlMeasures.filter(cm => cm.potentialRiskId !== potentialRiskId);
      set({ potentialRisks, riskCauses, controlMeasures });
    } catch (error: any) {
      const serviceErrorMessage = error.message || String(error);
      console.error("[AppStore] deletePotentialRisk: Failed:", serviceErrorMessage);
      throw new Error(`Gagal menghapus potensi risiko di store: ${serviceErrorMessage}`);
    }
  },
  getPotentialRiskById: async (id, userId, period) => {
    const riskFromStore = get().potentialRisks.find(pr => pr.id === id && pr.userId === userId && pr.period === period);
    if (riskFromStore) {
      console.log(`[AppStore] getPotentialRiskById: Found PR ${id} in store.`);
      return riskFromStore;
    }
    console.log(`[AppStore] getPotentialRiskById: PR ${id} not in store, fetching from service...`);
    try {
      return await getPotentialRiskByIdFromService(id, userId, period);
    } catch (error: any) {
      const serviceErrorMessage = error.message || String(error);
      console.error(`[AppStore] getPotentialRiskById: Error fetching PR ${id} from service:`, serviceErrorMessage);
      throw new Error(`Gagal mengambil detail potensi risiko dari store/service: ${serviceErrorMessage}`);
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
    console.log(`[AppStore] fetchRiskCauses called for ${userId}, ${period}`);
    set({ riskCausesLoading: true });
    try {
      const currentPotentialRisks = get().potentialRisks;
      if (currentPotentialRisks.length === 0 && !get().potentialRisksLoading) {
        console.warn("[AppStore] fetchRiskCauses: No potential risks loaded. fetchPotentialRisks should handle this chain, or no PRs exist.");
        set({ riskCauses: [], controlMeasuresLoading: false });
        await get().fetchControlMeasures(userId, period); // Still attempt to fetch controls
        return;
      }
      let allRCs: RiskCause[] = [];
      for (const pRisk of currentPotentialRisks) {
        if (pRisk.userId === userId && pRisk.period === period) {
          const rcsForPR = await fetchRiskCausesByPotentialRiskIdFromService(pRisk.id, userId, period);
          allRCs.push(...rcsForPR);
        }
      }
      const sortedRCs = allRCs.sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0) || a.description.localeCompare(b.description));
      set({ riskCauses: sortedRCs });
      await get().fetchControlMeasures(userId, period);
    } catch (error: any) {
      const serviceErrorMessage = error.message || String(error);
      console.error("[AppStore] fetchRiskCauses: Failed:", serviceErrorMessage);
      set({ riskCauses: [], controlMeasuresLoading: false });
      throw error; // Re-throw to be caught by triggerInitialDataFetch if applicable
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
      const serviceErrorMessage = error.message || String(error);
      console.error("[AppStore] addRiskCause: Failed:", serviceErrorMessage);
      throw new Error(`Gagal menambahkan penyebab risiko di store: ${serviceErrorMessage}`);
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
      const serviceErrorMessage = error.message || String(error);
      console.error("[AppStore] updateRiskCause: Failed:", serviceErrorMessage);
      throw new Error(`Gagal memperbarui penyebab risiko di store: ${serviceErrorMessage}`);
    }
  },
  deleteRiskCause: async (riskCauseId, userId, period) => {
    try {
      await deleteRiskCauseFromService(riskCauseId, userId, period);
      const state = get();
      const riskCauses = state.riskCauses.filter(rc => rc.id !== riskCauseId);
      const controlMeasures = state.controlMeasures.filter(cm => cm.riskCauseId !== riskCauseId);
      set({ riskCauses, controlMeasures });
    } catch (error: any) {
      const serviceErrorMessage = error.message || String(error);
      console.error("[AppStore] deleteRiskCause: Failed:", serviceErrorMessage);
      throw new Error(`Gagal menghapus penyebab risiko di store: ${serviceErrorMessage}`);
    }
  },
  getRiskCauseById: async (id, userId, period) => {
    const causeFromStore = get().riskCauses.find(rc => rc.id === id && rc.userId === userId && rc.period === period);
    if (causeFromStore) {
      console.log(`[AppStore] getRiskCauseById: Found RC ${id} in store.`);
      return causeFromStore;
    }
    console.log(`[AppStore] getRiskCauseById: RC ${id} not in store, fetching from service...`);
    try {
      return await getRiskCauseByIdFromService(id, userId, period);
    } catch (error: any) {
      const serviceErrorMessage = error.message || String(error);
      console.error(`[AppStore] getRiskCauseById: Error fetching RC ${id} from service:`, serviceErrorMessage);
      throw new Error(`Gagal mengambil detail penyebab risiko dari store/service: ${serviceErrorMessage}`);
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
    console.log(`[AppStore] fetchControlMeasures called for ${userId}, ${period}, RC_ID_OPT: ${riskCauseId_optional}`);
    set({ controlMeasuresLoading: true });
    try {
      let fetchedCMs: ControlMeasure[] = [];
      if (riskCauseId_optional) {
        console.log(`[AppStore] fetchControlMeasures: Fetching for specific RC ID: ${riskCauseId_optional}`);
        fetchedCMs = await fetchControlMeasuresByRiskCauseIdFromService(riskCauseId_optional, userId, period);
        set(state => ({
          controlMeasures: [
            ...state.controlMeasures.filter(cm => cm.riskCauseId !== riskCauseId_optional),
            ...fetchedCMs
          ].sort((a, b) => 
            (CONTROL_MEASURE_TYPE_KEYS.indexOf(a.controlType) - CONTROL_MEASURE_TYPE_KEYS.indexOf(b.controlType)) || 
            (a.sequenceNumber - b.sequenceNumber)
          ),
        }));
      } else {
        console.log(`[AppStore] fetchControlMeasures: Fetching all for period ${period}`);
        const currentRiskCauses = get().riskCauses;
        if (currentRiskCauses.length === 0 && !get().riskCausesLoading) {
          console.warn("[AppStore] fetchControlMeasures: No risk causes loaded. fetchRiskCauses should handle this chain, or no RCs exist.");
          set({ controlMeasures: [] });
           // No further chaining from here in this specific "fetch all" path.
          return; 
        }
        for (const riskCause of currentRiskCauses) {
          if (riskCause.userId === userId && riskCause.period === period) {
            const cmsForRC = await fetchControlMeasuresByRiskCauseIdFromService(riskCause.id, userId, period);
            fetchedCMs.push(...cmsForRC);
          }
        }
        const sortedCMs = fetchedCMs.sort((a, b) => 
          (CONTROL_MEASURE_TYPE_KEYS.indexOf(a.controlType) - CONTROL_MEASURE_TYPE_KEYS.indexOf(b.controlType)) || 
          (a.sequenceNumber - b.sequenceNumber)
        );
        set({ controlMeasures: sortedCMs });
      }
    } catch (error: any) {
      const serviceErrorMessage = error.message || String(error);
      console.error("[AppStore] fetchControlMeasures: Failed:", serviceErrorMessage);
      set({ controlMeasures: [] });
      throw error; // Re-throw to be caught by triggerInitialDataFetch if applicable
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
      const serviceErrorMessage = error.message || String(error);
      console.error("[AppStore] addControlMeasure: Failed:", serviceErrorMessage);
      throw new Error(`Gagal menambahkan tindakan pengendalian di store: ${serviceErrorMessage}`);
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
      const serviceErrorMessage = error.message || String(error);
      console.error("[AppStore] updateControlMeasure: Failed:", serviceErrorMessage);
      throw new Error(`Gagal memperbarui tindakan pengendalian di store: ${serviceErrorMessage}`);
    }
  },
  deleteControlMeasure: async (controlMeasureId, userId, period) => {
    try {
      await deleteControlMeasureFromService(controlMeasureId); 
      set(state => ({
        controlMeasures: state.controlMeasures.filter(cm => cm.id !== controlMeasureId),
      }));
    } catch (error: any) {
      const serviceErrorMessage = error.message || String(error);
      console.error("[AppStore] deleteControlMeasure: Failed:", serviceErrorMessage);
      throw new Error(`Gagal menghapus tindakan pengendalian di store: ${serviceErrorMessage}`);
    }
  },
  getControlMeasureById: async (id, userId, period) => {
    const cmFromStore = get().controlMeasures.find(cm => cm.id === id && cm.userId === userId && cm.period === period);
    if (cmFromStore) {
      console.log(`[AppStore] getControlMeasureById: Found CM ${id} in store.`);
      return cmFromStore;
    }
    console.log(`[AppStore] getControlMeasureById: CM ${id} not in store, fetching from service...`);
    try {
      return await getControlMeasureByIdFromService(id, userId, period);
    } catch (error: any) {
      const serviceErrorMessage = error.message || String(error);
      console.error(`[AppStore] getControlMeasureById: Error fetching CM ${id} from service:`, serviceErrorMessage);
      throw new Error(`Gagal mengambil detail tindakan pengendalian dari store/service: ${serviceErrorMessage}`);
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
    console.log(`[AppStore] fetchMonitoringSessions called for ${userId}, ${period}`);
    set({ monitoringSessionsLoading: true });
    try {
      const sessions = await fetchMonitoringSessionsFromService(userId, period);
      set({ monitoringSessions: sessions.sort((a,b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()) });
    } catch (error: any) {
      const serviceErrorMessage = error.message || String(error);
      console.error("[AppStore] fetchMonitoringSessions: Failed:", serviceErrorMessage);
      set({ monitoringSessions: [] });
      // Tidak melempar error di sini agar tidak menghentikan triggerInitialDataFetch jika ini dipanggil secara mandiri
    } finally {
      set({ monitoringSessionsLoading: false });
    }
  },
  addMonitoringSessionToState: (session) => { 
    set(state => ({
      monitoringSessions: [...state.monitoringSessions, session].sort((a,b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())
    }));
  },
  fetchCurrentMonitoringSession: async (sessionId, userId, appPeriod) => { 
    if (!sessionId || !userId || !appPeriod) {
      set({ currentMonitoringSession: null, currentMonitoringSessionLoading: false, riskExposures: [], riskExposuresLoading: false });
      return;
    }
    console.log(`[AppStore] fetchCurrentMonitoringSession called for session: ${sessionId}, user: ${userId}, appPeriod: ${appPeriod}`);
    set({ currentMonitoringSessionLoading: true, riskExposuresLoading: true });
    try {
      const session = await getMonitoringSessionByIdFromService(sessionId, userId, appPeriod); 
      set({ currentMonitoringSession: session });
      if (session) {
        await get().fetchRiskExposuresForSession(sessionId, userId, session.period); 
      } else {
        set({ riskExposures: [], riskExposuresLoading: false });
      }
    } catch (error: any) {
      const serviceErrorMessage = error.message || String(error);
      console.error(`[AppStore] fetchCurrentMonitoringSession (ID: ${sessionId}): Failed:`, serviceErrorMessage);
      set({ currentMonitoringSession: null, riskExposures: [], riskExposuresLoading: false });
    } finally {
      set({ currentMonitoringSessionLoading: false });
    }
  },
  fetchRiskExposuresForSession: async (monitoringSessionId, userId, sessionPeriod) => { 
    if (!monitoringSessionId || !userId || !sessionPeriod) {
      set({ riskExposures: [], riskExposuresLoading: false });
      return;
    }
    console.log(`[AppStore] fetchRiskExposuresForSession called for sessionID: ${monitoringSessionId}, user: ${userId}, sessionPeriod: ${sessionPeriod}`);
    set({ riskExposuresLoading: true });
    try {
      const exposures = await fetchRiskExposuresBySessionFromService(monitoringSessionId, userId, sessionPeriod);
      set({ riskExposures: exposures });
    } catch (error: any) {
      const serviceErrorMessage = error.message || String(error);
      console.error(`[AppStore] fetchRiskExposuresForSession (SessionID: ${monitoringSessionId}): Failed:`, serviceErrorMessage);
      set({ riskExposures: [] });
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
        let updatedExposures;
        if (existingIndex > -1) {
          updatedExposures = [...state.riskExposures];
          updatedExposures[existingIndex] = upsertedExposureFromService;
        } else {
          updatedExposures = [...state.riskExposures, upsertedExposureFromService];
        }
        return { riskExposures: updatedExposures };
      });
      return upsertedExposureFromService;
    } catch (error: any) {
      const serviceErrorMessage = error.message || String(error);
      console.error(`[AppStore] upsertRiskExposureInState (CauseID: ${exposureData.riskCauseId}): Failed:`, serviceErrorMessage);
      throw new Error(`Gagal menyimpan data paparan di store: ${serviceErrorMessage}`);
    }
  },
}));

// Function to be called from AuthContext or AppLayout when user context changes
export const triggerInitialDataFetch = (userId: string, period: string) => {
  const store = useAppStore.getState();
  if (userId && period) {
    store.triggerInitialDataFetch(userId, period);
  }
};
