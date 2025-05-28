
"use client";

import { create } from 'zustand';
import type { Goal, PotentialRisk, RiskCause, ControlMeasure } from '@/lib/types';
import { 
  getGoals as fetchGoalsFromService, 
  addGoal as addGoalToService, 
  updateGoal as updateGoalInService, 
  deleteGoal as deleteGoalFromService 
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
      const result = await fetchGoalsFromService(userId, period);
      if (result.success && result.goals) {
        set({ goals: result.goals, goalsLoading: false });
      } else {
        set({ goals: [], goalsLoading: false });
        // Pertimbangkan untuk menampilkan toast error di sini atau melempar error
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
      // Pertimbangkan untuk melempar error atau menampilkan toast
      return null;
    }
    try {
      const newGoal = await addGoalToService(goalData, userId, period);
      // Setelah berhasil menambah, fetch ulang daftar goals untuk memperbarui state
      // atau tambahkan newGoal secara optimistik ke state goals yang ada
      await get().fetchGoals(userId, period); // Fetch ulang
      return newGoal;
    } catch (error: any) {
      console.error("[AppStore] addGoal: Gagal menambah sasaran:", error.message);
      // Pertimbangkan untuk menampilkan toast error
      return null;
    }
  },
  updateGoal: async (goalId, updatedData) => {
    try {
      await updateGoalInService(goalId, updatedData);
      // Asumsikan userId dan period ada di dalam store atau bisa diakses
      // Untuk sekarang, kita tidak punya cara mudah untuk mendapatkan userId dan period di sini
      // Idealnya, updateGoalInService tidak memerlukan userId/period, atau kita perlu cara untuk mendapatkannya
      // Untuk sementara, kita tidak fetch ulang di sini, tapi idealnya perlu.
      // Atau, update item secara manual di state goals.
      set(state => ({
        goals: state.goals.map(g => g.id === goalId ? { ...g, ...updatedData, updatedAt: new Date().toISOString() } : g)
      }));
    } catch (error: any) {
      console.error("[AppStore] updateGoal: Gagal memperbarui sasaran:", error.message);
      // Pertimbangkan untuk menampilkan toast error
    }
  },
  deleteGoal: async (goalId, userId, period) => {
    if (!userId || !period) {
      console.error("[AppStore] deleteGoal: userId atau period tidak valid.");
      // Pertimbangkan untuk menampilkan toast error atau melempar error
      return;
    }
    try {
      await deleteGoalFromService(goalId, userId, period);
      // Setelah berhasil menghapus, fetch ulang daftar goals
      await get().fetchGoals(userId, period); // Fetch ulang
    } catch (error: any) {
      console.error("[AppStore] deleteGoal: Gagal menghapus sasaran:", error.message);
      // Pertimbangkan untuk menampilkan toast error
    }
  },

  // --- Placeholder untuk state dan actions modul lain ---
  // potentialRisks: [],
  // potentialRisksLoading: false,
  // fetchPotentialRisks: async (goalId, userId, period) => { /* ... */ },
}));

// Catatan: Untuk updateGoal, jika service memerlukan userId dan period,
// kita perlu cara untuk mendapatkannya. Mungkin store juga perlu menyimpan
// currentUser dan activePeriod dari AuthContext, atau actions ini perlu menerimanya.
// Untuk saat ini, updateGoal dibuat optimistik di sisi klien.
