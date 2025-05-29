<template>
    <div class="flex min-h-screen bg-background text-foreground">
      <Sidebar v-if="authStore.isAuthenticated && !isPublicPage" /> <main class="flex-1 flex flex-col">
        <Header v-if="authStore.isAuthenticated && !isPublicPage" /> <div class="flex-1 p-4 md:p-6">
          <div v-if="authStore.isAuthenticated && !authStore.isProfileComplete && $route.name !== 'Settings'"
               class="mb-4 p-4 border border-destructive bg-destructive/10 text-destructive rounded-md">
            <h3 class="font-semibold">Profil Belum Lengkap!</h3>
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
        </div>
        <Toaster /> </main>
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
  
  const route = useRoute();
  const authStore = useAuthStore();
  
  // Halaman publik yang tidak memerlukan layout utama (sidebar/header)
  const publicPages = ['Login', 'Register']; // Berdasarkan 'name' di router
  const isPublicPage = computed(() => publicPages.includes(route.name));
  
  onMounted(() => {
    authStore.initializeAuth(); // Inisialisasi status autentikasi saat layout dimuat
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