
// src/app/register/page.tsx
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, type User as FirebaseUser, updateProfile } from 'firebase/auth';
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
  // Nama Lengkap dan Nama UPR dihilangkan dari form
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

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

      // Tentukan displayName awal untuk pengguna baru dari email
      const initialDisplayName = email.split('@')[0] || `User_${firebaseUser.uid.substring(0,5)}`;

      if (firebaseUser) {
        try {
            // Update profile Firebase Auth dengan displayName awal
            await updateProfile(firebaseUser, { displayName: initialDisplayName });
        } catch (profileError: any) {
            console.warn("Gagal memperbarui profil Firebase Auth (displayName). Pesan:", (profileError instanceof Error ? profileError.message : String(profileError)));
            // Lanjutkan meskipun gagal update profile Auth, karena profil Firestore lebih penting untuk aplikasi ini
        }
      }
      
      // Buat/update dokumen pengguna di Firestore.
      // `checkAndCreateUserDocument` akan menggunakan `firebaseUser.displayName` (yang baru diupdate)
      // atau fallback jika masih null, dan akan mengatur uprId berdasarkan displayName tersebut.
      await checkAndCreateUserDocument(firebaseUser, 'userSatker'); 
      
      toast({ title: 'Registrasi Berhasil', description: 'Akun Anda telah berhasil dibuat. Silakan masuk.' });
      router.push('/login'); 
    
    } catch (error: any) {
      // Error ini bisa berasal dari createUserWithEmailAndPassword atau checkAndCreateUserDocument
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Kesalahan pada proses registrasi. Pesan:", errorMessage);
      
      let userMessage = "Terjadi kesalahan pada proses registrasi.";
      if (firebaseUser) { // Akun Auth berhasil dibuat, tapi Firestore/UPR gagal
        userMessage = `Registrasi Akun Berhasil, Profil Gagal Disimpan. Pesan: ${errorMessage}. Silakan coba login atau hubungi administrator.`;
      } else { // Pembuatan akun Auth itu sendiri yang gagal
        if (error.code === 'auth/email-already-in-use') {
          userMessage = 'Alamat email ini sudah terdaftar.';
        } else if (error.code === 'auth/weak-password') {
          userMessage = 'Password terlalu lemah. Minimal 6 karakter.';
        } else if (error.code === 'auth/invalid-email') {
          userMessage = 'Format email tidak valid.';
        } else {
          userMessage = `Registrasi Akun Gagal. Pesan: ${errorMessage}`;
        }
      }
      toast({ 
        title: firebaseUser ? 'Registrasi Sebagian Berhasil' : 'Registrasi Akun Gagal', 
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
            {/* Input Nama Lengkap dan Nama UPR dihilangkan */}
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
