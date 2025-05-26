
// src/app/register/page.tsx
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, type User as FirebaseUser } from 'firebase/auth';
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
      
      // Attempt to create user document in Firestore
      try {
        await checkAndCreateUserDocument(firebaseUser, 'userSatker');
        toast({ title: 'Registrasi Berhasil', description: 'Akun Anda telah berhasil dibuat. Silakan masuk.' });
      } catch (firestoreError: any) {
        console.error("Error creating user document in Firestore:", firestoreError);
        // User was created in Auth, but Firestore document failed
        toast({ 
          title: 'Registrasi Akun Berhasil, Profil Gagal Disimpan', 
          description: 'Akun Anda telah dibuat, tetapi gagal menyimpan profil pengguna. Silakan coba login atau hubungi administrator.', 
          variant: 'destructive',
          duration: 7000 
        });
      }
      
      router.push('/login'); // Redirect to login after Auth user creation, regardless of Firestore profile status for now
    
    } catch (authError: any) {
      console.error("Error with email/password registration:", authError);
      let errorMessage = 'Gagal melakukan registrasi. Silakan coba lagi.';
      if (authError.code === 'auth/email-already-in-use') {
        errorMessage = 'Alamat email ini sudah terdaftar.';
      } else if (authError.code === 'auth/weak-password') {
        errorMessage = 'Password terlalu lemah. Minimal 6 karakter.';
      } else if (authError.code === 'auth/invalid-email') {
        errorMessage = 'Format email tidak valid.';
      }
      toast({ title: 'Registrasi Akun Gagal', description: errorMessage, variant: 'destructive' });
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
