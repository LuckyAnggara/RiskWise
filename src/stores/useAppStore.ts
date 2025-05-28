
"use client";

import { create } from 'zustand';
import type { Goal, PotentialRisk, RiskCause, ControlMeasure, AppUser } from '@/lib/types';
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
// Import services for RiskCause and ControlMeasure when integrating them

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
    userId: string, // Assuming update might need context, though service currently doesn't
    period: string  // Assuming update might need context
  ) => Promise<void>;
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
  // Action to get a single potential risk, might be useful for edit page
  getPotentialRiskById: (id: string, userId: string, period: string) => Promise<PotentialRisk | null>;
}

// Placeholder for future states
// interface RiskCauseState { ... }
// interface ControlMeasureState { ... }

type AppState = GoalState & PotentialRiskState; // & RiskCauseState & ControlMeasureState;

export const useAppStore = create<AppState>((set, get) => ({
  // --- Goals State and Actions ---
  goals: [],
  goalsLoading: true,
  fetchGoals: async (userId, period) => {
    if (!userId || !period) {
      set({ goals: [], goalsLoading: false });
      console.warn("[AppStore] fetchGoals: userId or period not provided.");
      return;
    }
    set({ goalsLoading: true });
    try {
      const result: GoalsResult = await fetchGoalsFromService(userId, period);
      if (result.success && result.goals) {
        const sortedGoals = result.goals.sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' }));
        set({ goals: sortedGoals, goalsLoading: false });
        // After goals are fetched, fetch related potential risks
        await get().fetchPotentialRisks(userId, period); 
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
  updateGoal: async (goalId, updatedData, userId, period) => {
    try {
      await updateGoalInService(goalId, updatedData);
      // Re-fetch to ensure consistency and get server-generated timestamps
      // Alternatively, update optimistically and merge server response if service returns updated doc
      await get().fetchGoals(userId, period); 
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
      await deleteGoalFromService(goalId, userId, period);
      set(state => ({
        goals: state.goals.filter(g => g.id !== goalId),
        // Also remove potential risks associated with this goal from the store
        potentialRisks: state.potentialRisks.filter(pr => pr.goalId !== goalId),
        // TODO: Also remove risk causes and control measures when they are in store
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
      set({ potentialRisks: [], potentialRisksLoading: false });
      console.warn("[AppStore] fetchPotentialRisks: userId or period not provided.");
      return;
    }
    set({ potentialRisksLoading: true });
    try {
      // We need all goals to fetch all potential risks for that user/period
      const currentGoals = get().goals.length > 0 ? get().goals : (await fetchGoalsFromService(userId, period)).goals || [];
      
      let allPRs: PotentialRisk[] = [];
      for (const goal of currentGoals) {
        if (goal.userId === userId && goal.period === period) { // Ensure goal matches context
          const prsForGoal = await fetchPotentialRisksByGoalIdFromService(goal.id, userId, period);
          allPRs.push(...prsForGoal);
        }
      }
      const sortedPRs = allPRs.sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0) || a.description.localeCompare(b.description));
      set({ potentialRisks: sortedPRs, potentialRisksLoading: false });
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
      // The service function updatePotentialRisk now fetches and returns the updated document
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
      await deletePotentialRiskFromService(potentialRiskId, userId, period);
      set(state => ({
        potentialRisks: state.potentialRisks.filter(pr => pr.id !== potentialRiskId),
        // TODO: Also remove associated riskCauses from store when implemented
      }));
    } catch (error: any) {
      console.error("[AppStore] deletePotentialRisk: Failed:", error.message);
      throw error;
    }
  },
  getPotentialRiskById: async (id, userId, period) => {
    // This action can either fetch from Firestore directly or try to find in store first.
    // For simplicity now, it will call the service.
    // A more optimized version might check the store first.
    try {
      const risk = await getPotentialRiskByIdFromService(id, userId, period);
      return risk;
    } catch (error: any) {
      console.error(`[AppStore] getPotentialRiskById: Failed to fetch PR ${id}:`, error.message);
      throw error;
    }
  },
}));

// TODO: Implement state and actions for RiskCause and ControlMeasure
// - RiskCauseState: riskCauses, riskCausesLoading, fetchRiskCauses(potentialRiskId, userId, period), addRiskCause, updateRiskCause, deleteRiskCause
// - ControlMeasureState: controlMeasures, controlMeasuresLoading, fetchControlMeasures(riskCauseId, userId, period), addControlMeasure, updateControlMeasure, deleteControlMeasure
// - Remember to update deletePotentialRisk and deleteGoal to also clear child states from the store.
// - When fetching parent items (e.g., fetchPotentialRisks), consider fetching their children too if commonly needed together.
    