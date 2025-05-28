
"use client";

import { create } from 'zustand';
import type { Goal, PotentialRisk, RiskCause, ControlMeasure, MonitoringSession, RiskExposure, AppUser } from '@/lib/types';
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
import type { ControlMeasureTypeKey } from '@/lib/types';

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
  fetchControlMeasures: (userId: string, period: string) => Promise<void>;
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
  fetchRiskExposuresForSession: (monitoringSessionId: string, userId: string, period: string) => Promise<void>; // period is session's period
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
    console.log(`[AppStore] triggerInitialDataFetch called. Current dataFetchedForPeriod: ${get().dataFetchedForPeriod}, Requested period: ${period}`);
    if (period === get().dataFetchedForPeriod && !get().goalsLoading && !get().potentialRisksLoading && !get().riskCausesLoading && !get().controlMeasuresLoading) {
      console.log(`[AppStore] Data for period ${period} already fetched. Skipping.`);
      return;
    }
    console.log(`[AppStore] Setting dataFetchedForPeriod to ${period} and initiating fetch chain.`);
    set({ 
      dataFetchedForPeriod: period, 
      goalsLoading: true, 
      potentialRisksLoading: true, 
      riskCausesLoading: true, 
      controlMeasuresLoading: true,
      monitoringSessionsLoading: true,
      riskExposuresLoading: false, // Risk Exposures are fetched per session, not initially
    });
    try {
      await get().fetchGoals(userId, period); // This will chain other main data fetches
      await get().fetchMonitoringSessions(userId, period); // Fetch monitoring sessions
    } catch (error) {
      console.error("[AppStore] Error during triggerInitialDataFetch:", error);
      // Ensure loading flags are reset if the initial chain fails
      set({
        goalsLoading: false,
        potentialRisksLoading: false,
        riskCausesLoading: false,
        controlMeasuresLoading: false,
        monitoringSessionsLoading: false,
        dataFetchedForPeriod: null, // Reset so it can be tried again
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
      console.warn("[AppStore] fetchGoals: userId or period is missing. Clearing goals.");
      set({ goals: [], goalsLoading: false, potentialRisks: [], potentialRisksLoading: false, riskCauses: [], riskCausesLoading: false, controlMeasures: [], controlMeasuresLoading: false });
      return;
    }
    console.log(`[AppStore] fetchGoals: Fetching for userId: ${userId}, period: ${period}`);
    set({ goalsLoading: true });
    try {
      const result = await fetchGoalsFromService(userId, period);
      if (result.success && result.goals) {
        const sortedGoals = result.goals.sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' }));
        set({ goals: sortedGoals });
        console.log(`[AppStore] fetchGoals: Successfully fetched ${sortedGoals.length} goals. Triggering fetchPotentialRisks.`);
        await get().fetchPotentialRisks(userId, period);
      } else {
        console.error("[AppStore] fetchGoals: Failed to load goals:", result.message);
        set({ goals: [], potentialRisks: [], riskCauses: [], controlMeasures: [], dataFetchedForPeriod: null }); // Reset related data and fetch trigger
      }
    } catch (error: any) {
      console.error("[AppStore] fetchGoals: Fatal error:", error.message);
      set({ goals: [], potentialRisks: [], riskCauses: [], controlMeasures: [], dataFetchedForPeriod: null });
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
    } catch (error) {
      console.error("[AppStore] addGoal: Failed:", error);
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
    } catch (error) {
      console.error("[AppStore] updateGoal: Failed:", error);
      throw error;
    }
  },
  deleteGoal: async (goalId, userId, period) => {
    try {
      await deleteGoalFromService(goalId, userId, period); // Service handles Firestore deletion including sub-collections
      set(state => ({
        goals: state.goals.filter(g => g.id !== goalId),
        potentialRisks: state.potentialRisks.filter(pr => pr.goalId !== goalId),
        riskCauses: state.riskCauses.filter(rc => rc.goalId !== goalId),
        controlMeasures: state.controlMeasures.filter(cm => cm.goalId !== goalId),
      }));
    } catch (error) {
      console.error("[AppStore] deleteGoal: Failed:", error);
      throw error;
    }
  },
  getGoalById: async (id, userId, period) => {
    const goalFromStore = get().goals.find(g => g.id === id && g.userId === userId && g.period === period);
    if (goalFromStore) return goalFromStore;
    return getGoalByIdFromService(id, userId, period);
  },

  // --- PotentialRisks State and Actions ---
  potentialRisks: [],
  potentialRisksLoading: false,
  fetchPotentialRisks: async (userId, period) => {
    if (!userId || !period) {
      set({ potentialRisks: [], potentialRisksLoading: false, riskCauses: [], riskCausesLoading: false, controlMeasures: [], controlMeasuresLoading: false });
      return;
    }
    console.log(`[AppStore] fetchPotentialRisks: Fetching for userId: ${userId}, period: ${period}`);
    set({ potentialRisksLoading: true });
    try {
      const currentGoals = get().goals;
      if (currentGoals.length === 0 && !get().goalsLoading) {
        console.warn("[AppStore] fetchPotentialRisks: No goals loaded, cannot fetch potential risks directly. Goals should trigger this.");
        set({ potentialRisks: [], riskCauses: [], controlMeasures: [], potentialRisksLoading: false, riskCausesLoading: false, controlMeasuresLoading: false, dataFetchedForPeriod: null });
        return;
      }
      let allPRs: PotentialRisk[] = [];
      for (const goal of currentGoals) {
        if (goal.userId === userId && goal.period === period) { // Ensure goal matches current context
          const prsForGoal = await fetchPotentialRisksByGoalIdFromService(goal.id, userId, period);
          allPRs.push(...prsForGoal);
        }
      }
      const sortedPRs = allPRs.sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0) || a.description.localeCompare(b.description));
      set({ potentialRisks: sortedPRs });
      console.log(`[AppStore] fetchPotentialRisks: Successfully fetched ${sortedPRs.length} potential risks. Triggering fetchRiskCauses.`);
      await get().fetchRiskCauses(userId, period);
    } catch (error: any) {
      console.error("[AppStore] fetchPotentialRisks: Failed:", error.message);
      set({ potentialRisks: [], riskCauses: [], controlMeasures: [], dataFetchedForPeriod: null });
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
    } catch (error) {
      console.error("[AppStore] addPotentialRisk: Failed:", error);
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
    } catch (error) {
      console.error("[AppStore] updatePotentialRisk: Failed:", error);
      throw error;
    }
  },
  deletePotentialRisk: async (potentialRiskId, userId, period) => {
    try {
      await deletePotentialRiskFromService(potentialRiskId, userId, period); // Service handles Firestore deletion
      set(state => ({
        potentialRisks: state.potentialRisks.filter(pr => pr.id !== potentialRiskId),
        riskCauses: state.riskCauses.filter(rc => rc.potentialRiskId !== potentialRiskId),
        controlMeasures: state.controlMeasures.filter(cm => cm.potentialRiskId !== potentialRiskId),
      }));
    } catch (error) {
      console.error("[AppStore] deletePotentialRisk: Failed:", error);
      throw error;
    }
  },
  getPotentialRiskById: async (id, userId, period) => {
    const riskFromStore = get().potentialRisks.find(pr => pr.id === id && pr.userId === userId && pr.period === period);
    if (riskFromStore) return riskFromStore;
    return getPotentialRiskByIdFromService(id, userId, period);
  },

  // --- RiskCauses State and Actions ---
  riskCauses: [],
  riskCausesLoading: false,
  fetchRiskCauses: async (userId, period) => {
    if (!userId || !period) {
      set({ riskCauses: [], riskCausesLoading: false, controlMeasures: [], controlMeasuresLoading: false });
      return;
    }
    console.log(`[AppStore] fetchRiskCauses: Fetching for userId: ${userId}, period: ${period}`);
    set({ riskCausesLoading: true });
    try {
      const currentPotentialRisks = get().potentialRisks;
      if (currentPotentialRisks.length === 0 && !get().potentialRisksLoading) {
        console.warn("[AppStore] fetchRiskCauses: No potential risks loaded, cannot fetch risk causes directly. PotentialRisks should trigger this.");
        set({ riskCauses: [], controlMeasures: [], riskCausesLoading: false, controlMeasuresLoading: false, dataFetchedForPeriod: null });
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
      console.log(`[AppStore] fetchRiskCauses: Successfully fetched ${sortedRCs.length} risk causes. Triggering fetchControlMeasures.`);
      await get().fetchControlMeasures(userId, period);
    } catch (error: any) {
      console.error("[AppStore] fetchRiskCauses: Failed:", error.message);
      set({ riskCauses: [], controlMeasures: [], dataFetchedForPeriod: null });
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
    } catch (error) {
      console.error("[AppStore] addRiskCause: Failed:", error);
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
    } catch (error) {
      console.error("[AppStore] updateRiskCause: Failed:", error);
      throw error;
    }
  },
  deleteRiskCause: async (riskCauseId, userId, period) => {
    try {
      await deleteRiskCauseFromService(riskCauseId, userId, period); // Service handles Firestore deletion including sub-collections
      set(state => ({
        riskCauses: state.riskCauses.filter(rc => rc.id !== riskCauseId),
        controlMeasures: state.controlMeasures.filter(cm => cm.riskCauseId !== riskCauseId),
      }));
    } catch (error) {
      console.error("[AppStore] deleteRiskCause: Failed:", error);
      throw error;
    }
  },
  getRiskCauseById: async (id, userId, period) => {
    const causeFromStore = get().riskCauses.find(rc => rc.id === id && rc.userId === userId && rc.period === period);
    if (causeFromStore) return causeFromStore;
    return getRiskCauseByIdFromService(id, userId, period);
  },

  // --- ControlMeasures State and Actions ---
  controlMeasures: [],
  controlMeasuresLoading: false,
  fetchControlMeasures: async (userId, period) => {
    if (!userId || !period) {
      set({ controlMeasures: [], controlMeasuresLoading: false });
      return;
    }
    console.log(`[AppStore] fetchControlMeasures: Fetching for userId: ${userId}, period: ${period}`);
    set({ controlMeasuresLoading: true });
    try {
      const currentRiskCauses = get().riskCauses;
      if (currentRiskCauses.length === 0 && !get().riskCausesLoading) {
        console.warn("[AppStore] fetchControlMeasures: No risk causes loaded, cannot fetch control measures directly. RiskCauses should trigger this.");
        set({ controlMeasures: [], controlMeasuresLoading: false, dataFetchedForPeriod: null });
        return;
      }
      let allCMs: ControlMeasure[] = [];
      for (const riskCause of currentRiskCauses) {
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
      console.log(`[AppStore] fetchControlMeasures: Successfully fetched ${sortedCMs.length} control measures. All main data entities loaded for period ${period}.`);
      // This is the end of the main data loading chain
      set({ dataFetchedForPeriod: period });
    } catch (error: any) {
      console.error("[AppStore] fetchControlMeasures: Failed:", error.message);
      set({ controlMeasures: [], dataFetchedForPeriod: null });
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
    } catch (error) {
      console.error("[AppStore] addControlMeasure: Failed:", error);
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
    } catch (error) {
      console.error("[AppStore] updateControlMeasure: Failed:", error);
      throw error;
    }
  },
  deleteControlMeasure: async (controlMeasureId, userId, period) => {
    try {
      await deleteControlMeasureFromService(controlMeasureId);
      set(state => ({
        controlMeasures: state.controlMeasures.filter(cm => cm.id !== controlMeasureId),
      }));
    } catch (error) {
      console.error("[AppStore] deleteControlMeasure: Failed:", error);
      throw error;
    }
  },
  getControlMeasureById: async (id, userId, period) => {
    const cmFromStore = get().controlMeasures.find(cm => cm.id === id && cm.userId === userId && cm.period === period);
    if (cmFromStore) return cmFromStore;
    return getControlMeasureByIdFromService(id, userId, period);
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
    console.log(`[AppStore] fetchMonitoringSessions: Fetching for userId: ${userId}, period: ${period}`);
    set({ monitoringSessionsLoading: true });
    try {
      const sessions = await fetchMonitoringSessionsFromService(userId, period);
      set({ monitoringSessions: sessions.sort((a,b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()), monitoringSessionsLoading: false });
    } catch (error) {
      console.error("[AppStore] fetchMonitoringSessions: Failed:", error);
      set({ monitoringSessions: [], monitoringSessionsLoading: false });
    }
  },
  addMonitoringSessionToState: (session) => {
    set(state => ({
      monitoringSessions: [...state.monitoringSessions, session].sort((a,b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())
    }));
  },
  fetchCurrentMonitoringSession: async (sessionId, userId, period) => { // period is app's active period
    if (!sessionId || !userId || !period) {
      set({ currentMonitoringSession: null, currentMonitoringSessionLoading: false, riskExposures: [] });
      return;
    }
    console.log(`[AppStore] fetchCurrentMonitoringSession: Fetching session ${sessionId} for user ${userId}, appPeriod ${period}`);
    set({ currentMonitoringSessionLoading: true, riskExposuresLoading: true });
    try {
      const session = await getMonitoringSessionByIdFromService(sessionId, userId, period);
      set({ currentMonitoringSession: session });
      if (session) {
        console.log(`[AppStore] fetchCurrentMonitoringSession: Session found. Triggering fetchRiskExposuresForSession for session period ${session.period}.`);
        // Pass session.period which is the period context of the session itself
        await get().fetchRiskExposuresForSession(sessionId, userId, session.period); 
      } else {
        console.warn(`[AppStore] fetchCurrentMonitoringSession: Session ${sessionId} not found.`);
        set({ riskExposures: [], riskExposuresLoading: false });
      }
    } catch (error) {
      console.error(`[AppStore] fetchCurrentMonitoringSession (ID: ${sessionId}): Failed:`, error);
      set({ currentMonitoringSession: null, riskExposures: [], riskExposuresLoading: false });
    } finally {
      set({ currentMonitoringSessionLoading: false });
    }
  },
  fetchRiskExposuresForSession: async (monitoringSessionId, userId, sessionPeriod) => { // Renamed period to sessionPeriod for clarity
    if (!monitoringSessionId || !userId || !sessionPeriod) {
      set({ riskExposures: [], riskExposuresLoading: false });
      return;
    }
    console.log(`[AppStore] fetchRiskExposuresForSession: Fetching exposures for session ${monitoringSessionId}, user ${userId}, sessionPeriod ${sessionPeriod}`);
    set({ riskExposuresLoading: true });
    try {
      const exposures = await fetchRiskExposuresBySessionFromService(monitoringSessionId, userId, sessionPeriod);
      set({ riskExposures: exposures, riskExposuresLoading: false });
      console.log(`[AppStore] fetchRiskExposuresForSession: Fetched ${exposures.length} exposures.`);
    } catch (error) {
      console.error(`[AppStore] fetchRiskExposuresForSession (SessionID: ${monitoringSessionId}): Failed:`, error);
      set({ riskExposures: [], riskExposuresLoading: false });
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
      }); // Corrected: removed extraneous closing parenthesis
      return upsertedExposureFromService;
    } catch (error) {
      console.error(`[AppStore] upsertRiskExposureInState (CauseID: ${exposureData.riskCauseId}): Failed:`, error);
      if (get().currentMonitoringSession) {
        await get().fetchRiskExposuresForSession(get().currentMonitoringSession!.id, exposureData.userId, exposureData.period);
      }
      throw error;
    }
  },
}));

// Function to be called from AuthContext or AppLayout when user context changes
export const triggerInitialDataFetch = (userId: string, period: string) => {
  const store = useAppStore.getState();
  console.log(`[Global] triggerInitialDataFetch called for user: ${userId}, period: ${period}. Current dataFetchedForPeriod: ${store.dataFetchedForPeriod}`);
  if (userId && period) {
    store.triggerInitialDataFetch(userId, period);
  } else {
    console.warn("[Global] triggerInitialDataFetch: userId or period is missing. Skipping initial data fetch.");
    store.resetAllData();
  }
};

    