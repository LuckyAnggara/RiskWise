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
import { checkAndCreateUserDocument } from '@/services/userService';
import { useAuth } from '@/contexts/auth-context'; // Import useAuth to potentially call refreshAppUser

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayNameFromForm, setDisplayNameFromForm] = useState(''); // For "Nama Lengkap"
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { refreshAppUser } = useAuth(); // Get refreshAppUser

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayNameFromForm.trim()) {
      toast({ title: 'Registrasi Gagal', description: 'Nama Lengkap harus diisi.', variant: 'destructive' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: 'Registrasi Gagal', description: 'Password dan konfirmasi password tidak cocok.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    let firebaseUser: FirebaseUser | null = null;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      firebaseUser = userCredential.user;

      // Update Firebase Auth profile displayName if Nama Lengkap is provided
      if (displayNameFromForm.trim()) {
        await updateProfile(firebaseUser, { displayName: displayNameFromForm.trim() });
      }

      // Call checkAndCreateUserDocument to ensure Firestore profile exists or is created
      // Pass displayNameFromForm explicitly.
      // In diagnostic mode, userService.checkAndCreateUserDocument will return a mock or null.
      await checkAndCreateUserDocument(firebaseUser, 'userSatker', displayNameFromForm.trim());
      
      // After successful user creation & profile check, trigger a refresh of appUser in AuthContext
      await refreshAppUser();

      toast({ title: 'Registrasi Berhasil', description: 'Akun Anda telah dibuat. Mengarahkan...' });
      router.push('/'); // AppLayout will handle redirect to /profile-setup if needed

    } catch (authOrProfileError: any) {
      const errorMessage = authOrProfileError instanceof Error && authOrProfileError.message 
        ? authOrProfileError.message 
        : String(authOrProfileError);
      console.error("Kesalahan pada proses registrasi (register page). Error type:", typeof authOrProfileError, "Message:", errorMessage);
      
      let userMessage = "Terjadi kesalahan pada proses registrasi.";
      
      if (authOrProfileError && authOrProfileError.code) { 
        switch (authOrProfileError.code) {
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
      } else { // Error likely from checkAndCreateUserDocument or other logic
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
              <Label htmlFor="displayNameFromForm">Nama Lengkap / Nama UPR</Label>
              <Input
                id="displayNameFromForm"
                type="text"
                placeholder="Masukkan Nama Lengkap Anda"
                value={displayNameFromForm}
                onChange={(e) => setDisplayNameFromForm(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
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
