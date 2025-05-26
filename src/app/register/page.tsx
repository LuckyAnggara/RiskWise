// src/app/register/page.tsx
"use client";

import React, { useState } from 'react';
import NextLink from 'next/link';
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

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [namaLengkap, setNamaLengkap] = useState(''); // Ditambahkan
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!namaLengkap.trim()) {
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

      // Update displayName di Firebase Auth
      if (firebaseUser) {
        await updateProfile(firebaseUser, { displayName: namaLengkap.trim() });
      }

      // Membuat/memperbarui dokumen pengguna di Firestore
      await checkAndCreateUserDocument(firebaseUser, 'userSatker', namaLengkap.trim()); 
      
      toast({ title: 'Registrasi Berhasil', description: 'Akun Anda telah berhasil dibuat. Silakan masuk.' });
      router.push('/login'); 
    
    } catch (authOrFirestoreError: any) {
      console.error("Kesalahan pada proses registrasi. Pesan:", authOrFirestoreError.message || String(authOrFirestoreError));
      let userMessage = "Terjadi kesalahan pada proses registrasi.";
      
      if (firebaseUser && authOrFirestoreError) { 
        // Auth user created, but Firestore/UPR part failed
        userMessage = `Registrasi Akun Berhasil, Profil/UPR Gagal Disimpan. Pesan: ${authOrFirestoreError.message || String(authOrFirestoreError)}. Silakan coba login atau hubungi administrator.`;
      } else if (authOrFirestoreError && authOrFirestoreError.code) { 
        // Error from Firebase Auth
        switch (authOrFirestoreError.code) {
          case 'auth/email-already-in-use':
            userMessage = 'Alamat email ini sudah terdaftar.';
            break;
          case 'auth/weak-password':
            userMessage = 'Password terlalu lemah. Minimal 6 karakter.';
            break;
          case 'auth/invalid-email':
            userMessage = 'Format email tidak valid.';
            break;
          default:
            userMessage = `Registrasi Akun Gagal: ${authOrFirestoreError.message || 'Error tidak diketahui.'}`;
        }
      } else if (authOrFirestoreError instanceof Error) {
            userMessage = `Registrasi Akun Gagal. Pesan: ${authOrFirestoreError.message}`;
      }
      toast({ 
        title: firebaseUser ? 'Registrasi Akun Berhasil, Profil/UPR Gagal Disimpan' : 'Registrasi Akun Gagal', 
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
              <Label htmlFor="namaLengkap">Nama Lengkap (Ini akan menjadi Nama UPR Anda)</Label>
              <Input
                id="namaLengkap"
                type="text"
                placeholder="Masukkan nama lengkap Anda"
                value={namaLengkap}
                onChange={(e) => setNamaLengkap(e.target.value)}
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
          <NextLink href="/login" className="text-primary hover:underline">
            Sudah punya akun? Masuk di sini
          </NextLink>
           <p className="text-muted-foreground">&copy; {new Date().getFullYear()} RiskWise. Aplikasi Manajemen Risiko.</p>
        </CardFooter>
      </Card>
    </div>
  );
}
