
"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  initializeAppContext, 
  getCurrentPeriod, 
  setCurrentPeriod, 
  getAvailablePeriods, 
  addAvailablePeriod,
  setCurrentUprId as updateCurrentUprIdInContextStorage // Renamed import for clarity
} from '@/lib/upr-period-context';
import { Info, PlusCircle, Save, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { auth } from '@/lib/firebase/config';
import { updateProfile } from 'firebase/auth';
import { updateUserProfileData } from '@/services/userService';

export default function SettingsPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const [currentUprName, setCurrentUprName] = useState('');
  const [newUprName, setNewUprName] = useState('');
  const [isSavingUprName, setIsSavingUprName] = useState(false);

  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);
  const [newPeriodInput, setNewPeriodInput] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (currentUser) {
      const context = initializeAppContext(currentUser);
      setCurrentUprName(context.uprId); // UPR ID is user's displayName
      setNewUprName(context.uprId); // Initialize edit field
      setSelectedPeriod(context.period);
      setAvailablePeriods(context.availablePeriods);
    } else if (!authLoading) {
      // If not loading and no user, initialize with defaults (though user should be redirected)
      const context = initializeAppContext();
      setCurrentUprName(context.uprId);
      setNewUprName(context.uprId);
      setSelectedPeriod(context.period);
      setAvailablePeriods(context.availablePeriods);
    }
  }, [currentUser, authLoading]);

  const handleUprNameChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newUprName.trim() || newUprName.trim() === currentUprName) {
      toast({ title: "Tidak Ada Perubahan", description: "Nama UPR tidak berubah atau tidak valid.", variant: "default" });
      return;
    }
    setIsSavingUprName(true);
    try {
      await updateProfile(currentUser, { displayName: newUprName.trim() });
      await updateUserProfileData(currentUser.uid, { displayName: newUprName.trim() });
      
      updateCurrentUprIdInContextStorage(newUprName.trim()); // Update localStorage
      setCurrentUprName(newUprName.trim()); // Update local state

      toast({ title: "Nama UPR Diperbarui", description: `Nama UPR telah diubah menjadi "${newUprName.trim()}". Harap muat ulang halaman untuk melihat perubahan data di seluruh aplikasi.` });
      // Consider window.location.reload() for immediate effect across app data,
      // or more sophisticated state management to propagate this change.
      // For now, we inform the user.
    } catch (error: any) {
      console.error("Error updating UPR name:", error);
      toast({ title: "Gagal Memperbarui Nama UPR", description: error.message || "Terjadi kesalahan.", variant: "destructive" });
    } finally {
      setIsSavingUprName(false);
    }
  };

  const handlePeriodChange = (newPeriodValue: string) => {
    if (newPeriodValue && newPeriodValue !== selectedPeriod) {
      setCurrentPeriod(newPeriodValue); // This will update localStorage and reload
      setSelectedPeriod(newPeriodValue); 
      toast({ title: "Periode Diubah", description: `Periode aktif diatur ke ${newPeriodValue}. Halaman akan dimuat ulang.` });
    }
  };

  const handleAddNewPeriod = () => {
    if (!newPeriodInput.trim()) {
      toast({ title: "Kesalahan", description: "Periode tidak boleh kosong.", variant: "destructive" });
      return;
    }
    if (!/^\d{4}$/.test(newPeriodInput.trim()) && !/^\d{4}\/\d{4}$/.test(newPeriodInput.trim()) && !/^\d{4}-(S1|S2|Q1|Q2|Q3|Q4)$/i.test(newPeriodInput.trim())) {
      toast({ title: "Format Tidak Valid", description: "Gunakan format YYYY, YYYY/YYYY, atau YYYY-S1/S2/Q1-Q4.", variant: "destructive" });
      return;
    }
    const updatedPeriods = addAvailablePeriod(newPeriodInput.trim());
    setAvailablePeriods(updatedPeriods);
    if (!updatedPeriods.includes(selectedPeriod) && updatedPeriods.length > 0) {
      setSelectedPeriod(updatedPeriods[0]); 
    }
    toast({ title: "Periode Ditambahkan", description: `Periode "${newPeriodInput.trim()}" ditambahkan ke daftar yang tersedia.` });
    setNewPeriodInput('');
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat pengaturan...</p>
      </div>
    );
  }
  
  if (!currentUser) {
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
              <Label htmlFor="currentUprName">Nama UPR Saat Ini (Nama Pengguna)</Label>
              <Input 
                id="currentUprName" 
                value={newUprName} 
                onChange={(e) => setNewUprName(e.target.value)}
                placeholder="Masukkan Nama UPR / Nama Pengguna baru"
                disabled={isSavingUprName}
              />
              <p className="text-xs text-muted-foreground flex items-center">
                <Info className="w-3 h-3 mr-1 shrink-0" /> Mengubah ini akan mengubah nama pengguna Anda dan UPR ID yang digunakan untuk data baru. Data lama yang terkait dengan nama UPR sebelumnya tidak akan otomatis termigrasi.
              </p>
            </div>
             <Button type="submit" disabled={isSavingUprName || !newUprName.trim() || newUprName.trim() === currentUprName}>
                {isSavingUprName ? <Loader2 className="animate-spin" /> : <Save />}
                Simpan Nama UPR
              </Button>
          </form>

          <div className="space-y-1.5 pt-4 border-t">
            <Label htmlFor="currentPeriod">Periode Aktif</Label>
            <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
              <SelectTrigger id="currentPeriod" className="w-full md:w-[280px]">
                <SelectValue placeholder="Pilih periode" />
              </SelectTrigger>
              <SelectContent>
                {availablePeriods.length > 0 ? (
                  availablePeriods.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-periods" disabled>Tidak ada periode yang ditentukan.</SelectItem>
                )}
              </SelectContent>
            </Select>
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
              />
            </div>
            <Button onClick={handleAddNewPeriod} type="button" className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" /> Tambah Periode
            </Button>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-1">Periode yang Tersedia Saat Ini:</h4>
            {availablePeriods.length > 0 ? (
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                {availablePeriods.map(p => <li key={p}>{p}</li>)}
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
