
"use client";

import { create } from 'zustand';
import type { Goal, PotentialRisk, RiskCause, ControlMeasure, MonitoringSession, RiskExposure } from '@/lib/types';
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
  currentMonitoringSession: MonitoringSession | null; // Untuk sesi yang sedang aktif di halaman conduct
  currentMonitoringSessionLoading: boolean;
  riskExposures: RiskExposure[]; // Paparan risiko untuk sesi saat ini
  riskExposuresLoading: boolean;
  fetchMonitoringSessions: (userId: string, period: string) => Promise<void>;
  fetchCurrentMonitoringSession: (sessionId: string, userId: string, period: string) => Promise<void>;
  fetchRiskExposuresForSession: (monitoringSessionId: string, userId: string, period: string) => Promise<void>;
  addMonitoringSessionToState: (session: MonitoringSession) => void;
  upsertRiskExposureInState: (exposure: RiskExposure) => Promise<void>;
}


type AppState = GoalState & PotentialRiskState & RiskCauseState & ControlMeasureState & MonitoringState;

export const useAppStore = create<AppState>((set, get) => ({
  // --- Goals State and Actions ---
  goals: [],
  goalsLoading: false,
  fetchGoals: async (userId, period) => {
    if (!userId || !period) {
      console.warn("[AppStore] fetchGoals: userId or period is missing. Clearing goals.");
      set({ goals: [], goalsLoading: false, potentialRisks: [], potentialRisksLoading: false, riskCauses: [], riskCausesLoading: false, controlMeasures: [], controlMeasuresLoading: false });
      return;
    }
    set({ goalsLoading: true });
    try {
      const result = await fetchGoalsFromService(userId, period);
      if (result.success && result.goals) {
        const sortedGoals = result.goals.sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' }));
        set({ goals: sortedGoals });
        console.log(`[AppStore] fetchGoals: Successfully fetched ${sortedGoals.length} goals. Triggering fetchPotentialRisks.`);
        await get().fetchPotentialRisks(userId, period); // Chain fetching
      } else {
        console.error("[AppStore] fetchGoals: Failed to load goals:", result.message);
        set({ goals: [], potentialRisks: [], riskCauses: [], controlMeasures: [], goalsLoading: false, potentialRisksLoading: false, riskCausesLoading: false, controlMeasuresLoading: false });
      }
    } catch (error: any) {
      console.error("[AppStore] fetchGoals: Fatal error:", error.message);
      set({ goals: [], potentialRisks: [], riskCauses: [], controlMeasures: [], goalsLoading: false, potentialRisksLoading: false, riskCausesLoading: false, controlMeasuresLoading: false });
    } finally {
      // set({ goalsLoading: false }); // Loading for dependent data will handle overall loading state
    }
  },
  addGoal: async (goalData, userId, period) => {
    set({ goalsLoading: true });
    try {
      const newGoal = await addGoalToService(goalData, userId, period);
      if (newGoal) {
        set(state => ({
          goals: [...state.goals, newGoal].sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' }))
        }));
      }
      return newGoal;
    } catch (error) {
      console.error("[AppStore] addGoal: Failed:", error);
      throw error;
    } finally {
      set({ goalsLoading: false });
    }
  },
  updateGoal: async (goalId, updatedData) => {
    set({ goalsLoading: true });
    try {
      // Assuming updateGoalInService fetches the updated goal from Firestore including timestamps
      const serviceUpdatedGoal = await updateGoalInService(goalId, updatedData);
      if (serviceUpdatedGoal) {
        set(state => ({
          goals: state.goals.map(g => g.id === goalId ? serviceUpdatedGoal : g).sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' }))
        }));
        return serviceUpdatedGoal;
      }
      return null;
    } catch (error) {
      console.error("[AppStore] updateGoal: Failed:", error);
      throw error;
    } finally {
      set({ goalsLoading: false });
    }
  },
  deleteGoal: async (goalId, userId, period) => {
    set({ goalsLoading: true, potentialRisksLoading: true, riskCausesLoading: true, controlMeasuresLoading: true });
    try {
      await deleteGoalFromService(goalId, userId, period); // This service should handle cascading delete in Firestore
      set(state => ({
        goals: state.goals.filter(g => g.id !== goalId),
        potentialRisks: state.potentialRisks.filter(pr => pr.goalId !== goalId),
        riskCauses: state.riskCauses.filter(rc => rc.goalId !== goalId),
        controlMeasures: state.controlMeasures.filter(cm => cm.goalId !== goalId),
      }));
    } catch (error) {
      console.error("[AppStore] deleteGoal: Failed:", error);
      throw error;
    } finally {
      set({ goalsLoading: false, potentialRisksLoading: false, riskCausesLoading: false, controlMeasuresLoading: false });
    }
  },
  getGoalById: async (id, userId, period) => {
    const goalFromStore = get().goals.find(g => g.id === id && g.userId === userId && g.period === period);
    if (goalFromStore) return goalFromStore;
    // If not in store, fetch from service (could happen if navigating directly to a detail page)
    // This might indicate a need to pre-fetch more broadly or adjust initial loading logic
    console.warn(`[AppStore] getGoalById: Goal ${id} not found in store, fetching from service.`);
    return getGoalByIdFromService(id, userId, period);
  },

  // --- PotentialRisks State and Actions ---
  potentialRisks: [],
  potentialRisksLoading: false,
  fetchPotentialRisks: async (userId, period) => {
    if (!userId || !period) {
      console.warn("[AppStore] fetchPotentialRisks: userId or period is missing. Clearing potentialRisks.");
      set({ potentialRisks: [], potentialRisksLoading: false, riskCauses: [], riskCausesLoading: false, controlMeasures: [], controlMeasuresLoading: false });
      return;
    }
    set({ potentialRisksLoading: true });
    try {
      const currentGoals = get().goals;
      if (currentGoals.length === 0 && !get().goalsLoading) {
        console.warn("[AppStore] fetchPotentialRisks: No goals loaded, cannot fetch potential risks. Consider calling fetchGoals first or ensuring it completed.");
        set({ potentialRisks: [], potentialRisksLoading: false, riskCauses: [], riskCausesLoading: false, controlMeasures: [], controlMeasuresLoading: false });
        return;
      }
      let allPRs: PotentialRisk[] = [];
      for (const goal of currentGoals) { // Use currentGoals from store
        if (goal.userId === userId && goal.period === period) {
          const prsForGoal = await fetchPotentialRisksByGoalIdFromService(goal.id, userId, period);
          allPRs.push(...prsForGoal);
        }
      }
      const sortedPRs = allPRs.sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0) || a.description.localeCompare(b.description));
      set({ potentialRisks: sortedPRs });
      console.log(`[AppStore] fetchPotentialRisks: Successfully fetched ${sortedPRs.length} potential risks. Triggering fetchRiskCauses.`);
      await get().fetchRiskCauses(userId, period);
    } catch (error) {
      console.error("[AppStore] fetchPotentialRisks: Failed:", error);
      set({ potentialRisks: [], riskCauses: [], controlMeasures: [], potentialRisksLoading: false, riskCausesLoading: false, controlMeasuresLoading: false });
    } finally {
      // set({ potentialRisksLoading: false });
    }
  },
  addPotentialRisk: async (data, goalId, userId, period, sequenceNumber) => {
    set({ potentialRisksLoading: true });
    try {
      const newPotentialRisk = await addPotentialRiskToService(data, goalId, userId, period, sequenceNumber);
      if (newPotentialRisk) {
        set(state => ({
          potentialRisks: [...state.potentialRisks, newPotentialRisk].sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0) || a.description.localeCompare(b.description))
        }));
      }
      return newPotentialRisk;
    } catch (error) {
      console.error("[AppStore] addPotentialRisk: Failed:", error);
      throw error;
    } finally {
      set({ potentialRisksLoading: false });
    }
  },
  updatePotentialRisk: async (potentialRiskId, updatedData) => {
     set({ potentialRisksLoading: true });
    try {
      const updatedPR = await updatePotentialRiskInService(potentialRiskId, updatedData);
      if (updatedPR) {
        set(state => ({
          potentialRisks: state.potentialRisks.map(pr => pr.id === potentialRiskId ? updatedPR : pr)
                                              .sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0) || a.description.localeCompare(b.description))
        }));
      }
      return updatedPR;
    } catch (error) {
      console.error("[AppStore] updatePotentialRisk: Failed:", error);
      throw error;
    } finally {
      set({ potentialRisksLoading: false });
    }
  },
  deletePotentialRisk: async (potentialRiskId, userId, period) => {
    set({ potentialRisksLoading: true, riskCausesLoading: true, controlMeasuresLoading: true });
    try {
      await deletePotentialRiskFromService(potentialRiskId, userId, period); // Service handles cascading delete in Firestore
      set(state => ({
        potentialRisks: state.potentialRisks.filter(pr => pr.id !== potentialRiskId),
        riskCauses: state.riskCauses.filter(rc => rc.potentialRiskId !== potentialRiskId),
        controlMeasures: state.controlMeasures.filter(cm => cm.potentialRiskId !== potentialRiskId),
      }));
    } catch (error) {
      console.error("[AppStore] deletePotentialRisk: Failed:", error);
      throw error;
    } finally {
      set({ potentialRisksLoading: false, riskCausesLoading: false, controlMeasuresLoading: false });
    }
  },
  getPotentialRiskById: async (id, userId, period) => {
    const riskFromStore = get().potentialRisks.find(pr => pr.id === id && pr.userId === userId && pr.period === period);
    if (riskFromStore) return riskFromStore;
    console.warn(`[AppStore] getPotentialRiskById: PotentialRisk ${id} not found in store, fetching from service.`);
    return getPotentialRiskByIdFromService(id, userId, period);
  },

  // --- RiskCauses State and Actions ---
  riskCauses: [],
  riskCausesLoading: false,
  fetchRiskCauses: async (userId, period) => {
    if (!userId || !period) {
      console.warn("[AppStore] fetchRiskCauses: userId or period is missing. Clearing riskCauses.");
      set({ riskCauses: [], riskCausesLoading: false, controlMeasures: [], controlMeasuresLoading: false });
      return;
    }
    set({ riskCausesLoading: true });
    try {
      const currentPotentialRisks = get().potentialRisks;
       if (currentPotentialRisks.length === 0 && !get().potentialRisksLoading) {
        console.warn("[AppStore] fetchRiskCauses: No potential risks loaded, cannot fetch risk causes. Consider calling fetchPotentialRisks first or ensuring it completed.");
        set({ riskCauses: [], riskCausesLoading: false, controlMeasures: [], controlMeasuresLoading: false });
        return;
      }
      let allRCs: RiskCause[] = [];
      for (const pRisk of currentPotentialRisks) { // Use currentPotentialRisks from store
        if (pRisk.userId === userId && pRisk.period === period) {
          const rcsForPR = await fetchRiskCausesByPotentialRiskIdFromService(pRisk.id, userId, period);
          allRCs.push(...rcsForPR);
        }
      }
      const sortedRCs = allRCs.sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0) || a.description.localeCompare(b.description));
      set({ riskCauses: sortedRCs });
      console.log(`[AppStore] fetchRiskCauses: Successfully fetched ${sortedRCs.length} risk causes. Triggering fetchControlMeasures.`);
      await get().fetchControlMeasures(userId, period);
    } catch (error) {
      console.error("[AppStore] fetchRiskCauses: Failed:", error);
      set({ riskCauses: [], controlMeasures: [], riskCausesLoading: false, controlMeasuresLoading: false });
    } finally {
      // set({ riskCausesLoading: false });
    }
  },
  addRiskCause: async (data, potentialRiskId, goalId, userId, period, sequenceNumber) => {
    set({ riskCausesLoading: true });
    try {
      const newRiskCause = await addRiskCauseToService(data, potentialRiskId, goalId, userId, period, sequenceNumber);
      if (newRiskCause) {
        set(state => ({
          riskCauses: [...state.riskCauses, newRiskCause].sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0) || a.description.localeCompare(b.description))
        }));
      }
      return newRiskCause;
    } catch (error) {
      console.error("[AppStore] addRiskCause: Failed:", error);
      throw error;
    } finally {
      set({ riskCausesLoading: false });
    }
  },
  updateRiskCause: async (riskCauseId, updatedData) => {
    set({ riskCausesLoading: true });
    try {
      const updatedRC = await updateRiskCauseInService(riskCauseId, updatedData);
      if (updatedRC) {
        set(state => ({
          riskCauses: state.riskCauses.map(rc => rc.id === riskCauseId ? updatedRC : rc)
                                      .sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0) || a.description.localeCompare(b.description))
        }));
      }
      return updatedRC;
    } catch (error) {
      console.error("[AppStore] updateRiskCause: Failed:", error);
      throw error;
    } finally {
      set({ riskCausesLoading: false });
    }
  },
  deleteRiskCause: async (riskCauseId, userId, period) => {
    set({ riskCausesLoading: true, controlMeasuresLoading: true });
    try {
      await deleteRiskCauseFromService(riskCauseId, userId, period); // Service handles cascading delete of controls in Firestore
      set(state => ({
        riskCauses: state.riskCauses.filter(rc => rc.id !== riskCauseId),
        controlMeasures: state.controlMeasures.filter(cm => cm.riskCauseId !== riskCauseId),
      }));
    } catch (error) {
      console.error("[AppStore] deleteRiskCause: Failed:", error);
      throw error;
    } finally {
      set({ riskCausesLoading: false, controlMeasuresLoading: false });
    }
  },
  getRiskCauseById: async (id, userId, period) => {
    const causeFromStore = get().riskCauses.find(rc => rc.id === id && rc.userId === userId && rc.period === period);
    if (causeFromStore) return causeFromStore;
    console.warn(`[AppStore] getRiskCauseById: RiskCause ${id} not found in store, fetching from service.`);
    return getRiskCauseByIdFromService(id, userId, period);
  },

  // --- ControlMeasures State and Actions ---
  controlMeasures: [],
  controlMeasuresLoading: false,
  fetchControlMeasures: async (userId, period) => {
    if (!userId || !period) {
      console.warn("[AppStore] fetchControlMeasures: userId or period is missing. Clearing controlMeasures.");
      set({ controlMeasures: [], controlMeasuresLoading: false });
      return;
    }
    set({ controlMeasuresLoading: true });
    try {
      const currentRiskCauses = get().riskCauses;
      if (currentRiskCauses.length === 0 && !get().riskCausesLoading) {
        console.warn("[AppStore] fetchControlMeasures: No risk causes loaded, cannot fetch control measures. Consider calling fetchRiskCauses first or ensuring it completed.");
        set({ controlMeasures: [], controlMeasuresLoading: false });
        return;
      }
      let allCMs: ControlMeasure[] = [];
      for (const riskCause of currentRiskCauses) { // Use currentRiskCauses from store
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
      console.log(`[AppStore] fetchControlMeasures: Successfully fetched ${sortedCMs.length} control measures.`);
    } catch (error) {
      console.error("[AppStore] fetchControlMeasures: Failed:", error);
      set({ controlMeasures: [] });
    } finally {
      set({ controlMeasuresLoading: false });
    }
  },
  addControlMeasure: async (data, riskCauseId, potentialRiskId, goalId, userId, period, sequenceNumber) => {
    set({ controlMeasuresLoading: true });
    try {
      const newCM = await addControlMeasureToService(data, riskCauseId, potentialRiskId, goalId, userId, period, sequenceNumber);
      if (newCM) {
        set(state => ({
          controlMeasures: [...state.controlMeasures, newCM].sort((a, b) => 
            (CONTROL_MEASURE_TYPE_KEYS.indexOf(a.controlType) - CONTROL_MEASURE_TYPE_KEYS.indexOf(b.controlType)) || 
            (a.sequenceNumber - b.sequenceNumber)
          )
        }));
      }
      return newCM;
    } catch (error) {
      console.error("[AppStore] addControlMeasure: Failed:", error);
      throw error;
    } finally {
      set({ controlMeasuresLoading: false });
    }
  },
  updateControlMeasure: async (controlMeasureId, updatedData) => {
    set({ controlMeasuresLoading: true });
    try {
      const updatedCM = await updateControlMeasureInService(controlMeasureId, updatedData);
      if (updatedCM) {
        set(state => ({
          controlMeasures: state.controlMeasures.map(cm => cm.id === controlMeasureId ? updatedCM : cm)
                                              .sort((a, b) => 
                                                (CONTROL_MEASURE_TYPE_KEYS.indexOf(a.controlType) - CONTROL_MEASURE_TYPE_KEYS.indexOf(b.controlType)) || 
                                                (a.sequenceNumber - b.sequenceNumber)
                                              )
        }));
      }
      return updatedCM;
    } catch (error) {
      console.error("[AppStore] updateControlMeasure: Failed:", error);
      throw error;
    } finally {
      set({ controlMeasuresLoading: false });
    }
  },
  deleteControlMeasure: async (controlMeasureId, userId, period) => {
    set({ controlMeasuresLoading: true });
    try {
      await deleteControlMeasureFromService(controlMeasureId); 
      set(state => ({
        controlMeasures: state.controlMeasures.filter(cm => cm.id !== controlMeasureId)
      }));
    } catch (error) {
      console.error("[AppStore] deleteControlMeasure: Failed:", error);
      throw error;
    } finally {
      set({ controlMeasuresLoading: false });
    }
  },
  getControlMeasureById: async (id, userId, period) => {
    const cmFromStore = get().controlMeasures.find(cm => cm.id === id && cm.userId === userId && cm.period === period);
    if (cmFromStore) return cmFromStore;
    console.warn(`[AppStore] getControlMeasureById: ControlMeasure ${id} not found in store, fetching from service.`);
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
    set({ monitoringSessionsLoading: true });
    try {
      const sessions = await fetchMonitoringSessionsFromService(userId, period);
      set({ monitoringSessions: sessions.sort((a,b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()) });
    } catch (error) {
      console.error("[AppStore] fetchMonitoringSessions: Failed:", error);
      set({ monitoringSessions: [] });
    } finally {
      set({ monitoringSessionsLoading: false });
    }
  },
  addMonitoringSessionToState: (session) => { // Called after service call
    set(state => ({
      monitoringSessions: [...state.monitoringSessions, session].sort((a,b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())
    }));
  },
  fetchCurrentMonitoringSession: async (sessionId, userId, period) => {
    if (!sessionId || !userId || !period) {
      set({ currentMonitoringSession: null, currentMonitoringSessionLoading: false });
      return;
    }
    set({ currentMonitoringSessionLoading: true });
    try {
      const session = await getMonitoringSessionByIdFromService(sessionId, userId, period);
      set({ currentMonitoringSession: session });
      if (session) {
        await get().fetchRiskExposuresForSession(sessionId, userId, period);
      } else {
        set({ riskExposures: [] }); // Clear exposures if session not found
      }
    } catch (error) {
      console.error(`[AppStore] fetchCurrentMonitoringSession (ID: ${sessionId}): Failed:`, error);
      set({ currentMonitoringSession: null, riskExposures: [] });
    } finally {
      set({ currentMonitoringSessionLoading: false });
    }
  },
  fetchRiskExposuresForSession: async (monitoringSessionId, userId, period) => {
    if (!monitoringSessionId || !userId || !period) {
      set({ riskExposures: [], riskExposuresLoading: false });
      return;
    }
    set({ riskExposuresLoading: true });
    try {
      const exposures = await fetchRiskExposuresBySessionFromService(monitoringSessionId, userId, period);
      set({ riskExposures: exposures });
    } catch (error) {
      console.error(`[AppStore] fetchRiskExposuresForSession (SessionID: ${monitoringSessionId}): Failed:`, error);
      set({ riskExposures: [] });
    } finally {
      set({ riskExposuresLoading: false });
    }
  },
  upsertRiskExposureInState: async (exposureData: Omit<RiskExposure, 'id' | 'recordedAt' | 'updatedAt'>) => {
    set(state => ({
      riskExposures: state.riskExposures.map(re => 
        (re.riskCauseId === exposureData.riskCauseId && re.monitoringSessionId === exposureData.monitoringSessionId) 
        ? { ...re, ...exposureData, updatedAt: new Date().toISOString() } // Optimistic update
        : re
      )
    }));
    try {
      const upsertedExposure = await upsertRiskExposureToService(exposureData);
      // Re-sync with server data (especially for timestamps)
      set(state => ({
        riskExposures: state.riskExposures.map(re => 
          (re.riskCauseId === upsertedExposure.riskCauseId && re.monitoringSessionId === upsertedExposure.monitoringSessionId) 
          ? upsertedExposure 
          : re
        )
      }));
    } catch (error) {
      console.error(`[AppStore] upsertRiskExposureInState (CauseID: ${exposureData.riskCauseId}): Failed:`, error);
      // TODO: Revert optimistic update or show error
      throw error;
    }
  },


}));


export const triggerInitialDataFetch = (userId: string, period: string) => {
  if (userId && period) {
    console.log(`[AppStore] triggerInitialDataFetch called for user: ${userId}, period: ${period}`);
    const store = useAppStore.getState();
    store.fetchGoals(userId, period)
      .then(() => {
        console.log("[AppStore] Initial fetchGoals completed. Subsequent fetches for PR, RC, CM, MS will be chained.");
        // Chained fetches (PR, RC, CM) are handled inside fetchGoals's success path
        // Fetch Monitoring Sessions separately as it's not directly dependent on goals chain
        store.fetchMonitoringSessions(userId, period);
      })
      .catch(error => {
        console.error("[AppStore] Error during initial fetchGoals chain:", error);
      });
  } else {
    console.warn("[AppStore] triggerInitialDataFetch: userId or period is missing. Skipping initial data fetch.");
  }
};
