// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
// Import Supabase client
import { supabase } from '@/lib/supabaseClient'

import AppLayout from '@/components/layout/AppLayout.vue';
import LayoutFull from '@/components/layout/LayoutFull.vue';
import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';

const routes = [
  {
    path: '/',
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('../views/DashboardView.vue'),
        meta: { title: 'Dasbor Risiko' }
      },
      // {
      //   path: 'goals',
      //   name: 'Goals',
      //   component: () => import('../views/GoalsView.vue'),
      //   meta: { title: 'Sasaran' }
      // },
      // {
      //   path: 'all-risks',
      //   name: 'AllRisks',
      //   component: () => import('../views/AllRisksView.vue'), // Ganti dengan nama view yang benar
      //   meta: { title: 'Identifikasi Risiko' }
      // },
      // {
      //   path: 'all-risks/manage/:potentialRiskId', // Untuk add & edit
      //   name: 'ManagePotentialRisk',
      //   component: () => import('../views/ManagePotentialRiskView.vue'), // Ganti dengan nama view yang benar
      //   meta: { title: 'Kelola Potensi Risiko', requiresAuth: true } // Pastikan ini juga terproteksi
      // },
      // {
      //   path: 'risk-analysis',
      //   name: 'RiskAnalysis',
      //   component: () => import('../views/RiskAnalysisView.vue'), // Ganti dengan nama view yang benar
      //   meta: { title: 'Analisis Risiko' }
      // },
      // {
      //   path: 'risk-cause-analysis/:riskCauseId',
      //   name: 'RiskCauseAnalysis',
      //   component: () => import('../views/RiskCauseAnalysisView.vue'), // Ganti dengan nama view yang benar
      //   meta: { title: 'Analisis Detail Penyebab Risiko', requiresAuth: true }
      // },
      // {
      //   path: 'control-measure-manage/:controlMeasureId',
      //   name: 'ManageControlMeasure',
      //   component: () => import('../views/ManageControlMeasureView.vue'), // Ganti dengan nama view yang benar
      //   meta: { title: 'Kelola Tindakan Pengendalian', requiresAuth: true }
      // },
      // {
      //   path: 'risk-priority',
      //   name: 'RiskPriority',
      //   component: () => import('../views/RiskPriorityView.vue'), // Ganti dengan nama view yang benar
      //   meta: { title: 'Prioritas Risiko' }
      // },
      // {
      //   path: 'monitoring',
      //   name: 'MonitoringSessions',
      //   component: () => import('../views/MonitoringSessionsView.vue'), // Ganti dengan nama view yang benar
      //   meta: { title: 'Pemantauan Risiko' }
      // },
      // {
      //   path: 'monitoring/new',
      //   name: 'NewMonitoringSession',
      //   component: () => import('../views/NewMonitoringSessionView.vue'), // Ganti dengan nama view yang benar
      //   meta: { title: 'Sesi Pemantauan Baru' }
      // },
      // {
      //   path: 'monitoring/:sessionId/conduct',
      //   name: 'ConductMonitoring',
      //   component: () => import('../views/ConductMonitoringView.vue'), // Ganti dengan nama view yang benar
      //   meta: { title: 'Pelaksanaan Pemantauan' }
      // },
      // {
      //   path: 'settings',
      //   name: 'Settings',
      //   component: () => import('../views/SettingsView.vue'),
      //   meta: { title: 'Pengaturan' }
      // },
    ]
  },
  {
    path: '/auth',
    component: LayoutFull,
    children: [
      {
        path: 'login',
        name: 'Login',
        component: () => import('../views/LoginView.vue'),
        meta: { guestOnly: true }
      },
      {
        path: 'register',
        name: 'Register',
        component: () => import('../views/RegisterView.vue'),
        meta: { guestOnly: true }
      }
    ]
  },
  {
    path: '/profile-setup',
    component: LayoutFull,
    meta: {
      requiresAuth: true,
      profileIncompleteOnly: true
    },
    children: [
      {
        path: '',
        name: 'ProfileSetup',
        component: () => import('../views/ProfileSetupView.vue'),
        meta: { title: 'Lengkapi Profil Anda' }
      }
    ]
  },
  { path: '/login', redirect: '/auth/login' },
  { path: '/register', redirect: '/auth/register' },

  // { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('../views/NotFoundView.vue') }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 };
    }
  }
});

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();
  const appStore = useAppStore();

  if (authStore.loadingInitial) {
    console.log("[Guard] Auth is still initializing (loadingInitial is true). Waiting...");
    const loadingPromise = new Promise(resolve => {
      const unsubscribe = authStore.$subscribe((mutation, state) => {
        if (!state.loadingInitial) { // Stop waiting when loadingInitial becomes false
          unsubscribe(); // Clean up the watcher
          resolve(true); // Resolve the promise indicating loading is done
        }
      });
      // Set a timeout to resolve the promise even if loadingInitial doesn't change
      setTimeout(() => {
        if (authStore.loadingInitial) { // If it's still loading after timeout
        }
        resolve();
      }, 2500); // Timeout bisa disesuaikan, misal 2.5 detik
    });
    console.log("[Guard] Finished waiting for loadingInitial. Current state:", authStore.loadingInitial);
  }

  const isAuthenticated = authStore.isAuthenticated;
  let isProfileComplete = appStore.isProfileComplete;

  // Jika user terautentikasi tapi appUser (profil publik) belum ada di store, coba fetch.
  // Ini penting jika fetchAppUserProfile di onAuthStateChange belum selesai atau terlewat.
  if (isAuthenticated && authStore.user && !appStore.appUser && !appStore.profileLoading) {
    console.log("[Guard] User is authenticated but appUser profile is still missing in store. Attempting to fetch profile...");
    await appStore.fetchAppUserProfile(authStore.user.id);
    isProfileComplete = appStore.isProfileComplete; // Update isProfileComplete setelah fetch
    console.log(`[Guard] Profile fetched from guard. isProfileComplete: ${isProfileComplete}`);
  }
  
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const guestOnly = to.matched.some(record => record.meta.guestOnly);
  const profileIncompleteOnly = to.matched.some(record => record.meta.profileIncompleteOnly);

  // Logging yang lebih detail
  console.log(
    `[Guard Decision Context] Path: ${to.path}, Name: ${to.name}`,
    `\n  isAuthenticated: ${isAuthenticated} (User ID: ${authStore.user?.id})`,
    `\n  isProfileComplete: ${isProfileComplete} (App User Display Name: ${appStore.appUser?.display_name})`,
    `\n  Requires Auth: ${requiresAuth}`,
    `\n  Guest Only: ${guestOnly}`,
    `\n  Profile Incomplete Only: ${profileIncompleteOnly}`
  );

  if (guestOnly && isAuthenticated) {
    console.log('[Guard Decision] Redirecting to Dashboard (guestOnly && isAuthenticated).');
    next({ name: 'Dashboard' });
  } else if (requiresAuth && !isAuthenticated) {
    console.log('[Guard Decision] Redirecting to Login (requiresAuth && !isAuthenticated).');
    next({ name: 'Login', query: { redirectFrom: to.fullPath } });
  } else if (requiresAuth && isAuthenticated && !isProfileComplete && to.name !== 'ProfileSetup' && to.name !== 'Settings') {
    console.log('[Guard Decision] Redirecting to ProfileSetup (isAuthenticated, !isProfileComplete, not ProfileSetup/Settings).');
    next({ name: 'ProfileSetup' });
  } else if (profileIncompleteOnly && isAuthenticated && isProfileComplete) {
    console.log('[Guard Decision] Redirecting to Dashboard (profileIncompleteOnly && isProfileComplete).');
    next({ name: 'Dashboard' });
  } else {
    console.log('[Guard Decision] Proceeding with navigation.');
    next();
  }
});

export default router;