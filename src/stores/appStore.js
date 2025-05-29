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
    async getUser(userId) {
      console.log('Instance Supabase:', supabase);
      console.log('getUser dipanggil dengan id:', userId);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Supabase error:', error);
      } else {
        console.log('User data:', data);
        this.userData = data;
      }
    },
    async fetchAppUserProfile(userId) {
      if (!userId) {
        this.appUser = null;
        this.isProfileComplete = false;
        this.profileLoading = false; // Pastikan di-set false
        return;
      }
      this.profileLoading = true;
      this.getUser(userId)
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
    
        if (error && error.code !== 'PGRST116') {
          console.error("[AppStore] fetchAppUserProfile: Error fetching profile:", error);
          throw error;
        }
        this.appUser = data; // Bisa null jika PGRST116
        console.log('[AppStore] fetchAppUserProfile: Profile data received:', data);
        this.checkProfileCompleteness(); // Panggil ini setelah appUser di-set
    
        if (this.isProfileComplete && this.appUser && this.appUser.id && this.appUser.active_period) {
            // this.triggerInitialDataFetch(this.appUser.id, this.appUser.active_period); // Mungkin tidak perlu di sini jika trigger dari guard/layout
        } else if (!this.isProfileComplete) {
            // this.resetAllData(); // Mungkin terlalu agresif, tergantung alur
        }
      } catch (err) {
        console.error('[AppStore] fetchAppUserProfile: Failed to fetch profile:', err);
        this.appUser = null;
        this.isProfileComplete = false; // Pastikan di-set false
        // this.resetAllData();
      } finally {
        this.profileLoading = false; // SANGAT PENTING
        console.log('[AppStore] fetchAppUserProfile: Finished. profileLoading:', this.profileLoading, 'isProfileComplete:', this.isProfileComplete);
      }
    },
    checkProfileCompleteness() {
      if (!this.appUser) {
        this.isProfileComplete = false;
      } else {
        this.isProfileComplete = !!(
          this.appUser.display_name &&
          this.appUser.upr_id && // Pastikan field ini sesuai dengan nama kolom di DB Anda
          this.appUser.active_period &&
          this.appUser.available_periods &&
          this.appUser.available_periods.length > 0
        );
      }
      console.log('[AppStore] checkProfileCompleteness: isProfileComplete set to', this.isProfileComplete);
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