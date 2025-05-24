
"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUprId, getCurrentPeriod, setCurrentPeriod, getAvailablePeriods, addAvailablePeriod, initializeAppContext } from '@/lib/upr-period-context';
import { Info, PlusCircle } from 'lucide-react';

export default function SettingsPage() {
  const [currentUpr, setCurrentUpr] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);
  const [newPeriodInput, setNewPeriodInput] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const context = initializeAppContext();
    setCurrentUpr(context.uprId);
    setSelectedPeriod(context.period);
    setAvailablePeriods(context.availablePeriods);
  }, []);

  const handlePeriodChange = (newPeriod: string) => {
    if (newPeriod && newPeriod !== selectedPeriod) {
      setCurrentPeriod(newPeriod);
      setSelectedPeriod(newPeriod);
      toast({ title: "Periode Diubah", description: `Periode aktif diatur ke ${newPeriod}. Halaman akan dimuat ulang.` });
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan Aplikasi"
        description="Kelola pengaturan global untuk RiskWise."
      />

      <Card>
        <CardHeader>
          <CardTitle>Unit Pemilik Risiko (UPR) &amp; Periode</CardTitle>
          <CardDescription>
            Konfigurasikan UPR aktif dan periode pelaporan untuk aplikasi.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="currentUpr">ID UPR Saat Ini</Label>
            <Input id="currentUpr" value={currentUpr} readOnly disabled />
            <p className="text-xs text-muted-foreground flex items-center">
              <Info className="w-3 h-3 mr-1" /> ID UPR saat ini diatur secara sistem dan belum dapat diubah melalui UI ini.
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="currentPeriod">Periode Aktif</Label>
            <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
              <SelectTrigger id="currentPeriod" className="w-[280px]">
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
          <div className="flex items-end gap-2">
            <div className="flex-grow space-y-1">
              <Label htmlFor="newPeriod">Periode Baru (mis., 2026, 2025/2026, 2025-S1)</Label>
              <Input
                id="newPeriod"
                value={newPeriodInput}
                onChange={(e) => setNewPeriodInput(e.target.value)}
                placeholder="Masukkan periode baru"
              />
            </div>
            <Button onClick={handleAddNewPeriod} type="button">
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
