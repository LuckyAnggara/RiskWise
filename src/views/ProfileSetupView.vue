// src/views/ProfileSetupView.vue
<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-background p-4">
    <Card class="w-full max-w-md shadow-xl">
      <CardHeader class="space-y-1 text-center">
        <ShieldCheck class="mx-auto h-12 w-12 text-primary mb-2" />
        <CardTitle class="text-2xl">Lengkapi Profil Anda</CardTitle>
        <CardDescription>
          Selamat datang di RiskWise! Untuk memulai, silakan lengkapi informasi UPR (Unit Pemilik Risiko) dan periode awal Anda.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form @submit.prevent="handleSubmitProfile" class="space-y-6">
          <div class="space-y-1.5">
            <Label for="displayName">Nama Unit Pengelola Risiko (UPR)</Label>
            <Input
              id="displayName"
              type="text"
              placeholder="Masukkan Nama UPR"
              v-model="form.displayName"
              required
              :disabled="isSaving"
            />
            <p class="text-xs text-muted-foreground">Nama ini akan digunakan sebagai identitas UPR Anda dalam aplikasi.</p>
          </div>

          <div class="space-y-1.5">
            <Label for="initialPeriod">Tahun Periode Awal</Label>
            <Input
              id="initialPeriod"
              type="text"
              placeholder="YYYY (misalnya, 2024)"
              v-model="form.initialPeriod"
              required
              pattern="\d{4}"
              title="Masukkan tahun dalam format YYYY (4 digit angka)"
              :disabled="isSaving"
            />
             <p class="text-xs text-muted-foreground">Ini akan menjadi periode aktif pertama Anda dan ditambahkan ke daftar periode yang tersedia.</p>
          </div>

          <div class="space-y-1.5">
            <Label for="riskAppetite">Selera Risiko Awal (1-25)</Label>
            <Input
              id="riskAppetite"
              type="number"
              min="1"
              max="25"
              placeholder="Default: 5"
              v-model.number="form.riskAppetite"
              :disabled="isSaving"
            />
            <p class="text-xs text-muted-foreground">Skor batas tingkat risiko yang dapat diterima (1-25).</p>
          </div>

          <div class="space-y-1.5">
            <Label for="defaultMonitoringFrequency">Frekuensi Pemantauan Standar (Opsional)</Label>
            <Select v-model="form.defaultMonitoringFrequency" :disabled="isSaving">
              <SelectTrigger id="defaultMonitoringFrequency">
                <SelectValue placeholder="Pilih frekuensi standar" />
              </SelectTrigger>
              <SelectContent>
 <SelectItem :value="NO_FREQUENCY_SENTINEL_VALUE">_Tidak Diatur_</SelectItem>
                <SelectItem v-for="freq in MONITORING_PERIOD_FREQUENCIES" :key="freq" :value="freq">
                  {{ freq }}
                </SelectItem>
              </SelectContent>
            </Select>
             <p class="text-xs text-muted-foreground">Default saat membuat sesi pemantauan baru.</p>
          </div>

          <Button type="submit" class="w-full" :disabled="isSaving">
            <Loader2 v-if="isSaving" class="mr-2 h-4 w-4 animate-spin" />
            <Save v-else class="mr-2 h-4 w-4" />
            Simpan & Lanjutkan
          </Button>
        </form>
      </CardContent>
       <CardFooter class="text-center text-xs text-muted-foreground pt-4">
          <p>&copy; {{ new Date().getFullYear() }} RiskWise. Aplikasi Manajemen Risiko.</p>
      </CardFooter>
    </Card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
import { toast } from 'vue-sonner';
import { supabase } from '@/lib/supabaseClient';

// Impor komponen UI Shadcn
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Impor ikon dari lucide-vue-next
import { Loader2, Save, ShieldCheck } from 'lucide-vue-next';

// Konstanta ini menyediakan "mock" data untuk dropdown
const MONITORING_PERIOD_FREQUENCIES = ['Bulanan', 'Triwulanan', 'Semesteran', 'Tahunan'];
const DEFAULT_INITIAL_PERIOD_STRING = new Date().getFullYear().toString();
// Nilai sentinel untuk opsi "_Tidak Diatur_"
const NO_FREQUENCY_SENTINEL_VALUE = 'unset'; // Menggunakan string eksplisit untuk nilai sentinel

const authStore = useAuthStore();
const appStore = useAppStore();
const router = useRouter();

const form = reactive({
  displayName: '',
  initialPeriod: DEFAULT_INITIAL_PERIOD_STRING,
  riskAppetite: 5,
  // Default ke "Tidak Diatur"
  defaultMonitoringFrequency: NO_FREQUENCY_SENTINEL_VALUE,
});

const isSaving = ref(false);

onMounted(() => {
  if (authStore.user) {
    if (appStore.appUser) {
      form.displayName = appStore.appUser.display_name || authStore.user.email?.split('@')[0] || '';
      form.initialPeriod = appStore.appUser.active_period || DEFAULT_INITIAL_PERIOD_STRING;
      form.riskAppetite = appStore.appUser.risk_appetite ?? 5;
      // Mengambil dari appUser jika ada, jika tidak, tetap NO_FREQUENCY_SENTINEL_VALUE
      form.defaultMonitoringFrequency = appStore.appUser.monitoring_settings?.defaultFrequency || NO_FREQUENCY_SENTINEL_VALUE;
    } else {
      form.displayName = authStore.user.email?.split('@')[0] || '';
      // Nilai default lainnya sudah diatur di `form`
    }
  }
});

watch(() => appStore.appUser, (newAppUser) => {
  if (newAppUser && authStore.user) {
    form.displayName = newAppUser.display_name || authStore.user.email?.split('@')[0] || '';
    if (!newAppUser.active_period) {
      form.initialPeriod = DEFAULT_INITIAL_PERIOD_STRING;
    } else {
      form.initialPeriod = newAppUser.active_period;
    }
    form.riskAppetite = newAppUser.risk_appetite ?? 5;
    form.defaultMonitoringFrequency = newAppUser.monitoring_settings?.defaultFrequency || NO_FREQUENCY_SENTINEL_VALUE;
  }
}, { immediate: false });


const handleSubmitProfile = async () => {
  if (!authStore.user) {
    toast.error("Sesi tidak valid atau Anda belum login. Silakan login kembali.");
    router.push({ name: 'Login' });
    return;
  }

  if (!form.displayName.trim()) {
    toast.error("Nama UPR / Nama Pengguna harus diisi.");
    return;
  }
  if (!/^\d{4}$/.test(form.initialPeriod.trim())) {
    toast.error("Tahun periode awal harus dalam format YYYY (misalnya, 2024).");
    return;
  }
  if (form.riskAppetite < 1 || form.riskAppetite > 25) {
    toast.error("Selera Risiko harus berupa angka antara 1 dan 25.");
    return;
  }

  isSaving.value = true;
  console.log('[ProfileSetup] handleSubmitProfile: Saving started...');
  
    const frequencyToSave = form.defaultMonitoringFrequency === NO_FREQUENCY_SENTINEL_VALUE
                            ? null
                            : form.defaultMonitoringFrequency;

    const profileDataToUpdate = {
      display_name: form.displayName.trim(),
      // upr_id: form.displayName.trim(),
      // active_period: form.initialPeriod.trim(),
      // available_periods: [form.initialPeriod.trim()],
      // risk_appetite: form.riskAppetite,
      // monitoring_settings: {
      //   defaultFrequency: frequencyToSave
      // }
    };
       // TITIK 1: supabase.auth.updateUser (jika kondisi terpenuhi)
       if (authStore.user.user_metadata?.full_name !== profileDataToUpdate.display_name) {
          console.log('[ProfileSetup] Attempting to update Supabase Auth user metadata...');
          const { data: updatedAuthUser, error: authUpdateError } = await supabase.auth.updateUser({
              data: { full_name: profileDataToUpdate.display_name } 
          });
          // Apakah ini resolve/reject?
      }
      
      // TITIK 2: supabase.from('users').update()
      console.log('[ProfileSetup] Attempting to update public.users profile...');
      const { data: updatedUser, error: publicProfileError } = await supabase
        .from('users')
        .update(profileDataToUpdate)
        .eq('id', authStore.user.id)
        .select()
        .single();
      // Apakah ini resolve/reject?

    if (publicProfileError) {
      if (publicProfileError.code === 'PGRST116') {
        const { error: insertError } = await supabase
            .from('users')
            .insert({ id: authStore.user.id, email: authStore.user.email, ...profileDataToUpdate})
            .select()
            .single();
        if (insertError) throw insertError;
      } else {
        throw publicProfileError;
      }
    }
    
    console.log('[ProfileSetup] Supabase update/insert successful. Attempting to fetch app user profile...');
    await appStore.fetchAppUserProfile(authStore.user.id);
    console.log('[ProfileSetup] fetchAppUserProfile completed. isProfileComplete:', appStore.isProfileComplete);

    toast.success("Profil berhasil disimpan!");

 await nextTick(); // Tunggu DOM update jika ada

    if (appStore.isProfileComplete) {
      console.log('[ProfileSetup] Profile complete, navigating to Dashboard.');
      router.push({ name: 'Dashboard' });
    } else {
      toast.error("Profil masih terdeteksi belum lengkap setelah disimpan. Silakan coba lagi atau hubungi support.");
      console.error("[ProfileSetup] Profile reported as incomplete even after successful save and profile fetch. State:", appStore.appUser);
    }
 
    isSaving.value = false;
    
};
</script>