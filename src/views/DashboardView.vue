<template>
  <div class="space-y-6">
    <PageHeader
      title="Dasbor Risiko"
      :description="`Ringkasan lanskap risiko Anda saat ini untuk UPR: ${authStore.appUser?.display_name || '...'}, Periode: ${authStore.appUser?.active_period || '...'}.`"
    />

    <div v-if="isLoading" class="flex flex-col items-center justify-center py-10">
      <Loader2 class="h-12 w-12 animate-spin text-primary mb-4" />
      <p class="text-xl text-muted-foreground">Memuat data dasbor...</p>
    </div>

    <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Total Sasaran</CardTitle>
          <Target class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ goalsCount }}</div>
          <p class="text-xs text-muted-foreground">Sasaran yang dilacak untuk UPR/Periode ini</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Total Potensi Risiko</CardTitle>
          <AlertCircle class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ potentialRisksCount }}</div>
          <p class="text-xs text-muted-foreground">Jumlah potensi risiko teridentifikasi.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Total Penyebab Dianalisis</CardTitle>
          <ListChecks class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ analyzedRiskCausesCount }}</div>
          <p class="text-xs text-muted-foreground">Penyebab risiko yang telah dinilai.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Total Tindakan Pengendalian</CardTitle>
          <ShieldCheck class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ totalControlsCount }}</div>
          <p class="text-xs text-muted-foreground">Jumlah total rencana pengendalian.</p>
        </CardContent>
      </Card>
    </div>

    <div v-if="!isLoading" class="grid gap-4 md:grid-cols-1">
      <Card>
        <CardHeader>
          <CardTitle>Informasi Tambahan</CardTitle>
          <CardDescription>Analisis risiko detail dilakukan pada tingkat penyebab risiko.</CardDescription>
        </CardHeader>
        <CardContent>
          <p class="text-sm text-muted-foreground">
            Untuk melihat dan menganalisis tingkat risiko, silakan navigasi ke modul "Analisis Risiko" di mana setiap penyebab risiko dapat dinilai kemungkinan dan dampaknya.
            Modul "Identifikasi Risiko" digunakan untuk mencatat potensi risiko dan penyebab-penyebabnya.
          </p>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { PageHeader } from '@/components/ui/page-header'; // Asumsi path benar
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, ShieldCheck, Target, ListChecks, Loader2 } from 'lucide-vue-next';
import { useAuthStore } from '@/stores/authStore';
// Impor service Supabase Anda nanti
// import { getGoals } from '@/services/goalService';
// import { getPotentialRisksByGoalId } from '@/services/potentialRiskService';
// import { getRiskCausesByPotentialRiskId } from '@/services/riskCauseService';
// import { getControlMeasuresByRiskCauseId } from '@/services/controlMeasureService';
import { supabase } from '@/lib/supabaseClient'; // Untuk contoh, bisa juga lewat service


const authStore = useAuthStore();

const goalsCount = ref(0);
const potentialRisksCount = ref(0);
const analyzedRiskCausesCount = ref(0);
const totalControlsCount = ref(0);
const isLoading = ref(true);

const currentUserId = computed(() => authStore.currentUser?.id);
const activePeriod = computed(() => authStore.appUser?.active_period); // Sesuaikan dengan nama field di profil Supabase

const loadDashboardData = async () => {
  if (!currentUserId.value || !activePeriod.value) {
    isLoading.value = false;
    goalsCount.value = 0;
    potentialRisksCount.value = 0;
    analyzedRiskCausesCount.value = 0;
    totalControlsCount.value = 0;
    console.log("[DashboardView] loadDashboardData: Missing user context, aborting.");
    return;
  }

  isLoading.value = true;
  console.log("[DashboardView] loadDashboardData: Starting data fetch for user:", currentUserId.value, "period:", activePeriod.value);

  try {
    // 1. Fetch Goals
    const { data: fetchedGoals, error: goalsError } = await supabase
      .from('goals') // Ganti 'goals' dengan nama tabel sasaran Anda di Supabase
      .select('id', { count: 'exact' }) // Hanya butuh count untuk dashboard
      .eq('user_id', currentUserId.value) // Sesuaikan 'user_id' dengan nama kolom Anda
      .eq('period', activePeriod.value);

    if (goalsError) throw goalsError;
    goalsCount.value = fetchedGoals?.length || 0; // Seharusnya `data.count` jika menggunakan { count: 'exact' }
    console.log(`[DashboardView] Fetched ${goalsCount.value} goals.`);

    // Untuk mendapatkan PotentialRisks, RiskCauses, Controls, kita perlu ID goals
    // Ini bisa jadi banyak query. Pertimbangkan membuat stored procedure/RPC di Supabase untuk ini.
    // Untuk sekarang, kita akan iterasi (mungkin tidak optimal untuk banyak data)

    let currentPotentialRisksCount = 0;
    let currentAnalyzedCausesCount = 0;
    let currentControlsCount = 0;

    if (goalsCount.value > 0) {
        // Fetch all goals (atau hanya ID jika memungkinkan) untuk iterasi
        const { data: allGoalsForPeriod, error: allGoalsError } = await supabase
            .from('goals')
            .select('id')
            .eq('user_id', currentUserId.value)
            .eq('period', activePeriod.value);

        if (allGoalsError) throw allGoalsError;

        if (allGoalsForPeriod) {
            for (const goal of allGoalsForPeriod) {
                const { data: pRisks, error: pRisksError } = await supabase
                    .from('potential_risks') // Ganti dengan nama tabel Anda
                    .select('id', { count: 'exact' })
                    .eq('goal_id', goal.id)
                    .eq('user_id', currentUserId.value)
                    .eq('period', activePeriod.value);

                if (pRisksError) console.error(`Error fetching pRisks for goal ${goal.id}:`, pRisksError);
                currentPotentialRisksCount += pRisks?.length || 0;

                // Fetch causes for these potential risks
                if(pRisks){
                    for(const pRisk of pRisks){
                        const { data: causes, error: causesError } = await supabase
                            .from('risk_causes') // Ganti dengan nama tabel Anda
                            .select('id, likelihood, impact', { count: 'exact'}) // Ambil likelihood dan impact
                            .eq('potential_risk_id', pRisk.id)
                            .eq('user_id', currentUserId.value)
                            .eq('period', activePeriod.value);

                        if(causesError) console.error(`Error fetching causes for pRisk ${pRisk.id}:`, causesError);

                        if(causes) {
                            currentAnalyzedCausesCount += causes.filter(c => c.likelihood && c.impact).length;

                            // Fetch controls for these causes
                            for (const cause of causes) {
                                const { data: controls, error: controlsError } = await supabase
                                    .from('control_measures') // Ganti dengan nama tabel Anda
                                    .select('id', { count: 'exact'})
                                    .eq('risk_cause_id', cause.id)
                                    .eq('user_id', currentUserId.value)
                                    .eq('period', activePeriod.value);

                                if(controlsError) console.error(`Error fetching controls for cause ${cause.id}:`, controlsError);
                                currentControlsCount += controls?.length || 0;
                            }
                        }
                    }
                }
            }
        }
    }

    potentialRisksCount.value = currentPotentialRisksCount;
    analyzedRiskCausesCount.value = currentAnalyzedCausesCount;
    totalControlsCount.value = currentControlsCount;


    console.log("[DashboardView] Data aggregation complete:", {
      goals: goalsCount.value,
      potentialRisks: potentialRisksCount.value,
      analyzedRiskCauses: analyzedRiskCausesCount.value,
      controls: totalControlsCount.value,
    });

  } catch (error) {
    console.error("Error loading dashboard data:", error.message || error);
    goalsCount.value = 0;
    potentialRisksCount.value = 0;
    analyzedRiskCausesCount.value = 0;
    totalControlsCount.value = 0;
  } finally {
    isLoading.value = false;
    console.log("[DashboardView] loadDashboardData: Finished, isLoading set to false.");
  }
};

onMounted(() => {
  // Panggil loadDashboardData jika auth sudah siap
  if (!authStore.loading && authStore.currentUser && authStore.appUser) {
    loadDashboardData();
  }
});

// Perhatikan perubahan pada currentUser atau appUser (misalnya, setelah login atau perubahan periode)
watch(
  () => [authStore.currentUser, authStore.appUser, authStore.loading],
  ([newUser, newAppUser, newAuthLoading], [oldUser, oldAppUser, oldAuthLoading]) => {
    if (!newAuthLoading && newUser && newAppUser) {
      // Cek apakah ada perubahan signifikan yang memerlukan reload data
      const userChanged = oldUser?.id !== newUser?.id;
      const periodChanged = oldAppUser?.active_period !== newAppUser?.active_period;
      const profileCompletionChanged = oldAppUser?.isProfileComplete !== newAppUser?.isProfileComplete;


      if (userChanged || periodChanged || (profileCompletionChanged && newAppUser.isProfileComplete)) {
        console.log("[DashboardView] User context changed, reloading dashboard data.");
        loadDashboardData();
      }
    } else if (!newAuthLoading && !newUser) {
      // User logged out
      isLoading.value = false;
      goalsCount.value = 0;
      potentialRisksCount.value = 0;
      analyzedRiskCausesCount.value = 0;
      totalControlsCount.value = 0;
    }
  },
  { deep: true } // Mungkin tidak perlu deep watch jika hanya memantau properti primitif
);

</script>