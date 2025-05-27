
// src/app/login/page.tsx
"use client";

import React, { useState } from 'react';
import NextLink from 'next/link'; 
import { useRouter } from 'next/navigation';
import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogIn } from 'lucide-react';
import { AppLogo } from '@/components/icons';
import { checkAndCreateUserDocument } from '@/services/userService';

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 48 48" {...props} className="mr-2 h-5 w-5">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
    <path fill="none" d="M0 0h48v48H0z"></path>
  </svg>
);


export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    let firebaseUser: FirebaseUser | null = null;
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      firebaseUser = userCredential.user;
      
      // Pastikan dokumen pengguna ada/dibuat di Firestore
      // displayNameFromForm tidak diteruskan karena ini halaman login, bukan registrasi
      await checkAndCreateUserDocument(firebaseUser, 'userSatker'); 
      
      toast({ title: 'Login Berhasil', description: 'Selamat datang kembali!' });
      router.push('/'); // AppLayout akan menangani redirect ke profile-setup jika perlu
    } catch (error: any) {
      console.error("Kesalahan pada proses login email/password:", error.message || String(error));
      let toastTitle = 'Login Gagal';
      let toastDescription = 'Terjadi kesalahan. Silakan coba lagi.';

      if (firebaseUser && error instanceof Error) { // Auth berhasil, tapi Firestore gagal
        toastTitle = 'Autentikasi Berhasil, Profil Gagal Disinkronkan';
        toastDescription = `Gagal menyimpan/memperbarui profil Anda di database: ${error.message}. Silakan coba lagi atau hubungi administrator.`;
        // Tetap arahkan, AppLayout akan handle jika profil belum lengkap
        router.push('/'); 
      } else if (error && error.code) { // Error dari Firebase Auth
        switch (error.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            toastDescription = 'Email atau password salah.';
            break;
          case 'auth/invalid-email':
            toastDescription = 'Format email tidak valid.';
            break;
          case 'auth/user-disabled':
            toastDescription = 'Akun pengguna ini telah dinonaktifkan.';
            break;
          default:
            toastDescription = `Login gagal: ${(error as Error).message || 'Error tidak diketahui.'}`;
        }
      } else if (error instanceof Error) {
          toastDescription = error.message;
      }
      toast({ title: toastTitle, description: toastDescription, variant: 'destructive', duration: 7000 });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const provider = new GoogleAuthProvider();
    let firebaseUser: FirebaseUser | null = null;
    try {
      const result = await signInWithPopup(auth, provider);
      firebaseUser = result.user;
      
      // displayNameFromForm tidak diteruskan, userService akan menggunakan displayName dari Google
      await checkAndCreateUserDocument(firebaseUser, 'userSatker');
      
      toast({ title: 'Login Google Berhasil', description: `Selamat datang, ${firebaseUser.displayName || firebaseUser.email}!` });
      router.push('/'); // AppLayout akan menangani redirect ke profile-setup jika perlu
    } catch (error: any) {
      console.error("Kesalahan pada proses login Google:", error.message || String(error));
      let toastTitle = 'Login Google Gagal';
      let toastDescription = 'Terjadi kesalahan. Silakan coba lagi.';

      if (firebaseUser && error instanceof Error) { 
         toastTitle = 'Autentikasi Google Berhasil, Profil Gagal Disinkronkan';
         toastDescription = `Gagal menyimpan/memperbarui profil Anda di database: ${error.message}. Silakan coba lagi atau hubungi administrator.`;
         router.push('/');
      } else if (error && error.code) {
            switch (error.code) {
                case 'auth/popup-closed-by-user':
                toastDescription = 'Proses login Google dibatalkan oleh pengguna.';
                break;
                case 'auth/account-exists-with-different-credential':
                toastDescription = 'Akun sudah ada dengan metode login lain. Coba masuk dengan metode tersebut.';
                break;
                default:
                toastDescription = `Login Google gagal: ${(error as Error).message || 'Error tidak diketahui.'}`;
            }
        } else if (error instanceof Error) {
            toastDescription = error.message;
        }
      toast({ title: toastTitle, description: toastDescription, variant: 'destructive', duration: 7000 });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <AppLogo className="mx-auto h-12 w-12 text-primary mb-2" />
          <CardTitle className="text-2xl">Masuk ke RiskWise</CardTitle>
          <CardDescription>Masuk dengan akun Anda atau Google.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@contoh.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading || isGoogleLoading}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading || isGoogleLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="mr-2 h-4 w-4" />
              )}
              Masuk dengan Email
            </Button>
          </form>
          
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Atau
              </span>
            </div>
          </div>

          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleGoogleSignIn} 
            disabled={isGoogleLoading || isLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            Masuk dengan Google
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-2 text-xs">
          <NextLink href="/register" className="text-primary hover:underline">
            Belum punya akun? Daftar di sini
          </NextLink>
           <p className="text-muted-foreground">&copy; {new Date().getFullYear()} RiskWise. Aplikasi Manajemen Risiko.</p>
        </CardFooter>
      </Card>
    </div>
  );
}
