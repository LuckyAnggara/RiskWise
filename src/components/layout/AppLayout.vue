<template>
    <div class="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <Header />
      <div v-if="authStore.isAuthenticated && !appStore.isProfileComplete && $route.name !== 'ProfileSetup' && $route.name !== 'Settings'"
         class="mb-4 p-4 bg-destructive/10 border border-destructive text-destructive rounded-md">
      <h4 class="font-bold">Profil Belum Lengkap!</h4>
      <p class="text-sm">
        Nama UPR dan Periode Awal Anda belum diatur. Harap lengkapi profil Anda di halaman
        <router-link to="/settings" class="font-semibold underline hover:opacity-80 ml-1">
          Pengaturan
        </router-link>
        untuk dapat menggunakan fitur lain.
      </p>
    </div>
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        <Toaster />
    </div>
  </template>
  
  <script setup>
  import { computed, onMounted } from 'vue';
  import { useRoute } from 'vue-router';
  import Sidebar from './Sidebar.vue';
  import Header from './Header.vue';
  // import { Toaster } from '@/components/ui/toast';
import { Toaster } from '@/components/ui/sonner'
  import { useAuthStore } from '@/stores/authStore';
  import { useAppStore } from '@/stores/appStore';
  
  const route = useRoute();
  const authStore = useAuthStore();
  const appStore = useAppStore();
  
  // Halaman publik yang tidak memerlukan layout utama (sidebar/header)
  const publicPages = ['Login', 'Register']; // Berdasarkan 'name' di router
  const isPublicPage = computed(() => publicPages.includes(route.name));
  
  onMounted(() => {
    authStore.initializeAuthListener(); // Inisialisasi status autentikasi saat layout dimuat
  });
  
  // Tambahkan logika redirect jika diperlukan, mirip dengan AppLayout.tsx
  // Ini bisa dilakukan di router.beforeEach
  </script>
  
  <style scoped>
  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.3s ease;
  }
  
  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
  }
  </style>