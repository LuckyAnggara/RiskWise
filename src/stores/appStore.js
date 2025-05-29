import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabaseClient'

export const useAppStore = defineStore('app', {
  state: () => ({
    // ... state lain seperti goals, risks, dll.
    appUser: null, // Profil dari public.users
    profileLoading: false,
    isProfileComplete: false,
    // ... (state lain dari useAppStore.ts yang relevan)
    dataFetchedForPeriod: null,
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
  }),
  getters: {
    // ... getters
  },
  actions: {
    async fetchAppUserProfile(userId) {
      if (!userId) {
        this.appUser = null;
        this.isProfileComplete = false;
        return;
      }
      this.profileLoading = true;
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
        if (error && error.code !== 'PGRST116') { // PGRST116: no rows found
            console.error("Error fetching app user profile:", error);
            throw error;
        }
        this.appUser = data;
        this.checkProfileCompleteness();
        
        // Panggil triggerInitialDataFetch setelah appUser berhasil dimuat dan profil lengkap
        if (this.isProfileComplete && this.appUser && this.appUser.id && this.appUser.active_period) {
            this.triggerInitialDataFetch(this.appUser.id, this.appUser.active_period);
        } else if (!this.isProfileComplete) {
            this.resetAllData();
        }

      } catch (err) {
        console.error('Failed to fetch app user profile:', err);
        this.appUser = null;
        this.isProfileComplete = false;
        this.resetAllData();
      } finally {
        this.profileLoading = false;
      }
    },
    checkProfileCompleteness() {
      if (!this.appUser) {
        this.isProfileComplete = false;
        return;
      }
      // Sesuaikan kondisi ini dengan definisi profil lengkap Anda di Supabase
      this.isProfileComplete = !!(
        this.appUser.display_name &&
        this.appUser.upr_id &&
        this.appUser.active_period &&
        this.appUser.available_periods &&
        this.appUser.available_periods.length > 0
      );
    },
    clearAppUserProfile() {
        this.appUser = null;
        this.isProfileComplete = false;
        this.resetAllData();
    },
    resetAllData() { // Sama seperti di useAppStore.ts Anda
        console.log("[AppStore Vue] resetAllData called.");
        this.goals = [];
        this.goalsLoading = false;
        this.potentialRisks = [];
        this.potentialRisksLoading = false;
        this.riskCauses = [];
        this.riskCausesLoading = false;
        this.controlMeasures = [];
        this.controlMeasuresLoading = false;
        this.monitoringSessions = [];
        this.monitoringSessionsLoading = false;
        this.currentMonitoringSession = null;
        this.currentMonitoringSessionLoading = false;
        this.riskExposures = [];
        this.riskExposuresLoading = false;
        this.dataFetchedForPeriod = null;
    },
    // Pindahkan semua actions (fetchGoals, addGoal, dll.) dari useAppStore.ts ke sini,
    // dan adaptasi mereka untuk menggunakan Supabase client.
    // Contoh untuk triggerInitialDataFetch (perlu diadaptasi untuk memanggil fetchGoals, dll. versi Supabase)
    async triggerInitialDataFetch(userId, period) {
        if (!userId || !period) {
          console.warn("[AppStore Vue] triggerInitialDataFetch: userId or period is missing. Aborting.");
          this.resetAllData();
          return;
        }
        if (period === this.dataFetchedForPeriod && !this.goalsLoading /* && other loading flags */) {
          console.log(`[AppStore Vue] Data for period ${period} already seems fetched and not loading. Skipping.`);
          return;
        }
        console.log(`[AppStore Vue] Triggering initial data fetch for userId: ${userId}, period: ${period}.`);
        this.dataFetchedForPeriod = period;
        this.goalsLoading = true;
        this.potentialRisksLoading = true; // set semua loading flags
        // ...
        try {
          await this.fetchGoals(userId, period); // fetchGoals versi Supabase
          await this.fetchMonitoringSessions(userId, period); // versi Supabase
        } catch (error) {
          console.error("[AppStore Vue] Error during triggerInitialDataFetch chain:", error);
          this.goalsLoading = false; // reset semua loading flags
          // ...
          this.dataFetchedForPeriod = null;
        }
    },
    // Contoh adaptasi fetchGoals
    async fetchGoals(userId, period) {
      if (!userId || !period) {
        this.goals = []; this.goalsLoading = false; /* reset loading turunan */ return;
      }
      this.goalsLoading = true;
      try {
        const { data, error } = await supabase
          .from('goals')
          .select('*')
          .eq('user_id', userId)
          .eq('period', period)
          .order('code', { ascending: true });

        if (error) throw error;
        
        this.goals = data.sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' }));
        // Panggil fetch untuk entitas anak jika perlu
        await this.fetchPotentialRisks(userId, period); 

      } catch (error) {
        console.error("[AppStore Vue] fetchGoals: Error:", error);
        this.goals = []; /* reset state & loading turunan */
        this.dataFetchedForPeriod = null;
        throw new Error(`Gagal memuat sasaran: ${error.message}`);
      } finally {
        this.goalsLoading = false;
      }
    },
    // Anda perlu mengimplementasikan SEMUA fungsi CRUD lainnya dari useAppStore.ts
    // (addGoal, updateGoal, deleteGoal, getGoalById, fetchPotentialRisks, addPotentialRisk, etc.)
    // dengan mengganti panggilan Firebase service dengan panggilan Supabase client.
    // Ini adalah bagian yang paling memakan waktu dari migrasi logika.
  },
})