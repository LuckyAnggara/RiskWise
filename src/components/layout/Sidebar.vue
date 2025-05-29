<template>
    <aside class="w-64 bg-card border-r border-border flex-col hidden md:flex">
      <div class="p-4">
        <router-link to="/" class="flex items-center gap-2">
          <svg class="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M12 10l4 2-4 2-4-2 4-2z" />
            <line x1="12" y1="22" x2="12" y2="14" />
          </svg>
          <span class="font-semibold text-lg text-primary">RiskWise</span>
        </router-link>
      </div>
      <Separator />
      <nav class="flex-1 p-2 space-y-1">
        <router-link v-for="item in navItems" :key="item.href" :to="item.href" custom
          v-slot="{ href, navigate, isActive, isExactActive }">
          <Button :variant="isActiveRoute(item.href, $route.path) ? 'secondary' : 'ghost'"
            class="w-full justify-start"
            :disabled="item.disabled && item.disabled(authStore.isProfileComplete)"
            @click="navigate">
            <component :is="item.icon" class="mr-2 h-5 w-5" />
            {{ item.label }}
          </Button>
        </router-link>
      </nav>
      <Separator />
      <div class="p-2 text-xs text-muted-foreground">
        © {{ new Date().getFullYear() }} RiskWise
      </div>
    </aside>
    </template>
  
  <script setup>
  import { ref } from 'vue';
  import { useRoute } // useRoute untuk mendapatkan path saat ini
  from 'vue-router';
  import { Button } from '@/components/ui/button';
  import { Separator } from '@/components/ui/separator';
  import { useAuthStore } from '@/stores/authStore';
  
  // Impor ikon dari lucide-vue-next jika Anda menggunakannya
  // atau definisikan komponen ikon SVG Anda sendiri
  import {
    LayoutDashboard,
    Target,
    FileText, // Ganti ListChecks dengan FileText
    BarChart3,
    ShieldCheck,
    Cog,
  } from 'lucide-vue-next'; // Asumsi Anda akan menggunakan lucide-vue-next
  
  const authStore = useAuthStore();
  const route = useRoute(); // Dapatkan objek route saat ini
  
  const navItems = ref([
    { label: "Dasbor", href: "/", icon: LayoutDashboard, disabled: (isProfileComplete) => !isProfileComplete },
    { label: "Sasaran", href: "/goals", icon: Target, disabled: (isProfileComplete) => !isProfileComplete },
    { label: "Identifikasi Risiko", href: "/all-risks", icon: FileText, disabled: (isProfileComplete) => !isProfileComplete },
    { label: "Analisis Risiko", href: "/risk-analysis", icon: BarChart3, disabled: (isProfileComplete) => !isProfileComplete },
    { label: "Prioritas Risiko", href: "/risk-priority", icon: ShieldCheck, disabled: (isProfileComplete) => !isProfileComplete },
    { label: "Pengaturan", href: "/settings", icon: Cog, disabled: () => false },
  ]);
  
  const isActiveRoute = (navHref, currentPath) => {
    if (navHref === "/") {
      return currentPath === "/";
    }
    return currentPath.startsWith(navHref);
  };
  </script>