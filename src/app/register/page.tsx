
// src/app/register/page.tsx
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus } from 'lucide-react';
import { AppLogo } from '@/components/icons';
// checkAndCreateUserDocument tidak lagi dipanggil dari sini

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // Input "Nama Lengkap" dan "Nama UPR" telah dihapus
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({ title: 'Registrasi Gagal', description: 'Password dan konfirmasi password tidak cocok.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    let firebaseUser: FirebaseUser | null = null;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      firebaseUser = userCredential.user;

      // Opsional: Update Firebase Auth profile displayName (jika menggunakan email sebagai basis nama awal)
      const initialDisplayName = email.split('@')[0]; // Atau logika lain jika diperlukan
      if (initialDisplayName) {
        await updateProfile(firebaseUser, { displayName: initialDisplayName });
      }

      // Tidak ada panggilan ke checkAndCreateUserDocument di sini.
      // Profil Firestore akan dibuat/dilengkapi di halaman Pengaturan.

      toast({ title: 'Akun Berhasil Dibuat', description: 'Silakan lengkapi profil Anda di halaman Pengaturan.' });
      router.push('/'); // Arahkan ke dashboard, AppLayout akan mengarahkan ke /settings jika profil belum lengkap

    } catch (error: any) {
      const errorMessage = error.message && typeof error.message === 'string' ? error.message : String(error);
      console.error("Kesalahan pada proses registrasi (register page):", errorMessage);
      let userMessage = "Terjadi kesalahan pada proses registrasi.";
      
      if (error && error.code) { 
        switch (error.code) {
          case 'auth/email-already-in-use':
            userMessage = 'Alamat email ini sudah terdaftar.';
            break;
          case 'auth/weak-password':
            userMessage = 'Password terlalu lemah. Minimal 6 karakter.';
            break;
          case 'auth/invalid-email':
            userMessage = 'Format email tidak valid.';
            break;
           case 'auth/network-request-failed':
             userMessage = 'Gagal terhubung ke server. Periksa koneksi internet Anda.';
             break;
          default:
            userMessage = `Registrasi Akun Gagal: ${errorMessage}`;
        }
      } else { 
        userMessage = `Registrasi Gagal: ${errorMessage}`;
      }

      toast({
        title: 'Registrasi Gagal',
        description: userMessage,
        variant: 'destructive',
        duration: 7000
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <AppLogo className="mx-auto h-12 w-12 text-primary mb-2" />
          <CardTitle className="text-2xl">Daftar Akun RiskWise</CardTitle>
          <CardDescription>Buat akun baru untuk memulai.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@contoh.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Ulangi password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Daftar
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-2 text-xs">
          <Link href="/login" className="text-primary hover:underline">
            Sudah punya akun? Masuk di sini
          </Link>
           <p className="text-muted-foreground">&copy; {new Date().getFullYear()} RiskWise. Aplikasi Manajemen Risiko.</p>
        </CardFooter>
      </Card>
    </div>
  );
}
