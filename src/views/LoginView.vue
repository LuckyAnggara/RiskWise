<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-background p-4">
    <Card class="w-full max-w-sm shadow-xl">
      <CardHeader class="space-y-1 text-center">
        <ShieldCheck class="mx-auto h-12 w-12 text-primary mb-2" /> 
        <CardTitle class="text-2xl">Masuk ke RiskWise</CardTitle>
        <CardDescription>Masuk dengan akun Anda atau Google.</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <form @submit.prevent="handleLogin" class="space-y-4">
          <div class="space-y-1.5">
            <Label for="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="nama@contoh.com"
              v-model="email"
              required
              :disabled="authStore.loading || isGoogleLoading"
            />
          </div>
          <div class="space-y-1.5">
            <Label for="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="********"
              v-model="password"
              required
              :disabled="authStore.loading || isGoogleLoading"
            />
          </div>
          <Button type="submit" class="w-full" :disabled="authStore.loading || isGoogleLoading">
            <Loader2 v-if="authStore.loading && !isGoogleLoading" class="mr-2 h-4 w-4 animate-spin" />
            <LogIn v-else class="mr-2 h-4 w-4" />
            Masuk dengan Email
          </Button>
          <div v-if="authStore.error && !isGoogleLoading" class="text-sm text-destructive mt-2 text-center">
            {{ authStore.error }}
          </div>
        </form>
        
        <div class="relative my-4">
          <div class="absolute inset-0 flex items-center">
            <span class="w-full border-t" />
          </div>
          <div class="relative flex justify-center text-xs uppercase">
            <span class="bg-background px-2 text-muted-foreground">
              Atau
            </span>
          </div>
        </div>

        <Button 
          variant="outline" 
          class="w-full" 
          @click="handleGoogleSignIn" 
          :disabled="isGoogleLoading || authStore.loading"
        >
          <Loader2 v-if="isGoogleLoading" class="mr-2 h-4 w-4 animate-spin" />
          <img :src="GoogleLogo" width=18px alt="my-logo" />
          Masuk dengan Google
        </Button>
        <div v-if="authStore.error && isGoogleLoading" class="text-sm text-destructive mt-2 text-center">
            {{ authStore.error }}
        </div>
      </CardContent>
      <CardFooter class="flex flex-col items-center space-y-2 text-xs">
        <router-link to="/register" class="text-primary hover:underline">
          Belum punya akun? Daftar di sini
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

// Impor ikon dari lucide-vue-next
import { Loader2, LogIn, ShieldCheck } from 'lucide-vue-next';
 import GoogleLogo from '@/components/icons/GoogleLogo.svg'

const email = ref('');
const password = ref('');
const isGoogleLoading = ref(false); // State lokal untuk loading Google Sign-In

const authStore = useAuthStore();
const router = useRouter();

const handleLogin = async () => {
  authStore.error = null; // Reset error
  const { user, error } = await authStore.signInWithEmail(email.value, password.value); // Panggil action signIn dari store

  if (error) {
    toast.error(authStore.error || 'Login gagal.');
    console.error("Login failed on page:", authStore.error);
  } else if (user) {
    toast.success('Login Berhasil! Selamat datang kembali.');
    console.log('Login successful, user:', user);
    router.push('/'); 
  }
};

const handleGoogleSignIn = async () => {
  isGoogleLoading.value = true;
  authStore.error = null; // Reset error
  const { user, error } = await authStore.signInWithGoogle(); // Panggil action signInWithGoogle dari store

  if (error) {
    toast.error(authStore.error || 'Login Google gagal.');
    console.error("Google Sign-In failed on page:", authStore.error);
  } else if (user) {
    toast.success('Login Google Berhasil! Selamat datang.');
    console.log('Google Sign-In successful, user:', user);
    router.push('/');
  }
  isGoogleLoading.value = false;
};
</script>