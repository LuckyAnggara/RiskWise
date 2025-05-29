// src/stores/authStore.js
import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabaseClient'
import { useAppStore } from './appStore';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    loading: false, // Untuk loading umum (misalnya, email/password)
    error: null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.user,
  },
  actions: {
    // ... (initializeAuthListener, signUp, signOut yang sudah ada) ...

    async signInWithEmail(email, password) {
      this.loading = true;
      this.error = null;
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });
        if (error) throw error;
        // this.user = data.user; // onAuthStateChange akan menangani ini
        return { user: data.user, session: data.session, error: null };
      } catch (err) {
        console.error('Email/Password Sign-In error in store:', err);
        if (err.message.includes('Invalid login credentials')) {
            this.error = 'Email atau password salah.';
        } else if (err.message.includes('Email not confirmed')) {
            this.error = 'Email belum dikonfirmasi. Silakan cek email Anda.';
        } else {
            this.error = err.message || 'Login gagal.';
        }
        return { user: null, session: null, error: this.error };
      } finally {
        this.loading = false;
      }
    },

    async signInWithGoogle() {
      // State loading spesifik untuk Google bisa di-handle di komponen jika perlu,
      // atau tambahkan state `isGoogleLoading` di store ini jika ingin terpusat.
      // Untuk sekarang, kita asumsikan komponen yang memanggil akan menangani UI loadingnya sendiri.
      this.error = null;
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          // options: { // Opsi jika perlu redirect, tapi defaultnya popup
          //   redirectTo: window.location.origin + '/auth/callback', // Ganti dengan callback URL Anda jika perlu
          // },
        });
        if (error) throw error;
        
        // Untuk OAuth, Supabase akan me-redirect atau membuka popup.
        // Penanganan user setelah redirect/popup akan dilakukan oleh onAuthStateChange.
        // Jadi, kita tidak langsung mendapatkan 'user' di sini seperti pada signUp atau signInWithPassword.
        // Namun, jika tidak ada error, prosesnya berhasil dimulai.
        return { user: data?.user, session: data?.session, error: null }; // data mungkin null jika redirect
      } catch (err) {
        console.error('Google Sign-In error in store:', err);
         if (err.message.includes('Popup closed by user') || err.message.includes('Cancelled')) {
            this.error = 'Proses login Google dibatalkan.';
        } else if (err.message.includes('account-exists-with-different-credential')) {
            this.error = 'Akun sudah ada dengan metode login lain. Coba masuk dengan metode tersebut.';
        } else {
            this.error = err.message || 'Login Google gagal.';
        }
        return { user: null, session: null, error: this.error };
      }
    },
  },
})