
// src/app/profile-setup/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { updateUserProfileData } from '@/services/userService';
import { AppLogo } from '@/components/icons';

const DEFAULT_INITIAL_PERIOD = new Date().getFullYear().toString();

export default function ProfileSetupPage() {
  const { currentUser, appUser, refreshAppUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [uprName, setUprName] = useState('');
  const [initialPeriod, setInitialPeriod] = useState(DEFAULT_INITIAL_PERIOD);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Jika pengguna sudah login dan profilnya sudah lengkap, arahkan ke dashboard
    if (!authLoading && currentUser && appUser && appUser.displayName && appUser.uprId && appUser.activePeriod && appUser.availablePeriods && appUser.availablePeriods.length > 0) {
      console.log("[ProfileSetupPage] Profile sudah lengkap, mengarahkan ke /");
      router.replace('/');
    }
    // Jika pengguna belum login sama sekali (seharusnya tidak terjadi karena AppLayout akan redirect ke login dulu)
    else if (!authLoading && !currentUser) {
        console.log("[ProfileSetupPage] Tidak ada pengguna, mengarahkan ke /login");
        router.replace('/login');
    }
  }, [currentUser, appUser, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast({ title: "Error", description: "Pengguna tidak ditemukan. Silakan login kembali.", variant: "destructive" });
      router.push('/login');
      return;
    }
    if (!uprName.trim()) {
      toast({ title: "Input Tidak Valid", description: "Nama UPR / Nama Lengkap harus diisi.", variant: "destructive" });
      return;
    }
    if (!/^\d{4}$/.test(initialPeriod.trim())) {
      toast({ title: "Format Periode Tidak Valid", description: "Tahun periode awal harus format YYYY (misalnya, 2024).", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      await updateUserProfileData(currentUser.uid, {
        displayName: uprName.trim(), // Ini juga akan mengatur uprId di userService
        activePeriod: initialPeriod.trim(),
        availablePeriods: [initialPeriod.trim()],
      });
      await refreshAppUser(); // PENTING: Refresh appUser di context
      toast({ title: "Profil Disimpan", description: "Pengaturan profil awal Anda telah berhasil disimpan." });
      router.push('/'); // Arahkan ke dashboard
    } catch (error: any) {
      console.error("Error saving initial profile:", error);
      toast({ title: "Gagal Menyimpan Profil", description: error.message || "Terjadi kesalahan saat menyimpan profil.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Menampilkan loading jika auth masih loading ATAU jika appUser masih null setelah auth selesai (menunggu fetchAppUser)
  // ATAU jika profile sudah lengkap (menunggu redirect)
  if (authLoading || (currentUser && !appUser) || (appUser && appUser.displayName && appUser.activePeriod)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Memuat data atau mengarahkan...</p>
      </div>
    );
  }


  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <AppLogo className="mx-auto h-12 w-12 text-primary mb-2" />
          <CardTitle className="text-2xl">Lengkapi Profil Anda</CardTitle>
          <CardDescription>Silakan isi nama UPR/Nama Lengkap dan periode awal Anda untuk melanjutkan.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1.5">
              <Label htmlFor="uprName">Nama UPR / Nama Lengkap Anda</Label>
              <Input
                id="uprName"
                type="text"
                placeholder="Masukkan Nama UPR atau Nama Lengkap Anda"
                value={uprName}
                onChange={(e) => setUprName(e.target.value)}
                required
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground">Nama ini akan digunakan sebagai identitas UPR Anda.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="initialPeriod">Tahun Periode Awal</Label>
              <Input
                id="initialPeriod"
                type="text"
                placeholder="YYYY (misalnya, 2024)"
                value={initialPeriod}
                onChange={(e) => setInitialPeriod(e.target.value)}
                required
                pattern="\d{4}"
                title="Masukkan tahun dalam format YYYY"
                disabled={isSaving}
              />
               <p className="text-xs text-muted-foreground">Ini akan menjadi periode aktif pertama Anda.</p>
            </div>
            <Button type="submit" className="w-full" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Simpan & Lanjutkan
            </Button>
          </form>
        </CardContent>
         <CardFooter className="text-center text-xs text-muted-foreground pt-4">
            <p>&copy; {new Date().getFullYear()} RiskWise. Aplikasi Manajemen Risiko.</p>
        </CardFooter>
      </Card>
    </div>
  );
}
