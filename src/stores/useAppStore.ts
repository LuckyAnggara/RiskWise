
"use client";

import { create } from 'zustand';
import type { Goal, PotentialRisk, RiskCause, ControlMeasure, AppUser, RiskCauseAnalysisFormData } from '@/lib/types';
import { 
  addGoal as addGoalToService, 
  getGoals as fetchGoalsFromService, 
  updateGoal as updateGoalInService, 
  deleteGoal as deleteGoalFromService,
  type GoalsResult
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
// Import ControlMeasure services when ready

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

// interface ControlMeasureState { ... }

type AppState = GoalState & PotentialRiskState & RiskCauseState; // & ControlMeasureState;

export const useAppStore = create<AppState>((set, get) => ({
  // --- Goals State and Actions ---
  goals: [],
  goalsLoading: true,
  fetchGoals: async (userId, period) => {
    if (!userId || !period) {
      set({ goals: [], goalsLoading: false, potentialRisks: [], potentialRisksLoading: false, riskCauses: [], riskCausesLoading: false });
      console.warn("[AppStore] fetchGoals: userId or period not provided.");
      return;
    }
    set({ goalsLoading: true });
    try {
      const result: GoalsResult = await fetchGoalsFromService(userId, period);
      if (result.success && result.goals) {
        const sortedGoals = result.goals.sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' }));
        set({ goals: sortedGoals, goalsLoading: false });
        await get().fetchPotentialRisks(userId, period); // Fetch related potential risks
      } else {
        set({ goals: [], goalsLoading: false });
        console.error("[AppStore] fetchGoals: Failed to load goals:", result.message);
      }
    } catch (error: any) {
      console.error("[AppStore] fetchGoals: Fatal error:", error.message);
      set({ goals: [], goalsLoading: false });
    }
  },
  addGoal: async (goalData, userId, period) => {
    if (!userId || !period) {
      console.error("[AppStore] addGoal: userId or period not provided.");
      return null;
    }
    try {
      const newGoal = await addGoalToService(goalData, userId, period);
      if (newGoal) {
        set(state => ({
          goals: [...state.goals, newGoal].sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' }))
        }));
      }
      return newGoal;
    } catch (error: any) {
      console.error("[AppStore] addGoal: Failed to add goal:", error.message);
      throw error;
    }
  },
  updateGoal: async (goalId, updatedData) => {
    try {
      const updatedGoal = await updateGoalInService(goalId, updatedData);
      if (updatedGoal) {
        set(state => ({
          goals: state.goals.map(g => g.id === goalId ? updatedGoal : g).sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' }))
        }));
      }
      return updatedGoal;
    } catch (error: any) {
      console.error("[AppStore] updateGoal: Failed to update goal:", error.message);
      throw error;
    }
  },
  deleteGoal: async (goalId, userId, period) => {
    if (!userId || !period) {
      console.error("[AppStore] deleteGoal: userId or period not provided.");
      throw new Error("Konteks pengguna atau periode tidak valid.");
    }
    try {
      await deleteGoalFromService(goalId, userId, period); // Service already handles cascading delete in Firestore
      set(state => ({
        goals: state.goals.filter(g => g.id !== goalId),
        potentialRisks: state.potentialRisks.filter(pr => pr.goalId !== goalId),
        riskCauses: state.riskCauses.filter(rc => rc.goalId !== goalId),
        // TODO: Filter controlMeasures as well when integrated
      }));
    } catch (error: any) {
      console.error("[AppStore] deleteGoal: Failed to delete goal:", error.message);
      throw error;
    }
  },

  // --- PotentialRisks State and Actions ---
  potentialRisks: [],
  potentialRisksLoading: true,
  fetchPotentialRisks: async (userId, period) => {
    if (!userId || !period) {
      set({ potentialRisks: [], potentialRisksLoading: false, riskCauses: [], riskCausesLoading: false });
      console.warn("[AppStore] fetchPotentialRisks: userId or period not provided.");
      return;
    }
    set({ potentialRisksLoading: true });
    try {
      const currentGoals = get().goals; // Assume goals are already fetched or will be
      if (currentGoals.length === 0) {
        console.warn("[AppStore] fetchPotentialRisks: No goals loaded yet to fetch potential risks from.");
        set({ potentialRisks: [], potentialRisksLoading: false });
        await get().fetchRiskCauses(userId, period); // Still attempt to fetch causes if PRs are empty
        return;
      }
      
      let allPRs: PotentialRisk[] = [];
      for (const goal of currentGoals) {
        // Ensure we only fetch for goals matching the current user/period context
        if (goal.userId === userId && goal.period === period) { 
          const prsForGoal = await fetchPotentialRisksByGoalIdFromService(goal.id, userId, period);
          allPRs.push(...prsForGoal);
        }
      }
      const sortedPRs = allPRs.sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0) || a.description.localeCompare(b.description));
      set({ potentialRisks: sortedPRs, potentialRisksLoading: false });
      await get().fetchRiskCauses(userId, period); // Fetch related risk causes
    } catch (error: any) {
      console.error("[AppStore] fetchPotentialRisks: Failed to fetch potential risks:", error.message);
      set({ potentialRisks: [], potentialRisksLoading: false });
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
    } catch (error: any) {
      console.error("[AppStore] addPotentialRisk: Failed:", error.message);
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
    } catch (error: any) {
      console.error("[AppStore] updatePotentialRisk: Failed:", error.message);
      throw error;
    }
  },
  deletePotentialRisk: async (potentialRiskId, userId, period) => {
    try {
      await deletePotentialRiskFromService(potentialRiskId, userId, period); // Service handles Firestore cascading delete
      set(state => ({
        potentialRisks: state.potentialRisks.filter(pr => pr.id !== potentialRiskId),
        riskCauses: state.riskCauses.filter(rc => rc.potentialRiskId !== potentialRiskId),
        // TODO: Filter controlMeasures related to the causes of this potentialRisk
      }));
    } catch (error: any) {
      console.error("[AppStore] deletePotentialRisk: Failed:", error.message);
      throw error;
    }
  },
  getPotentialRiskById: async (id, userId, period) => {
    const riskFromStore = get().potentialRisks.find(pr => pr.id === id && pr.userId === userId && pr.period === period);
    if (riskFromStore) return riskFromStore;
    try {
      return await getPotentialRiskByIdFromService(id, userId, period);
    } catch (error: any) {
      console.error(`[AppStore] getPotentialRiskById: Failed to fetch PR ${id}:`, error.message);
      throw error;
    }
  },

  // --- RiskCauses State and Actions ---
  riskCauses: [],
  riskCausesLoading: true,
  fetchRiskCauses: async (userId, period) => {
    if (!userId || !period) {
      set({ riskCauses: [], riskCausesLoading: false });
      console.warn("[AppStore] fetchRiskCauses: userId or period not provided.");
      return;
    }
    set({ riskCausesLoading: true });
    try {
      const currentPotentialRisks = get().potentialRisks;
      if (currentPotentialRisks.length === 0) {
        console.warn("[AppStore] fetchRiskCauses: No potential risks loaded to fetch causes from.");
        set({ riskCauses: [], riskCausesLoading: false });
        return;
      }

      let allRCs: RiskCause[] = [];
      for (const pRisk of currentPotentialRisks) {
        // Ensure we only fetch for PRs matching the current user/period context
        if (pRisk.userId === userId && pRisk.period === period) {
          const rcsForPR = await fetchRiskCausesByPotentialRiskIdFromService(pRisk.id, userId, period);
          allRCs.push(...rcsForPR);
        }
      }
      const sortedRCs = allRCs.sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0) || a.description.localeCompare(b.description));
      set({ riskCauses: sortedRCs, riskCausesLoading: false });
    } catch (error: any) {
      console.error("[AppStore] fetchRiskCauses: Failed to fetch risk causes:", error.message);
      set({ riskCauses: [], riskCausesLoading: false });
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
    } catch (error: any) {
      console.error("[AppStore] addRiskCause: Failed:", error.message);
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
    } catch (error: any) {
      console.error("[AppStore] updateRiskCause: Failed:", error.message);
      throw error;
    }
  },
  deleteRiskCause: async (riskCauseId, userId, period) => {
    try {
      await deleteRiskCauseFromService(riskCauseId, userId, period); // Service handles Firestore cascading delete of ControlMeasures
      set(state => ({
        riskCauses: state.riskCauses.filter(rc => rc.id !== riskCauseId),
        // TODO: Filter controlMeasures related to this riskCauseId
      }));
    } catch (error: any) {
      console.error("[AppStore] deleteRiskCause: Failed:", error.message);
      throw error;
    }
  },
  getRiskCauseById: async (id, userId, period) => {
    const causeFromStore = get().riskCauses.find(rc => rc.id === id && rc.userId === userId && rc.period === period);
    if (causeFromStore) return causeFromStore;
    try {
      return await getRiskCauseByIdFromService(id, userId, period);
    } catch (error: any) {
      console.error(`[AppStore] getRiskCauseById: Failed to fetch RC ${id}:`, error.message);
      throw error;
    }
  },
}));
