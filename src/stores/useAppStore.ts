
"use client";

import { create } from 'zustand';
import type { Goal, PotentialRisk, RiskCause, ControlMeasure } from '@/lib/types';
import { 
  addGoal as addGoalToService, 
  getGoals as fetchGoalsFromService, 
  updateGoal as updateGoalInService, 
  deleteGoal as deleteGoalFromService,
  type GoalsResult
} from '@/services/goalService';
// Impor service lain akan ditambahkan nanti
// import { getPotentialRisksByGoalId, ... } from '@/services/potentialRiskService';
// import { getRiskCausesByPotentialRiskId, ... } from '@/services/riskCauseService';
// import { getControlMeasuresByRiskCauseId, ... } from '@/services/controlMeasureService';

interface AppState {
  // State untuk Sasaran (Goals)
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
    updatedData: Partial<Omit<Goal, 'id' | 'userId' | 'period' | 'code' | 'createdAt'>>
  ) => Promise<void>;
  deleteGoal: (goalId: string, userId: string, period: string) => Promise<void>;

  // Placeholder untuk state modul lain (akan diimplementasikan nanti)
  // potentialRisks: PotentialRisk[];
  // potentialRisksLoading: boolean;
  // fetchPotentialRisks: (goalId: string, userId: string, period: string) => Promise<void>;
  // ... dan seterusnya untuk riskCauses dan controlMeasures
}

export const useAppStore = create<AppState>((set, get) => ({
  // --- State dan Actions untuk Sasaran (Goals) ---
  goals: [],
  goalsLoading: true,
  fetchGoals: async (userId, period) => {
    if (!userId || !period) {
      set({ goals: [], goalsLoading: false });
      console.warn("[AppStore] fetchGoals: userId atau period tidak valid.");
      return;
    }
    set({ goalsLoading: true });
    try {
      const result: GoalsResult = await fetchGoalsFromService(userId, period);
      if (result.success && result.goals) {
        set({ goals: result.goals.sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' })), goalsLoading: false });
      } else {
        set({ goals: [], goalsLoading: false });
        console.error("[AppStore] fetchGoals: Gagal memuat sasaran:", result.message);
      }
    } catch (error: any) {
      console.error("[AppStore] fetchGoals: Kesalahan fatal:", error.message);
      set({ goals: [], goalsLoading: false });
    }
  },
  addGoal: async (goalData, userId, period) => {
    if (!userId || !period) {
      console.error("[AppStore] addGoal: userId atau period tidak valid.");
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
      console.error("[AppStore] addGoal: Gagal menambah sasaran:", error.message);
      throw error; // Re-throw error agar bisa ditangani di UI jika perlu
    }
  },
  updateGoal: async (goalId, updatedData) => {
    try {
      await updateGoalInService(goalId, updatedData);
      set(state => ({
        goals: state.goals.map(g => 
          g.id === goalId 
            ? { ...g, ...updatedData, updatedAt: new Date().toISOString() } 
            : g
        ).sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' }))
      }));
    } catch (error: any) {
      console.error("[AppStore] updateGoal: Gagal memperbarui sasaran:", error.message);
      throw error; // Re-throw error
    }
  },
  deleteGoal: async (goalId, userId, period) => {
    if (!userId || !period) {
      console.error("[AppStore] deleteGoal: userId atau period tidak valid.");
      throw new Error("Konteks pengguna atau periode tidak valid untuk menghapus sasaran.");
    }
    try {
      await deleteGoalFromService(goalId, userId, period);
      set(state => ({
        goals: state.goals.filter(g => g.id !== goalId)
        // Tidak perlu sort ulang karena hanya menghapus
      }));
    } catch (error: any) {
      console.error("[AppStore] deleteGoal: Gagal menghapus sasaran:", error.message);
      throw error; // Re-throw error
    }
  },

  // --- Placeholder untuk state dan actions modul lain ---
  // potentialRisks: [],
  // potentialRisksLoading: false,
  // fetchPotentialRisks: async (goalId, userId, period) => { /* ... */ },
}));
