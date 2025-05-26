
"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Info, PlusCircle, Save, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { auth } from '@/lib/firebase/config';
import { updateProfile } from 'firebase/auth';
import { updateUserProfileData } from '@/services/userService';

const DEFAULT_PERIOD = new Date().getFullYear().toString();
const DEFAULT_AVAILABLE_PERIODS = [
  (new Date().getFullYear() - 1).toString(),
  DEFAULT_PERIOD,
  (new Date().getFullYear() + 1).toString()
];

export default function SettingsPage() {
  const { currentUser, appUser, loading: authLoading, refreshAppUser } = useAuth();
  
  const [newUprName, setNewUprName] = useState('');
  const [isSavingUprName, setIsSavingUprName] = useState(false);

  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [availablePeriodsState, setAvailablePeriodsState] = useState<string[]>([]);
  const [newPeriodInput, setNewPeriodInput] = useState('');
  const [isSavingPeriod, setIsSavingPeriod] = useState(false);
  const [isSavingNewPeriod, setIsSavingNewPeriod] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    if (appUser) {
      setNewUprName(appUser.displayName || appUser.uprId || '');
      setSelectedPeriod(appUser.activePeriod || DEFAULT_PERIOD);
      setAvailablePeriodsState(appUser.availablePeriods || [...DEFAULT_AVAILABLE_PERIODS]);
    } else if (!authLoading && !currentUser) {
      // Handle case where user is not logged in but page is accessed (though AppLayout should redirect)
      setNewUprName('UPR Pengguna');
      setSelectedPeriod(DEFAULT_PERIOD);
      setAvailablePeriodsState([...DEFAULT_AVAILABLE_PERIODS]);
    }
  }, [appUser, authLoading, currentUser]);

  const handleUprNameChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !appUser || !newUprName.trim() || newUprName.trim() === appUser.displayName) {
      toast({ title: "Tidak Ada Perubahan", description: "Nama UPR tidak berubah atau tidak valid.", variant: "default" });
      return;
    }
    setIsSavingUprName(true);
    try {
      // Update Firebase Auth display name
      await updateProfile(currentUser, { displayName: newUprName.trim() });
      
      // Update Firestore document
      await updateUserProfileData(currentUser.uid, { 
        displayName: newUprName.trim(),
        // uprId will be updated to new displayName by the service if displayName changes
      });
      
      await refreshAppUser(); // Refresh appUser in context
      toast({ title: "Nama UPR Diperbarui", description: `Nama UPR telah diubah menjadi "${newUprName.trim()}".` });
    } catch (error: any) {
      console.error("Error updating UPR name:", error);
      toast({ title: "Gagal Memperbarui Nama UPR", description: error.message || "Terjadi kesalahan.", variant: "destructive" });
    } finally {
      setIsSavingUprName(false);
    }
  };

  const handlePeriodChange = async (newPeriodValue: string) => {
    if (!currentUser || !appUser || !newPeriodValue || newPeriodValue === selectedPeriod) return;
    
    setIsSavingPeriod(true);
    try {
      await updateUserProfileData(currentUser.uid, { activePeriod: newPeriodValue });
      await refreshAppUser();
      setSelectedPeriod(newPeriodValue); 
      toast({ title: "Periode Aktif Diubah", description: `Periode aktif berhasil diatur ke ${newPeriodValue}.` });
      // No page reload needed if app relies on appUser context for period
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
    const currentPeriods = appUser.availablePeriods || [...DEFAULT_AVAILABLE_PERIODS];
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
      setAvailablePeriodsState(updatedPeriods); // Update local state for immediate UI feedback
      toast({ title: "Periode Ditambahkan", description: `Periode "${trimmedPeriod}" berhasil ditambahkan.` });
      setNewPeriodInput('');
    } catch (error: any) {
      console.error("Error adding new period:", error);
      toast({ title: "Gagal Menambah Periode", description: error.message || "Terjadi kesalahan.", variant: "destructive" });
    } finally {
      setIsSavingNewPeriod(false);
    }
  };

  if (authLoading || (!currentUser && !authLoading)) { // Show loading if auth is loading or if not logged in (AppLayout should redirect)
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat pengaturan...</p>
      </div>
    );
  }
  
  if (!appUser && currentUser && !authLoading) { // Logged in, but AppUser data still fetching
     return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat data profil untuk pengaturan...</p>
      </div>
    );
  }
  
  if (!currentUser || !appUser) { // Fallback if somehow user is not available after loading
     return (
         <div className="text-center py-10">
            <p className="text-muted-foreground">Silakan login untuk mengakses pengaturan.</p>
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
            Konfigurasikan UPR dan periode pelaporan aktif untuk aplikasi.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleUprNameChange} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="currentUprName">Nama UPR / Nama Pengguna</Label>
              <Input 
                id="currentUprName" 
                value={newUprName} 
                onChange={(e) => setNewUprName(e.target.value)}
                placeholder="Masukkan Nama UPR / Nama Pengguna baru"
                disabled={isSavingUprName}
              />
              <p className="text-xs text-muted-foreground flex items-center">
                <Info className="w-3 h-3 mr-1 shrink-0" /> Ini akan mengubah nama tampilan pengguna dan UPR ID Anda.
              </p>
            </div>
             <Button type="submit" disabled={isSavingUprName || !newUprName.trim() || newUprName.trim() === (appUser?.displayName || '')}>
                {isSavingUprName ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
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
              Mengubah periode aktif akan mempengaruhi data yang ditampilkan di seluruh aplikasi.
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
              {isSavingNewPeriod ? <Loader2 className="animate-spin mr-2" /> : <PlusCircle className="mr-2 h-4 w-4" />}
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
    </div>
  );
}
