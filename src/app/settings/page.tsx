
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Info, PlusCircle, Save, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { auth } from '@/lib/firebase/config';
import { updateProfile as updateFirebaseAuthProfile } from 'firebase/auth'; // Alias untuk menghindari konflik nama
import { updateUserProfileData } from '@/services/userService';
import type { MonitoringPeriodFrequency } from '@/lib/types';
import { MONITORING_PERIOD_FREQUENCIES } from '@/lib/types';


export default function SettingsPage() {
  const { currentUser, appUser, loading: authLoading, refreshAppUser, isProfileComplete } = useAuth();
  const router = useRouter();
  
  const [currentDisplayName, setCurrentDisplayName] = useState('');
  const [isSavingDisplayName, setIsSavingDisplayName] = useState(false);

  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [availablePeriodsState, setAvailablePeriodsState] = useState<string[]>([]);
  const [newPeriodInput, setNewPeriodInput] = useState('');
  const [isSavingPeriod, setIsSavingPeriod] = useState(false);
  const [isSavingNewPeriod, setIsSavingNewPeriod] = useState(false);
  
  const [initialPeriodInput, setInitialPeriodInput] = useState(() => new Date().getFullYear().toString());
  const [isSavingProfileSetup, setIsSavingProfileSetup] = useState(false);

  // State untuk Pengaturan Pemantauan
  const [defaultMonitoringFrequency, setDefaultMonitoringFrequency] = useState<MonitoringPeriodFrequency | ''>('');
  const [isSavingMonitoringSettings, setIsSavingMonitoringSettings] = useState(false);


  useEffect(() => {
    if (appUser) {
      setCurrentDisplayName(appUser.displayName || '');
      setSelectedPeriod(appUser.activePeriod || '');
      setAvailablePeriodsState(appUser.availablePeriods || []);
      setDefaultMonitoringFrequency(appUser.monitoringSettings?.defaultFrequency || '');
      if (!isProfileComplete && !appUser.activePeriod) {
        setInitialPeriodInput(new Date().getFullYear().toString());
      }
    } else if (!authLoading && currentUser) {
      setCurrentDisplayName(currentUser.displayName || currentUser.email?.split('@')[0] || '');
      setSelectedPeriod('');
      setAvailablePeriodsState([]);
      setDefaultMonitoringFrequency('');
    }
  }, [appUser, authLoading, currentUser, isProfileComplete]);


  const handleProfileSetupSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast({ title: "Otentikasi Diperlukan", description: "Sesi Anda mungkin telah berakhir. Silakan login kembali.", variant: "destructive" });
      router.push('/login');
      return;
    }
    if (!currentDisplayName.trim()) {
      toast({ title: "Input Tidak Valid", description: "Nama UPR / Nama Pengguna harus diisi.", variant: "destructive" });
      return;
    }
    if (!initialPeriodInput.trim() || !/^\d{4}$/.test(initialPeriodInput.trim())) {
      toast({ title: "Format Periode Tidak Valid", description: "Tahun periode awal harus format YYYY (misalnya, 2024).", variant: "destructive" });
      return;
    }

    setIsSavingProfileSetup(true);
    try {
      if (auth.currentUser && auth.currentUser.displayName !== currentDisplayName.trim()) {
        await updateFirebaseAuthProfile(auth.currentUser, { displayName: currentDisplayName.trim() });
      }
      
      const profileDataToSave = {
        displayName: currentDisplayName.trim(),
        activePeriod: initialPeriodInput.trim(),
        availablePeriods: [initialPeriodInput.trim()],
        monitoringSettings: { defaultFrequency: defaultMonitoringFrequency || null }
      };
      await updateUserProfileData(currentUser.uid, profileDataToSave);
      
      await refreshAppUser();
      toast({ title: "Profil Disimpan", description: "Pengaturan profil awal Anda telah berhasil disimpan." });
      router.push('/');
    } catch (error: any) {
      console.error("Error saving initial profile:", error);
      toast({ title: "Gagal Menyimpan Profil", description: error.message || "Terjadi kesalahan saat menyimpan profil.", variant: "destructive" });
    } finally {
      setIsSavingProfileSetup(false);
    }
  };


  const handleDisplayNameChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !appUser || !currentDisplayName.trim() || currentDisplayName.trim() === appUser.displayName) {
      toast({ title: "Tidak Ada Perubahan", description: "Nama UPR / Nama Pengguna tidak berubah atau tidak valid.", variant: "default" });
      return;
    }
    setIsSavingDisplayName(true);
    try {
      if (auth.currentUser && auth.currentUser.displayName !== currentDisplayName.trim()) {
        await updateFirebaseAuthProfile(auth.currentUser, { displayName: currentDisplayName.trim() });
      }
      await updateUserProfileData(currentUser.uid, { displayName: currentDisplayName.trim() });
      await refreshAppUser();
      toast({ title: "Nama UPR Diperbarui", description: `Nama UPR / Nama Pengguna telah diubah menjadi "${currentDisplayName.trim()}".` });
    } catch (error: any) {
      console.error("Error updating Display Name:", error);
      toast({ title: "Gagal Memperbarui Nama", description: error.message || "Terjadi kesalahan.", variant: "destructive" });
    } finally {
      setIsSavingDisplayName(false);
    }
  };

  const handlePeriodChange = async (newPeriodValue: string) => {
    if (!currentUser || !appUser || !newPeriodValue || newPeriodValue === appUser.activePeriod) return;
    
    setIsSavingPeriod(true);
    try {
      await updateUserProfileData(currentUser.uid, { activePeriod: newPeriodValue });
      await refreshAppUser(); // Refresh context
      setSelectedPeriod(newPeriodValue); // Update local state
      // Reload diperlukan agar semua data di store dan halaman lain ikut terupdate dengan periode baru
      window.location.reload(); 
      toast({ title: "Periode Aktif Diubah", description: `Periode aktif berhasil diatur ke ${newPeriodValue}. Halaman akan dimuat ulang.` });
    } catch (error: any) {
      console.error("Error updating active period:", error);
      toast({ title: "Gagal Mengubah Periode", description: error.message || "Terjadi kesalahan.", variant: "destructive" });
    } finally {
      setIsSavingPeriod(false);
    }
  };

  const handleAddNewPeriod = async () => {
    if (!currentUser || !appUser) return;
    if (!newPeriodInput.trim()) {
      toast({ title: "Kesalahan", description: "Periode tidak boleh kosong.", variant: "destructive" });
      return;
    }
    if (!/^\d{4}$/.test(newPeriodInput.trim()) && !/^\d{4}\/\d{4}$/.test(newPeriodInput.trim()) && !/^\d{4}-(S1|S2|Q1|Q2|Q3|Q4)$/i.test(newPeriodInput.trim())) {
      toast({ title: "Format Tidak Valid", description: "Gunakan format YYYY, YYYY/YYYY, atau YYYY-S1/S2/Q1-Q4.", variant: "destructive" });
      return;
    }

    setIsSavingNewPeriod(true);
    const currentPeriods = appUser.availablePeriods || [];
    const trimmedPeriod = newPeriodInput.trim();

    if (currentPeriods.includes(trimmedPeriod)) {
      toast({ title: "Periode Sudah Ada", description: `Periode "${trimmedPeriod}" sudah ada dalam daftar.`, variant: "default" });
      setIsSavingNewPeriod(false);
      setNewPeriodInput('');
      return;
    }

    const updatedPeriods = [...currentPeriods, trimmedPeriod].sort((a, b) => {
      const aYear = parseInt(a.substring(0,4));
      const bYear = parseInt(b.substring(0,4));
      if(aYear !== bYear) return aYear - bYear;
      return a.localeCompare(b);
    });

    try {
      await updateUserProfileData(currentUser.uid, { availablePeriods: updatedPeriods });
      await refreshAppUser();
      setAvailablePeriodsState(updatedPeriods);
      toast({ title: "Periode Ditambahkan", description: `Periode "${trimmedPeriod}" berhasil ditambahkan.` });
      setNewPeriodInput('');
    } catch (error: any) {
      console.error("Error adding new period:", error);
      toast({ title: "Gagal Menambah Periode", description: error.message || "Terjadi kesalahan.", variant: "destructive" });
    } finally {
      setIsSavingNewPeriod(false);
    }
  };

  const handleSaveMonitoringSettings = async () => {
    if (!currentUser || !appUser) return;
    setIsSavingMonitoringSettings(true);
    try {
      await updateUserProfileData(currentUser.uid, {
        monitoringSettings: { defaultFrequency: defaultMonitoringFrequency || null }
      });
      await refreshAppUser();
      toast({ title: "Pengaturan Pemantauan Disimpan", description: "Frekuensi pemantauan standar telah diperbarui." });
    } catch (error: any) {
      console.error("Error saving monitoring settings:", error);
      toast({ title: "Gagal Menyimpan Pengaturan", description: error.message || "Terjadi kesalahan.", variant: "destructive" });
    } finally {
      setIsSavingMonitoringSettings(false);
    }
  };
  
  const { toast } = useToast(); // Pindahkan hook toast ke sini agar bisa diakses oleh semua handler

  if (authLoading || (!currentUser && !authLoading)) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat pengaturan...</p>
      </div>
    );
  }
  
  if (!currentUser || (!appUser && !authLoading)) {
     return (
         <div className="text-center py-10">
            <p className="text-muted-foreground">Silakan login untuk mengakses pengaturan atau profil belum termuat.</p>
            <Button onClick={() => router.push('/login')} className="mt-4">Ke Halaman Login</Button>
        </div>
    );
  }
  
  if (!isProfileComplete && currentUser && appUser) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Lengkapi Profil Anda"
          description="Untuk melanjutkan, harap isi Nama UPR/Nama Pengguna dan Tahun Periode Awal Anda."
        />
        <Card className="max-w-lg mx-auto">
          <CardHeader>
            <CardTitle>Pengaturan Profil Awal</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSetupSave} className="space-y-6">
              <div className="space-y-1.5">
                <Label htmlFor="setupDisplayName">Nama UPR / Nama Pengguna Anda</Label>
                <Input 
                  id="setupDisplayName" 
                  value={currentDisplayName} 
                  onChange={(e) => setCurrentDisplayName(e.target.value)}
                  placeholder="Masukkan Nama UPR atau Nama Pengguna Anda"
                  disabled={isSavingProfileSetup}
                  required
                />
                <p className="text-xs text-muted-foreground">Nama ini akan digunakan sebagai identitas UPR Anda.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="setupInitialPeriod">Tahun Periode Awal</Label>
                <Input
                  id="setupInitialPeriod"
                  type="text"
                  placeholder="YYYY (misalnya, 2024)"
                  value={initialPeriodInput}
                  onChange={(e) => setInitialPeriodInput(e.target.value)}
                  required
                  pattern="\d{4}"
                  title="Masukkan tahun dalam format YYYY"
                  disabled={isSavingProfileSetup}
                />
                <p className="text-xs text-muted-foreground">Ini akan menjadi periode aktif pertama Anda.</p>
              </div>
               <div className="space-y-1.5">
                <Label htmlFor="setupDefaultMonitoringFrequency">Frekuensi Pemantauan Standar (Opsional)</Label>
                <Select value={defaultMonitoringFrequency} onValueChange={(value) => setDefaultMonitoringFrequency(value as MonitoringPeriodFrequency)}>
                  <SelectTrigger id="setupDefaultMonitoringFrequency" disabled={isSavingProfileSetup}>
                    <SelectValue placeholder="Pilih frekuensi standar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">_Tidak Ada_</SelectItem>
                    {MONITORING_PERIOD_FREQUENCIES.map(freq => (
                      <SelectItem key={freq} value={freq}>{freq}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={isSavingProfileSetup} className="w-full">
                {isSavingProfileSetup ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                Simpan & Lanjutkan
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan Aplikasi"
        description="Kelola pengaturan global untuk RiskWise."
      />

      <Card>
        <CardHeader>
          <CardTitle>Unit Pemilik Risiko (UPR) & Periode</CardTitle>
          <CardDescription>
            Konfigurasikan Nama UPR/Pengguna dan periode pelaporan aktif untuk aplikasi.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleDisplayNameChange} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="currentDisplayName">Nama UPR / Nama Pengguna</Label>
              <Input 
                id="currentDisplayName" 
                value={currentDisplayName} 
                onChange={(e) => setCurrentDisplayName(e.target.value)}
                placeholder="Masukkan Nama UPR / Nama Pengguna baru"
                disabled={isSavingDisplayName}
              />
              <p className="text-xs text-muted-foreground flex items-center">
                <Info className="w-3 h-3 mr-1 shrink-0" /> Ini akan mengubah nama tampilan pengguna dan UPR ID Anda.
              </p>
            </div>
             <Button type="submit" disabled={isSavingDisplayName || !currentDisplayName.trim() || currentDisplayName.trim() === (appUser?.displayName || '')}>
                {isSavingDisplayName ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                Simpan Nama UPR
              </Button>
          </form>

          <div className="space-y-1.5 pt-4 border-t">
            <Label htmlFor="currentPeriod">Periode Aktif</Label>
            <div className="flex items-center gap-2">
              <Select 
                value={selectedPeriod} 
                onValueChange={handlePeriodChange}
                disabled={isSavingPeriod || availablePeriodsState.length === 0}
              >
                <SelectTrigger id="currentPeriod" className="w-full md:w-[280px]">
                  <SelectValue placeholder="Pilih periode" />
                </SelectTrigger>
                <SelectContent>
                  {availablePeriodsState.length > 0 ? (
                    availablePeriodsState.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-periods" disabled>Tidak ada periode yang ditentukan.</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {isSavingPeriod && <Loader2 className="animate-spin h-5 w-5 text-primary" />}
            </div>
            <p className="text-xs text-muted-foreground">
              Mengubah periode aktif akan memuat ulang aplikasi.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kelola Periode yang Tersedia</CardTitle>
          <CardDescription>Tambahkan periode pelaporan baru ke sistem.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-2">
            <div className="flex-grow space-y-1.5">
              <Label htmlFor="newPeriod">Periode Baru (mis., 2026, 2025/2026, 2025-S1)</Label>
              <Input
                id="newPeriod"
                value={newPeriodInput}
                onChange={(e) => setNewPeriodInput(e.target.value)}
                placeholder="Masukkan periode baru"
                disabled={isSavingNewPeriod}
              />
            </div>
            <Button onClick={handleAddNewPeriod} type="button" className="w-full sm:w-auto" disabled={isSavingNewPeriod}>
              {isSavingNewPeriod ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
               Tambah Periode
            </Button>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-1">Periode yang Tersedia Saat Ini:</h4>
            {availablePeriodsState.length > 0 ? (
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                {availablePeriodsState.map(p => <li key={p}>{p}</li>)}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada periode yang ditentukan.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pengaturan Periode Pemantauan Standar</CardTitle>
          <CardDescription>Pilih frekuensi standar untuk pemantauan risiko. Ini akan digunakan sebagai default saat membuat sesi pemantauan baru.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <Label htmlFor="defaultMonitoringFrequency">Frekuensi Pemantauan Standar</Label>
            <Select value={defaultMonitoringFrequency} onValueChange={(value) => setDefaultMonitoringFrequency(value as MonitoringPeriodFrequency)}>
              <SelectTrigger id="defaultMonitoringFrequency" className="w-full md:w-[280px]" disabled={isSavingMonitoringSettings}>
                <SelectValue placeholder="Pilih frekuensi standar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">_Tidak Diatur_</SelectItem>
                {MONITORING_PERIOD_FREQUENCIES.map(freq => (
                  <SelectItem key={freq} value={freq}>{freq}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveMonitoringSettings} disabled={isSavingMonitoringSettings}>
            {isSavingMonitoringSettings ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
            Simpan Pengaturan Pemantauan
          </Button>
        </CardFooter>
      </Card>

    </div>
  );
}
