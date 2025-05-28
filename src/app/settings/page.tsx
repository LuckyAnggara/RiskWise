
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
import { updateProfile as updateFirebaseAuthProfile } from 'firebase/auth';
import { updateUserProfileData } from '@/services/userService';
import type { MonitoringPeriodFrequency, AppUser } from '@/lib/types';
import { MONITORING_PERIOD_FREQUENCIES } from '@/lib/types';

const DEFAULT_INITIAL_PERIOD = new Date().getFullYear().toString();
const NO_FREQUENCY_SENTINEL = "__NONE__";

export default function SettingsPage() {
  const { currentUser, appUser, loading: authLoading, refreshAppUser, isProfileComplete } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  // State untuk form Nama UPR/Pengguna
  const [formDisplayName, setFormDisplayName] = useState('');
  const [isSavingDisplayName, setIsSavingDisplayName] = useState(false);

  // State untuk form Periode Aktif
  const [formActivePeriod, setFormActivePeriod] = useState('');
  const [isSavingActivePeriod, setIsSavingActivePeriod] = useState(false);

  // State untuk form Tambah Periode Baru
  const [newPeriodInput, setNewPeriodInput] = useState('');
  const [isSavingNewPeriod, setIsSavingNewPeriod] = useState(false);
  
  // State untuk form Selera Risiko
  const [formRiskAppetite, setFormRiskAppetite] = useState<string>("5"); // Simpan sebagai string untuk input
  const [isSavingRiskAppetite, setIsSavingRiskAppetite] = useState(false);
  
  // State untuk form Pengaturan Periode Pemantauan Standar
  const [formDefaultMonitoringFrequency, setFormDefaultMonitoringFrequency] = useState<MonitoringPeriodFrequency | ''>('');
  const [isSavingMonitoringSettings, setIsSavingMonitoringSettings] = useState(false);


  useEffect(() => {
    if (appUser) {
      setFormDisplayName(appUser.displayName || '');
      setFormActivePeriod(appUser.activePeriod || '');
      // availablePeriodsState akan diambil langsung dari appUser.availablePeriods di JSX
      setFormDefaultMonitoringFrequency(appUser.monitoringSettings?.defaultFrequency || '');
      setFormRiskAppetite(appUser.riskAppetite !== null && appUser.riskAppetite !== undefined ? String(appUser.riskAppetite) : "5");

      // Jika profil belum lengkap, set nilai default untuk periode awal
      if (!isProfileComplete && !appUser.activePeriod && !appUser.displayName) {
        setFormActivePeriod(DEFAULT_INITIAL_PERIOD); // Ini akan menjadi nilai untuk 'Tahun Periode Awal'
        setFormDisplayName(currentUser?.displayName || currentUser?.email?.split('@')[0] || '');
      }
    } else if (!authLoading && currentUser) {
      // Kasus pengguna baru, sebelum appUser ada, set default
      setFormDisplayName(currentUser.displayName || currentUser.email?.split('@')[0] || '');
      setFormActivePeriod(DEFAULT_INITIAL_PERIOD);
      setFormRiskAppetite("5");
    }
  }, [appUser, authLoading, currentUser, isProfileComplete]);


  const handleProfileSetupOrDisplayNameSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast({ title: "Otentikasi Diperlukan", description: "Sesi Anda mungkin telah berakhir.", variant: "destructive" });
      router.push('/login');
      return;
    }
    if (!formDisplayName.trim()) {
      toast({ title: "Input Tidak Valid", description: "Nama UPR / Nama Pengguna harus diisi.", variant: "destructive" });
      return;
    }

    setIsSavingDisplayName(true); // Gunakan state yang sama untuk setup awal dan update nama
    
    const dataToSave: Partial<AppUser> = {
        displayName: formDisplayName.trim(),
        uprId: formDisplayName.trim(), // uprId disamakan dengan displayName
    };

    if (!isProfileComplete) { // Jika ini adalah setup profil awal
        if (!formActivePeriod.trim() || !/^\d{4}(?:[-\/](?:S[1-2]|Q[1-4]|(?:\d{4})))?$/i.test(formActivePeriod.trim())) {
            toast({ title: "Format Periode Awal Tidak Valid", description: "Gunakan format YYYY, YYYY/YYYY, atau YYYY-S1/S2/Q1-Q4.", variant: "destructive" });
            setIsSavingDisplayName(false);
            return;
        }
        dataToSave.activePeriod = formActivePeriod.trim();
        dataToSave.availablePeriods = [formActivePeriod.trim()];
        
        const riskAppetiteNum = parseInt(formRiskAppetite, 10);
        dataToSave.riskAppetite = !isNaN(riskAppetiteNum) ? riskAppetiteNum : 5;
        
        const freqToSave = formDefaultMonitoringFrequency === NO_FREQUENCY_SENTINEL ? null : formDefaultMonitoringFrequency;
        dataToSave.monitoringSettings = { defaultFrequency: freqToSave || null };
    }


    try {
      if (auth.currentUser && auth.currentUser.displayName !== formDisplayName.trim()) {
        await updateFirebaseAuthProfile(auth.currentUser, { displayName: formDisplayName.trim() });
      }
      await updateUserProfileData(currentUser.uid, dataToSave);
      await refreshAppUser();
      toast({ title: "Profil Disimpan", description: "Pengaturan profil Anda telah berhasil disimpan." });
      if (!isProfileComplete) {
        router.push('/'); // Arahkan ke dashboard setelah setup awal berhasil
      }
    } catch (error: any) {
      console.error("Error saving profile data:", error);
      toast({ title: "Gagal Menyimpan Profil", description: error.message || "Terjadi kesalahan.", variant: "destructive" });
    } finally {
      setIsSavingDisplayName(false);
    }
  };


  const handleActivePeriodChange = async (newPeriodValue: string) => {
    if (!currentUser || !appUser || !newPeriodValue || newPeriodValue === appUser.activePeriod) return;
    
    setIsSavingActivePeriod(true);
    try {
      await updateUserProfileData(currentUser.uid, { activePeriod: newPeriodValue });
      await refreshAppUser(); 
      setFormActivePeriod(newPeriodValue); 
      
      toast({ title: "Periode Aktif Diubah", description: `Periode aktif berhasil diatur ke ${newPeriodValue}. Halaman akan dimuat ulang.` });
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      console.error("Error updating active period:", error);
      toast({ title: "Gagal Mengubah Periode", description: error.message || "Terjadi kesalahan.", variant: "destructive" });
    } finally {
      setIsSavingActivePeriod(false);
    }
  };

  const handleAddNewPeriod = async () => {
    if (!currentUser || !appUser) return;
    if (!newPeriodInput.trim()) {
      toast({ title: "Kesalahan", description: "Periode tidak boleh kosong.", variant: "destructive" });
      return;
    }
    if (!/^\d{4}(?:[-\/](?:S[1-2]|Q[1-4]|(?:\d{4})))?$/i.test(newPeriodInput.trim())) {
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
      // availablePeriodsState akan diupdate oleh useEffect dari appUser
      toast({ title: "Periode Ditambahkan", description: `Periode "${trimmedPeriod}" berhasil ditambahkan.` });
      setNewPeriodInput('');
    } catch (error: any) {
      console.error("Error adding new period:", error);
      toast({ title: "Gagal Menambah Periode", description: error.message || "Terjadi kesalahan.", variant: "destructive" });
    } finally {
      setIsSavingNewPeriod(false);
    }
  };

  const handleSaveRiskAppetite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !appUser) return;
    const appetiteValue = parseInt(formRiskAppetite, 10);
    if (isNaN(appetiteValue) || appetiteValue < 1 || appetiteValue > 25) {
        toast({ title: "Nilai Tidak Valid", description: "Selera Risiko harus berupa angka antara 1 dan 25.", variant: "destructive"});
        return;
    }
    setIsSavingRiskAppetite(true);
    try {
      await updateUserProfileData(currentUser.uid, { riskAppetite: appetiteValue });
      await refreshAppUser();
      toast({ title: "Selera Risiko Disimpan", description: `Selera risiko berhasil diatur ke ${appetiteValue}.` });
    } catch (error: any) {
      console.error("Error saving risk appetite:", error);
      toast({ title: "Gagal Menyimpan Selera Risiko", description: error.message || "Terjadi kesalahan.", variant: "destructive" });
    } finally {
      setIsSavingRiskAppetite(false);
    }
  };

  const handleSaveMonitoringSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !appUser) return;
    setIsSavingMonitoringSettings(true);
    try {
      const frequencyToSave = formDefaultMonitoringFrequency === NO_FREQUENCY_SENTINEL ? null : formDefaultMonitoringFrequency;
      await updateUserProfileData(currentUser.uid, {
        monitoringSettings: { defaultFrequency: frequencyToSave || null }
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
  

  if (authLoading || (currentUser && !appUser && !authLoading && !isProfileComplete)) { // Menunggu appUser terisi, terutama saat setup awal
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat data pengaturan...</p>
      </div>
    );
  }
  
  if (!currentUser && !authLoading) {
     return (
         <div className="text-center py-10">
            <p className="text-muted-foreground">Silakan login untuk mengakses pengaturan.</p>
            <Button onClick={() => router.push('/login')} className="mt-4">Ke Halaman Login</Button>
        </div>
    );
  }
  
  // Logika untuk halaman setup profil awal jika belum lengkap
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
            <form onSubmit={handleProfileSetupOrDisplayNameSave} className="space-y-6">
              <div className="space-y-1.5">
                <Label htmlFor="setupDisplayName">Nama UPR / Nama Pengguna Anda</Label>
                <Input 
                  id="setupDisplayName" 
                  value={formDisplayName} 
                  onChange={(e) => setFormDisplayName(e.target.value)}
                  placeholder="Masukkan Nama UPR atau Nama Pengguna Anda"
                  disabled={isSavingDisplayName}
                  required
                />
                <p className="text-xs text-muted-foreground">Nama ini akan digunakan sebagai identitas UPR Anda.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="setupInitialPeriod">Tahun Periode Awal</Label>
                <Input
                  id="setupInitialPeriod"
                  type="text"
                  placeholder="YYYY atau YYYY/YYYY atau YYYY-S1/Q1"
                  value={formActivePeriod} // Menggunakan formActivePeriod untuk setup awal juga
                  onChange={(e) => setFormActivePeriod(e.target.value)}
                  required
                  pattern="\d{4}(?:[-\/](?:S[1-2]|Q[1-4]|(?:\d{4})))?"
                  title="Masukkan tahun dalam format YYYY, YYYY/YYYY atau YYYY-S1/S2/Q1-Q4"
                  disabled={isSavingDisplayName}
                />
                <p className="text-xs text-muted-foreground">Ini akan menjadi periode aktif pertama Anda dan ditambahkan ke daftar periode.</p>
              </div>
               <div className="space-y-1.5">
                <Label htmlFor="setupRiskAppetite">Selera Risiko Awal (1-25)</Label>
                <Input
                  id="setupRiskAppetite"
                  type="number"
                  min="1"
                  max="25"
                  value={formRiskAppetite}
                  onChange={(e) => setFormRiskAppetite(e.target.value)}
                  disabled={isSavingDisplayName}
                />
              </div>
               <div className="space-y-1.5">
                <Label htmlFor="setupDefaultMonitoringFrequency">Frekuensi Pemantauan Standar (Opsional)</Label>
                <Select 
                    value={formDefaultMonitoringFrequency || NO_FREQUENCY_SENTINEL} 
                    onValueChange={(value) => setFormDefaultMonitoringFrequency(value === NO_FREQUENCY_SENTINEL ? '' : value as MonitoringPeriodFrequency)}
                    disabled={isSavingDisplayName}
                >
                  <SelectTrigger id="setupDefaultMonitoringFrequency">
                    <SelectValue placeholder="Pilih frekuensi standar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_FREQUENCY_SENTINEL}>_Tidak Diatur_</SelectItem>
                    {MONITORING_PERIOD_FREQUENCIES.map(freq => (
                      <SelectItem key={freq} value={freq}>{freq}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={isSavingDisplayName} className="w-full">
                {isSavingDisplayName ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
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
          <CardTitle>Profil Pengguna & UPR</CardTitle>
          <CardDescription>
            Perbarui Nama UPR/Nama Pengguna Anda.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSetupOrDisplayNameSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="currentDisplayName">Nama UPR / Nama Pengguna</Label>
              <Input 
                id="currentDisplayName" 
                value={formDisplayName} 
                onChange={(e) => setFormDisplayName(e.target.value)}
                placeholder="Masukkan Nama UPR / Nama Pengguna baru"
                disabled={isSavingDisplayName}
              />
              <p className="text-xs text-muted-foreground flex items-center">
                <Info className="w-3 h-3 mr-1 shrink-0" /> ID UPR Anda akan sama dengan nama ini.
              </p>
            </div>
             <Button type="submit" disabled={isSavingDisplayName || !formDisplayName.trim() || formDisplayName.trim() === (appUser?.displayName || '')}>
                {isSavingDisplayName ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                Simpan Nama UPR/Pengguna
              </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Manajemen Periode</CardTitle>
            <CardDescription>Atur periode aktif dan tambahkan periode pelaporan baru.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-1.5">
                <Label htmlFor="currentPeriod">Periode Aktif</Label>
                <div className="flex items-center gap-2">
                <Select 
                    value={formActivePeriod} 
                    onValueChange={handleActivePeriodChange}
                    disabled={isSavingActivePeriod || (appUser?.availablePeriods || []).length === 0}
                >
                    <SelectTrigger id="currentPeriod" className="w-full md:w-[280px]">
                    <SelectValue placeholder="Pilih periode" />
                    </SelectTrigger>
                    <SelectContent>
                    {(appUser?.availablePeriods || []).length > 0 ? (
                        (appUser?.availablePeriods || []).map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))
                    ) : (
                        <SelectItem value="no-periods" disabled>Tidak ada periode yang ditentukan.</SelectItem>
                    )}
                    </SelectContent>
                </Select>
                {isSavingActivePeriod && <Loader2 className="animate-spin h-5 w-5 text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground">
                Mengubah periode aktif akan memuat ulang aplikasi dan data yang relevan.
                </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end gap-2 pt-4 border-t">
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
                {(appUser?.availablePeriods || []).length > 0 ? (
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                    {(appUser?.availablePeriods || []).map(p => <li key={p}>{p}</li>)}
                </ul>
                ) : (
                <p className="text-sm text-muted-foreground">Belum ada periode yang ditentukan.</p>
                )}
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pengaturan Selera Risiko</CardTitle>
          <CardDescription>Tentukan batas skor tingkat risiko yang dianggap dapat diterima oleh UPR Anda.</CardDescription>
        </CardHeader>
        <CardContent>
            <form onSubmit={handleSaveRiskAppetite} className="space-y-4">
                <div className="space-y-1.5">
                    <Label htmlFor="riskAppetite">Selera Risiko (1-25)</Label>
                    <Input
                        id="riskAppetite"
                        type="number"
                        min="1"
                        max="25"
                        value={formRiskAppetite}
                        onChange={(e) => setFormRiskAppetite(e.target.value)}
                        className="w-full md:w-[120px]"
                        disabled={isSavingRiskAppetite}
                    />
                    <p className="text-xs text-muted-foreground">
                        Penyebab risiko dengan skor tingkat risiko di bawah atau sama dengan nilai ini mungkin tidak memerlukan tindakan pengendalian prioritas tinggi.
                    </p>
                </div>
                <Button type="submit" disabled={isSavingRiskAppetite}>
                    {isSavingRiskAppetite ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                    Simpan Selera Risiko
                </Button>
            </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pengaturan Periode Pemantauan Standar</CardTitle>
          <CardDescription>Pilih frekuensi standar untuk pemantauan risiko. Ini akan digunakan sebagai default saat membuat sesi pemantauan baru.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveMonitoringSettings} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="defaultMonitoringFrequency">Frekuensi Pemantauan Standar</Label>
                <Select 
                    value={formDefaultMonitoringFrequency || NO_FREQUENCY_SENTINEL} 
                    onValueChange={(value) => setFormDefaultMonitoringFrequency(value === NO_FREQUENCY_SENTINEL ? '' : value as MonitoringPeriodFrequency)}
                    disabled={isSavingMonitoringSettings}
                >
                  <SelectTrigger id="defaultMonitoringFrequency" className="w-full md:w-[280px]">
                    <SelectValue placeholder="Pilih frekuensi standar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_FREQUENCY_SENTINEL}>_Tidak Diatur_</SelectItem>
                    {MONITORING_PERIOD_FREQUENCIES.map(freq => (
                      <SelectItem key={freq} value={freq}>{freq}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={isSavingMonitoringSettings}>
                {isSavingMonitoringSettings ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                Simpan Pengaturan Pemantauan
              </Button>
          </form>
        </CardContent>
      </Card>

    </div>
  );
}
