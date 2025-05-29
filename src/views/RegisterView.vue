<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-background p-4">
    <Card class="w-full max-w-sm shadow-xl">
      <CardHeader class="space-y-1 text-center">
        <AppLogo v-if="false" class="mx-auto h-12 w-12 text-primary mb-2" /> 
        <ShieldCheck v-else class="mx-auto h-12 w-12 text-primary mb-2" /> <CardTitle class="text-2xl">Daftar Akun RiskWise</CardTitle>
        <CardDescription>Buat akun baru untuk memulai.</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <form @submit.prevent="handleRegister" class="space-y-4">
          <div class="space-y-1.5">
            <Label for="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="nama@contoh.com"
              v-model="email"
              required
              :disabled="authStore.loading"
            />
          </div>
          <div class="space-y-1.5">
            <Label for="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Minimal 6 karakter"
              v-model="password"
              required
              :disabled="authStore.loading"
            />
          </div>
          <div class="space-y-1.5">
            <Label for="confirmPassword">Konfirmasi Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Ulangi password"
              v-model="confirmPassword"
              required
              :disabled="authStore.loading"
            />
          </div>
          <Button type="submit" class="w-full" :disabled="authStore.loading">
            <Loader2 v-if="authStore.loading" class="mr-2 h-4 w-4 animate-spin" />
            <UserPlus v-else class="mr-2 h-4 w-4" />
            Daftar
          </Button>
          <div v-if="authStore.error" class="text-sm text-destructive mt-2 text-center">
            {{ authStore.error }}
          </div>
        </form>
      </CardContent>
      <CardFooter class="flex flex-col items-center space-y-2 text-xs">
        <router-link to="/login" class="text-primary hover:underline">
          Sudah punya akun? Masuk di sini
        </router-link>
         <p class="text-muted-foreground">&copy; {{ new Date().getFullYear() }} RiskWise. Aplikasi Manajemen Risiko.</p>
      </CardFooter>
    </Card>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'vue-sonner';
// Impor komponen UI Shadcn (tanpa .vue)
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// Asumsi Card dan sub-komponennya diekspor dari index.js di dalam folder card
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
// Impor ikon dari lucide-vue-next
import { Loader2, UserPlus, ShieldCheck } from 'lucide-vue-next'; 
import AppLogo from '@/components/icons/AppLogo.vue'; // Jika Anda masih punya AppLogo.vue dan ingin menggunakannya

const email = ref('');
const password = ref('');
const confirmPassword = ref('');

const authStore = useAuthStore();
const router = useRouter();

const handleRegister = async () => {
  if (password.value !== confirmPassword.value) {
    const message = 'Password dan konfirmasi password tidak cocok.';
    authStore.error = message;
    toast.error(message);
    return;
  }

  authStore.error = null; 
  const { user, error } = await authStore.signUp(email.value, password.value);

  if (error) {
    toast.error(authStore.error || 'Registrasi gagal.');
    console.error("Registration failed on page:", authStore.error);
  } else if (user) {
    toast.success('Akun Berhasil Dibuat. Silakan lengkapi profil Anda di Pengaturan.');
    console.log('Registration successful, user:', user);
    router.push('/'); 
  }
};
</script>