import { defineStore } from 'pinia';
import { supabase } from '@/lib/supabaseClient';
import { useAppStore } from './appStore'; // Pastikan path ini benar

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    session: null, // Opsional: simpan seluruh objek sesi jika diperlukan
    loading: false, // Untuk loading spesifik per aksi (login, signup manual)
    error: null,
    loadingInitial: true, // Default true, menjadi false setelah status auth awal diketahui
  }),
  getters: {
    isAuthenticated: (state) => !!state.user,
  },
  actions: {
    async initializeAuthListener() {
      console.log('[AuthStore] initializeAuthListener: Starting...');
      // loadingInitial sudah true dari state default.

      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('[AuthStore] onAuthStateChange: Event:', event, 'Session User ID:', session?.user?.id);
        const appStore = useAppStore();
        const previousUserId = this.user?.id;

        this.user = session?.user ?? null;
        this.session = session ?? null;

        if (session?.user) {
          // Fetch profil jika:
          // 1. appUser belum dimuat (appStore.appUser adalah null)
          // 2. ID pengguna yang terautentikasi telah berubah
          // 3. Ini adalah event 'SIGNED_IN' (login baru, baik untuk memeriksa/mengambil profil)
          if (!appStore.appUser || appStore.appUser.id !== session.user.id || event === 'SIGNED_IN') {
            console.log(`[AuthStore] onAuthStateChange: Conditions met to fetch profile. appUser exists: ${!!appStore.appUser}, User ID changed: ${appStore.appUser?.id !== session.user.id}, Event: ${event}`);
            await appStore.fetchAppUserProfile(session.user.id);
          } else {
            console.log('[AuthStore] onAuthStateChange: User session still valid, profile likely loaded, or no need to re-fetch based on event.');
          }
        } else {
          console.log('[AuthStore] onAuthStateChange: No user session, clearing app profile.');
          appStore.clearAppUserProfile(); // Pastikan clearAppUserProfile juga mereset isProfileComplete
        }

        // Tandai bahwa inisialisasi awal selesai setelah event pertama yang relevan dari onAuthStateChange diproses.
        // Ini menandakan Supabase telah melaporkan status autentikasi awal.
        if (this.loadingInitial) {
            // Event apa pun yang memberi tahu kita status awal (ada sesi, tidak ada sesi, atau baru login/logout)
            // cukup untuk menandakan bahwa pemeriksaan awal selesai.
            if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT' || (session === null && (event === null || event === 'USER_DELETED' /* atau event lain yang menandakan tidak ada user */))) {
                this.loadingInitial = false;
                console.log(`[AuthStore] onAuthStateChange: Initial auth state determined (event: ${event}), loadingInitial set to false.`);
            }
        }
      });

      // Panggil getSession() secara eksplisit untuk memastikan onAuthStateChange terpicu
      // dengan 'INITIAL_SESSION' jika ada sesi yang sudah ada.
      try {
        console.log('[AuthStore] initializeAuthListener: Explicitly calling getSession()...');
        const { data: { session: currentSession }, error: getSessionError } = await supabase.auth.getSession();
        
        if (getSessionError) {
          console.error('[AuthStore] initializeAuthListener: Error from getSession():', getSessionError.message);
          // Jika getSession error, dan onAuthStateChange belum sempat mengubah loadingInitial,
          // kita set false di sini untuk mencegah aplikasi nge-hang.
          if (this.loadingInitial) {
            this.loadingInitial = false;
            console.log('[AuthStore] initializeAuthListener: Error in getSession(), loadingInitial forced to false.');
          }
        } else if (!currentSession && this.loadingInitial) {
          // Jika getSession() tidak mengembalikan sesi, dan onAuthStateChange belum mengubah loadingInitial
          // (misalnya, karena callback onAuthStateChange untuk sesi null masih pending),
          // kita set loadingInitial menjadi false.
          this.loadingInitial = false;
          console.log('[AuthStore] initializeAuthListener: No active session from getSession(), loadingInitial set to false (if not already set by onAuthStateChange).');
        } else if (currentSession) {
          console.log('[AuthStore] initializeAuthListener: Session found by getSession(). User ID:', currentSession.user.id);
          // Jika sesi ditemukan di sini, onAuthStateChange akan (atau sudah) terpicu dengan event 'INITIAL_SESSION'
          // dan akan menangani loadingInitial serta fetch profil.
        }
        console.log('[AuthStore] initializeAuthListener: getSession() call completed.');
      } catch (e) {
        console.error('[AuthStore] initializeAuthListener: Exception during getSession():', e.message);
        if (this.loadingInitial) {
          this.loadingInitial = false;
          console.log('[AuthStore] initializeAuthListener: Exception during getSession, loadingInitial forced to false.');
        }
      }
    },

    async signInWithEmail(email, password) {
      this.loading = true;
      this.error = null;
      try {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });
        if (signInError) throw signInError;
        // onAuthStateChange akan menangani pembaruan this.user dan fetch profil
        console.log('[AuthStore] signInWithEmail successful for:', email);
        return { user: data.user, session: data.session, error: null };
      } catch (err) {
        console.error('[AuthStore] signInWithEmail error:', err.message);
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
      this.error = null;
      try {
        // Untuk signInWithOAuth, user dan session biasanya didapatkan setelah redirect.
        // Jadi, kita tidak langsung mengupdate state user di sini.
        // onAuthStateChange akan menangani ini.
        const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          // options: { redirectTo: 'URL_CALLBACK_ANDA_JIKA_PERLU' }
        });
        if (oauthError) throw oauthError;
        console.log('[AuthStore] signInWithGoogle initiated.');
        // Tidak ada user/session yang langsung dikembalikan di sini jika menggunakan redirect.
        // Jika menggunakan popup dan berhasil, session mungkin ada di `data`.
        return { user: data?.user, session: data?.session, error: null };
      } catch (err) {
        console.error('[AuthStore] signInWithGoogle error:', err.message);
         if (err.message.includes('Popup closed by user') || err.message.includes('Cancelled')) {
            this.error = 'Proses login Google dibatalkan.';
        } else if (err.message.includes('account-exists-with-different-credential')) {
            // Error ini lebih sering muncul di Firebase, Supabase mungkin punya pesan berbeda.
            // Cek pesan error spesifik dari Supabase jika ini terjadi.
            this.error = 'Akun sudah ada dengan metode login lain.';
        } else {
            this.error = err.message || 'Login Google gagal.';
        }
        return { user: null, session: null, error: this.error };
      }
    },
    
    async signUp(email, password) {
      this.loading = true;
      this.error = null;
      try {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email,
          password: password,
          // Anda bisa menambahkan options di sini jika perlu, misalnya untuk data user_metadata awal
          // options: {
          //   data: {
          //     full_name: email.split('@')[0] // Contoh nama awal
          //   }
          // }
        });
        if (signUpError) throw signUpError;
        console.log('[AuthStore] signUp successful for:', email, 'User ID:', data.user?.id);
        // onAuthStateChange akan dipicu. Trigger database Anda (handle_new_user)
        // akan membuat entri di public.users.
        // Kemudian onAuthStateChange akan memanggil fetchAppUserProfile.
        return { user: data.user, session: data.session, error: null };
      } catch (err) {
        console.error('[AuthStore] signUp error:', err.message);
        if (err.message.includes('User already registered') || err.message.includes('already exists')) {
            this.error = 'Email ini sudah terdaftar.';
        } else if (err.message.includes('Password should be at least 6 characters')) {
            this.error = 'Password minimal 6 karakter.';
        } else if (err.message.includes('Unable to validate email address')) {
            this.error = 'Format email tidak valid.';
        }
        else {
            this.error = err.message || 'Registrasi gagal.';
        }
        return { user: null, session: null, error: this.error };
      } finally {
        this.loading = false;
      }
    },

    async signOut() {
      this.loading = true;
      this.error = null;
      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        console.log('[AuthStore] signOut successful.');
        // onAuthStateChange akan dipicu, meng-clear this.user
        // dan appStore.clearAppUserProfile() akan dipanggil dari sana.
      } catch (err) {
        this.error = err.message || 'Logout failed';
        console.error('[AuthStore] signOut error:', err.message);
      } finally {
        this.loading = false;
      }
    },
  },
});