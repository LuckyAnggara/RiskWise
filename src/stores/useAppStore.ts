
"use client";

import { create } from 'zustand';
import type { Goal, PotentialRisk, RiskCause, ControlMeasure, AppUser } from '@/lib/types';
import { 
  addGoal as addGoalToService, 
  getGoals as fetchGoalsFromService, 
  updateGoal as updateGoalInService, 
  deleteGoal as deleteGoalFromService,
  type GoalsResult,
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
    updatedData: Partial<Omit<Goal, 'id' | 'userId' | 'period' | 'code' | 'createdAt' | 'updatedAt'>>,
    userId: string, // userId and period might be needed if service requires them for update context
    period: string
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
    updatedData: Partial<Omit<RiskCause, 'id' | 'potentialRiskId' | 'goalId' | 'userId' | 'period' | 'createdAt' | 'sequenceNumber' | 'analysisUpdatedAt'>>
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

type AppState = GoalState & PotentialRiskState & RiskCauseState & ControlMeasureState;

const CONTROL_MEASURE_TYPE_KEYS: ControlMeasureTypeKey[] = ['Prv', 'RM', 'Crr'];

export const useAppStore = create<AppState>((set, get) => ({
  // --- Goals State and Actions ---
  goals: [],
  goalsLoading: false, // Default to false, set to true when fetching
  fetchGoals: async (userId, period) => {
    if (!userId || !period) {
      set({ goals: [], goalsLoading: false, potentialRisks: [], potentialRisksLoading: false, riskCauses: [], riskCausesLoading: false, controlMeasures: [], controlMeasuresLoading: false });
      console.warn("[AppStore] fetchGoals: userId or period not provided.");
      return;
    }
    set({ goalsLoading: true });
    try {
      const result: GoalsResult = await fetchGoalsFromService(userId, period);
      if (result.success && result.goals) {
        const sortedGoals = result.goals.sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' }));
        set({ goals: sortedGoals });
        await get().fetchPotentialRisks(userId, period); // Chain fetching
      } else {
        set({ goals: [], potentialRisks: [], potentialRisksLoading: false, riskCauses: [], riskCausesLoading: false, controlMeasures: [], controlMeasuresLoading: false });
        console.error("[AppStore] fetchGoals: Failed to load goals:", result.message);
      }
    } catch (error: any) {
      console.error("[AppStore] fetchGoals: Fatal error:", error.message);
      set({ goals: [], potentialRisks: [], potentialRisksLoading: false, riskCauses: [], riskCausesLoading: false, controlMeasures: [], controlMeasuresLoading: false });
    } finally {
        set({ goalsLoading: false });
    }
  },
  addGoal: async (goalData, userId, period) => {
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
    }
  },
  updateGoal: async (goalId, updatedData, userId, period) => { // Added userId, period if service needs it
    try {
      // Assuming updateGoalInService is updated to return the full updated Goal object
      const updatedGoal = await updateGoalInService(goalId, updatedData); 
      if (updatedGoal) {
        set(state => ({
          goals: state.goals.map(g => g.id === goalId ? updatedGoal : g).sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' }))
        }));
      }
      return updatedGoal;
    } catch (error) {
      console.error("[AppStore] updateGoal: Failed:", error);
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
  potentialRisksLoading: false, // Default to false
  fetchPotentialRisks: async (userId, period) => {
    if (!userId || !period) {
      set({ potentialRisks: [], potentialRisksLoading: false, riskCauses: [], riskCausesLoading: false, controlMeasures: [], controlMeasuresLoading: false });
      return;
    }
    set({ potentialRisksLoading: true });
    try {
      const currentGoals = get().goals;
      if (currentGoals.length === 0) {
         console.log("[AppStore] fetchPotentialRisks: No goals found, skipping PR fetch.");
        set({ potentialRisks: [], riskCauses: [], riskCausesLoading: false, controlMeasures: [], controlMeasuresLoading: false });
        // No need to call fetchRiskCauses if there are no goals/potential risks
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
      await get().fetchRiskCauses(userId, period); // Chain fetching
    } catch (error) {
      console.error("[AppStore] fetchPotentialRisks: Failed:", error);
      set({ potentialRisks: [], riskCauses: [], riskCausesLoading: false, controlMeasures: [], controlMeasuresLoading: false });
    } finally {
        set({ potentialRisksLoading: false });
    }
  },
  addPotentialRisk: async (data, goalId, userId, period, sequenceNumber) => {
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
    }
  },
  updatePotentialRisk: async (potentialRiskId, updatedData) => {
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
  riskCausesLoading: false, // Default to false
  fetchRiskCauses: async (userId, period) => {
    if (!userId || !period) {
      set({ riskCauses: [], riskCausesLoading: false, controlMeasures: [], controlMeasuresLoading: false });
      return;
    }
    set({ riskCausesLoading: true });
    try {
      const currentPotentialRisks = get().potentialRisks;
      if (currentPotentialRisks.length === 0) {
        console.log("[AppStore] fetchRiskCauses: No potential risks found, skipping RC fetch.");
        set({ riskCauses: [], controlMeasures: [], controlMeasuresLoading: false });
        // No need to call fetchControlMeasures if there are no RCs
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
      await get().fetchControlMeasures(userId, period); // Chain fetching
    } catch (error) {
      console.error("[AppStore] fetchRiskCauses: Failed:", error);
      set({ riskCauses: [], controlMeasures: [], controlMeasuresLoading: false });
    } finally {
        set({ riskCausesLoading: false });
    }
  },
  addRiskCause: async (data, potentialRiskId, goalId, userId, period, sequenceNumber) => {
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
    }
  },
  updateRiskCause: async (riskCauseId, updatedData) => {
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
    }
  },
  deleteRiskCause: async (riskCauseId, userId, period) => {
    try {
      await deleteRiskCauseFromService(riskCauseId, userId, period);
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
  controlMeasuresLoading: false, // Default to false
  fetchControlMeasures: async (userId, period) => {
    if (!userId || !period) {
      set({ controlMeasures: [], controlMeasuresLoading: false });
      return;
    }
    set({ controlMeasuresLoading: true });
    try {
      const currentRiskCauses = get().riskCauses;
      if (currentRiskCauses.length === 0) {
        console.log("[AppStore] fetchControlMeasures: No risk causes found, skipping CM fetch.");
        set({ controlMeasures: [] });
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
    } catch (error) {
      console.error("[AppStore] fetchControlMeasures: Failed:", error);
      set({ controlMeasures: [] });
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
          )
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
                                              )
        }));
      }
      return updatedCM;
    } catch (error) {
      console.error("[AppStore] updateControlMeasure: Failed:", error);
      throw error;
    }
  },
  deleteControlMeasure: async (controlMeasureId, userId, period) => { // Added userId, period for potential future use in service
    try {
      await deleteControlMeasureFromService(controlMeasureId); 
      set(state => ({
        controlMeasures: state.controlMeasures.filter(cm => cm.id !== controlMeasureId)
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
}));

