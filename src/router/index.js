// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import AppLayout from '@/components/layout/AppLayout.vue';
import LayoutFull from '@/components/layout/LayoutFull.vue'; // Impor LayoutFull
import { useAuthStore } from '@/stores/authStore'; // Impor auth store

const routes = [
  {
    path: '/',
    component: AppLayout,
    meta: { requiresAuth: true }, // Tandai bahwa rute ini dan turunannya memerlukan autentikasi
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
      // // ... (rute anak lainnya yang memerlukan AppLayout)
      // {
      //   path: 'settings',
      //   name: 'Settings',
      //   component: () => import('../views/SettingsView.vue'),
      //   meta: { title: 'Pengaturan' } // Pengaturan juga memerlukan auth
      // },
    ]
  },
  {
    path: '/auth', // Rute induk untuk halaman publik/autentikasi
    component: LayoutFull,
    children: [
      {
        path: 'login', // Akan menjadi /auth/login
        name: 'Login',
        component: () => import('../views/LoginView.vue'),
        meta: { guestOnly: true } // Hanya bisa diakses jika belum login
      },
      {
        path: 'register', // Akan menjadi /auth/register
        name: 'Register',
        component: () => import('../views/RegisterView.vue'),
        meta: { guestOnly: true } // Hanya bisa diakses jika belum login
      }
    ]
  },
  // Hapus rute /login dan /register yang lama jika ada
  // {
  //   path: '/profile-setup', // Halaman ini mungkin akan digabung ke /settings
  //   name: 'ProfileSetup',
  //   component: AppLayout, // Atau LayoutFull tergantung kebutuhan
  //   meta: { requiresAuth: true, profileIncompleteOnly: true }, // Contoh meta baru
  //   children: [
  //     {
  //       path: '',
  //       component: () => import('../views/SettingsView.vue'), // Arahkan ke SettingsView untuk setup
  //       props: { isSetupMode: true } // Kirim prop untuk menandakan mode setup
  //     }
  //   ]
  // },
  // Redirect lama /login dan /register ke path baru di bawah /auth
  { path: '/login', redirect: '/auth/login' },
  { path: '/register', redirect: '/auth/register' },

  // Catch-all untuk halaman tidak ditemukan (opsional)
  // { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('../views/NotFoundView.vue') }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

// Navigation Guard (authGuard)
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  // Pastikan status auth sudah diinisialisasi sebelum guard berjalan
  // Ini penting jika pengguna langsung membuka URL yang dilindungi
  if (authStore.loading && !authStore.currentUser) {
    await authStore.initializeAuth(); // Tunggu inisialisasi selesai
  }

  const isAuthenticated = authStore.isAuthenticated;
  const isProfileComplete = authStore.isProfileComplete;

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const guestOnly = to.matched.some(record => record.meta.guestOnly);
  // const profileIncompleteOnly = to.matched.some(record => record.meta.profileIncompleteOnly);

  console.log(`Navigating to: ${to.name}, Requires Auth: ${requiresAuth}, Guest Only: ${guestOnly}, Authenticated: ${isAuthenticated}, Profile Complete: ${isProfileComplete}`);

  if (requiresAuth && !isAuthenticated) {
    // Jika rute memerlukan auth dan pengguna tidak login, arahkan ke login
    console.log('Redirecting to Login because requiresAuth and not authenticated.');
    next({ name: 'Login', query: { redirect: to.fullPath } });
  } else if (guestOnly && isAuthenticated) {
    // Jika rute hanya untuk tamu (spt login/register) dan pengguna sudah login, arahkan ke dashboard
    console.log('Redirecting to Dashboard because guestOnly and authenticated.');
    next({ name: 'Dashboard' });
  } else if (requiresAuth && isAuthenticated && !isProfileComplete && to.name !== 'Settings') {
    // Jika rute memerlukan auth, pengguna login, TAPI profil belum lengkap,
    // dan tujuan BUKAN halaman Settings, arahkan ke Settings untuk melengkapi profil.
    console.log('Redirecting to Settings because requiresAuth, authenticated, but profile incomplete.');
    next({ name: 'Settings', query: { setup: 'true' } }); // query 'setup' bisa digunakan di SettingsView
  }
  // else if (profileIncompleteOnly && (!isAuthenticated || (isAuthenticated && isProfileComplete))) {
  //   // Jika rute hanya untuk profil yang belum lengkap,
  //   // tapi pengguna tidak login ATAU profil sudah lengkap, arahkan ke dashboard.
  //   console.log('Redirecting to Dashboard because profileIncompleteOnly condition not met.');
  //   next({ name: 'Dashboard' });
  // }
  else {
    // Jika tidak ada kondisi di atas yang terpenuhi, lanjutkan navigasi
    console.log('Proceeding with navigation.');
    next();
  }
});


export default router;