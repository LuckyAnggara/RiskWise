
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Loader2, Save, Calendar as CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { addMonitoringSession } from '@/services/monitoringService';
import { useAppStore } from '@/stores/useAppStore'; // Import store
import type { MonitoringPeriodFrequency } from '@/lib/types';

const monitoringSessionSchema = z.object({
  name: z.string().min(5, "Nama periode pemantauan minimal 5 karakter."),
  startDate: z.date({ required_error: "Tanggal mulai harus diisi." }),
  endDate: z.date({ required_error: "Tanggal selesai harus diisi." }),
}).refine(data => data.endDate >= data.startDate, {
  message: "Tanggal selesai harus setelah atau sama dengan tanggal mulai.",
  path: ["endDate"],
});

type MonitoringSessionFormData = z.infer<typeof monitoringSessionSchema>;

export default function NewMonitoringSessionPage() {
  const router = useRouter();
  const { currentUser, appUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const addMonitoringSessionToState = useAppStore(state => state.addMonitoringSessionToState);

  const [isSaving, setIsSaving] = useState(false);

  const defaultMonitoringFrequency = useMemo(() => appUser?.monitoringSettings?.defaultFrequency || 'Bulanan', [appUser]);

  const getDefaultDates = (frequency: MonitoringPeriodFrequency | ''): { defaultStartDate: Date; defaultEndDate: Date } => {
    const today = new Date();
    let defaultStartDate = startOfMonth(today);
    let defaultEndDate = endOfMonth(today);

    switch (frequency) {
      case 'Bulanan':
        // Default sudah benar (bulan ini)
        break;
      case 'Triwulanan':
        const currentQuarter = Math.floor(today.getMonth() / 3);
        defaultStartDate = startOfMonth(new Date(today.getFullYear(), currentQuarter * 3, 1));
        defaultEndDate = endOfMonth(addMonths(defaultStartDate, 2));
        break;
      case 'Semesteran':
        const currentSemester = today.getMonth() < 6 ? 0 : 6;
        defaultStartDate = startOfMonth(new Date(today.getFullYear(), currentSemester, 1));
        defaultEndDate = endOfMonth(addMonths(defaultStartDate, 5));
        break;
      case 'Tahunan':
        defaultStartDate = startOfMonth(new Date(today.getFullYear(), 0, 1));
        defaultEndDate = endOfMonth(new Date(today.getFullYear(), 11, 1));
        break;
      default: // Sama dengan bulanan jika tidak diset
        break;
    }
    return { defaultStartDate, defaultEndDate };
  };
  
  const { defaultStartDate, defaultEndDate } = getDefaultDates(defaultMonitoringFrequency);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<MonitoringSessionFormData>({
    resolver: zodResolver(monitoringSessionSchema),
    defaultValues: {
      name: "",
      startDate: defaultStartDate,
      endDate: defaultEndDate,
    },
  });

  const currentUserId = useMemo(() => currentUser?.uid || null, [currentUser]);
  const currentPeriod = useMemo(() => appUser?.activePeriod || null, [appUser]); // Periode aplikasi
  const uprDisplayName = useMemo(() => appUser?.displayName || 'UPR...', [appUser]);

  const onSubmit: SubmitHandler<MonitoringSessionFormData> = async (formData) => {
    if (!currentUserId || !currentPeriod) {
      toast({ title: "Konteks Pengguna/Periode Aplikasi Hilang", description: "Tidak dapat menyimpan sesi pemantauan.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const sessionData = {
        name: formData.name,
        startDate: formData.startDate.toISOString(),
        endDate: formData.endDate.toISOString(),
        status: 'Aktif' as const,
      };
      
      const newSession = await addMonitoringSession(sessionData, currentUserId, currentPeriod);
      addMonitoringSessionToState(newSession); // Update store
      
      toast({ title: "Sesi Pemantauan Dibuat", description: `Sesi "${formData.name}" telah berhasil dimulai.` });
      router.push(`/monitoring`); // Kembali ke daftar sesi, atau nanti ke halaman konduksi
    } catch (error: any) {
      console.error("Error creating monitoring session:", error.message);
      toast({ title: "Gagal Membuat Sesi", description: error.message || "Terjadi kesalahan.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || !currentUser || !appUser || !currentPeriod) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mulai Sesi Pemantauan Risiko Baru"
        description={`UPR: ${uprDisplayName}, Periode Aplikasi: ${currentPeriod}.`}
        actions={
          <Button onClick={() => router.push('/monitoring')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Daftar Sesi
          </Button>
        }
      />

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Detail Sesi Pemantauan</CardTitle>
          <CardDescription>
            Isi detail untuk sesi pemantauan risiko yang baru.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nama Periode Pemantauan</Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="Misalnya: Triwulan I 2024, Pemantauan Bulanan - Januari 2024"
                className={errors.name ? "border-destructive" : ""}
                disabled={isSaving}
              />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label htmlFor="startDate">Tanggal Mulai</Label>
                <Controller
                  name="startDate"
                  control={control}
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground",
                            errors.startDate && "border-destructive"
                          )}
                          disabled={isSaving}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "dd MMM yyyy", { locale: id.dateFnsLocale }) : <span>Pilih tanggal mulai</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {errors.startDate && <p className="text-xs text-destructive mt-1">{errors.startDate.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="endDate">Tanggal Selesai</Label>
                 <Controller
                  name="endDate"
                  control={control}
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground",
                            errors.endDate && "border-destructive"
                          )}
                          disabled={isSaving}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "dd MMM yyyy", { locale: id.dateFnsLocale }) : <span>Pilih tanggal selesai</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {errors.endDate && <p className="text-xs text-destructive mt-1">{errors.endDate.message}</p>}
              </div>
            </div>
            {errors.root?.message && <p className="text-xs text-destructive mt-1">{errors.root.message}</p>}


            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Mulai Sesi Pemantauan
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
// Helper untuk id locale date-fns (jika belum ada)
const id = {
  dateFnsLocale: {
    formatDistance: (...args: any[]) => formatDistance(...args, {locale: require('date-fns/locale/id')}),
    formatRelative: (...args: any[]) => formatRelative(...args, {locale: require('date-fns/locale/id')}),
    localize: {
      ordinalNumber: (n: number, _options: any) => String(n),
      era: (n: number, _options: any) => ['SM', 'M'][n],
      quarter: (n: number, _options: any) => `K${n}`,
      month: (n: number, _options: any) => ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][n],
      day: (n: number, _options: any) => ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][n],
      dayPeriod: (n: number, _options: any) => ['AM', 'PM'][n]
    },
    formatLong: {
      date: () => 'dd/MM/yyyy',
      time: () => 'HH:mm',
      dateTime: () => 'dd/MM/yyyy HH:mm'
    },
    match: {} // Placeholder, sesuaikan jika perlu
  }
};
const { formatDistance, formatRelative } = require('date-fns');

