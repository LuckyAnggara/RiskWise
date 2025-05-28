
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { ControlMeasure, RiskCause, PotentialRisk, Goal, ControlMeasureTypeKey } from '@/lib/types';
import { CONTROL_MEASURE_TYPE_KEYS, getControlTypeName } from '@/lib/types';
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Loader2, Save, Calendar as CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, parseISO, isValid as isValidDate } from 'date-fns';
import { getGoalById } from '@/services/goalService';
import { getPotentialRiskById } from '@/services/potentialRiskService';
import { getRiskCauseById } from '@/services/riskCauseService';
import { addControlMeasure, getControlMeasureById, updateControlMeasure, getControlMeasuresByRiskCauseId } from '@/services/controlMeasureService';

const controlMeasureFormSchema = z.object({
  controlType: z.custom<ControlMeasureTypeKey>((val) => CONTROL_MEASURE_TYPE_KEYS.includes(val as ControlMeasureTypeKey), {
    message: "Tipe pengendalian harus dipilih.",
  }),
  description: z.string().min(5, "Deskripsi pengendalian minimal 5 karakter."),
  keyControlIndicator: z.string().nullable(),
  target: z.string().nullable(),
  responsiblePerson: z.string().nullable(),
  deadline: z.date().nullable(),
  budget: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : Number(String(val).replace(/[^0-9]/g, ''))), // Hapus non-numerik
    z.number().positive("Anggaran harus angka positif jika diisi.").nullable()
  ),
});

type ControlMeasureFormData = z.infer<typeof controlMeasureFormSchema>;

export default function ManageControlMeasurePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const controlMeasureIdParam = params.controlMeasureId as string;
  const isCreatingNew = controlMeasureIdParam === 'new';

  const { currentUser, appUser, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [pageIsLoading, setPageIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [currentControlMeasure, setCurrentControlMeasure] = useState<ControlMeasure | null>(null);
  const [parentRiskCause, setParentRiskCause] = useState<RiskCause | null>(null);
  const [parentPotentialRisk, setParentPotentialRisk] = useState<PotentialRisk | null>(null);
  const [grandParentGoal, setGrandParentGoal] = useState<Goal | null>(null);

  // Query params for 'new' mode
  const riskCauseIdQuery = searchParams.get('riskCauseId');
  const potentialRiskIdQuery = searchParams.get('potentialRiskId');
  const goalIdQuery = searchParams.get('goalId');

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<ControlMeasureFormData>({
    resolver: zodResolver(controlMeasureFormSchema),
    defaultValues: {
      controlType: 'Prv',
      description: "",
      keyControlIndicator: "",
      target: "",
      responsiblePerson: "",
      deadline: null,
      budget: null,
    },
  });

  const currentUserId = useMemo(() => currentUser?.uid || null, [currentUser]);
  const currentPeriod = useMemo(() => appUser?.activePeriod || null, [appUser]);
  const uprDisplayName = useMemo(() => appUser?.displayName || 'UPR', [appUser]);

  const returnPath = useMemo(() => {
    if (currentRiskCause) return `/risk-cause-analysis/${currentRiskCause.id}`;
    if (riskCauseIdQuery) return `/risk-cause-analysis/${riskCauseIdQuery}`;
    return '/risk-analysis';
  }, [currentRiskCause, riskCauseIdQuery]);


  const fetchData = useCallback(async () => {
    if (authLoading || !currentUserId || !currentPeriod) {
      setPageIsLoading(true);
      return;
    }
    setPageIsLoading(true);
    console.log("[ManageControlMeasurePage] fetchData triggered. isCreatingNew:", isCreatingNew, "controlMeasureIdParam:", controlMeasureIdParam);

    try {
      if (isCreatingNew) {
        if (!riskCauseIdQuery || !potentialRiskIdQuery || !goalIdQuery) {
          toast({ title: "Konteks Tidak Lengkap", description: "ID Induk (Penyebab/Potensi/Sasaran) diperlukan untuk membuat pengendalian baru.", variant: "destructive" });
          router.push('/risk-analysis');
          return;
        }
        const [cause, pRisk, goal] = await Promise.all([
          getRiskCauseById(riskCauseIdQuery, currentUserId, currentPeriod),
          getPotentialRiskById(potentialRiskIdQuery, currentUserId, currentPeriod),
          getGoalById(goalIdQuery, currentUserId, currentPeriod),
        ]);
        if (!cause || !pRisk || !goal) {
          toast({ title: "Data Induk Tidak Ditemukan", description: "Salah satu data induk (penyebab, potensi, atau sasaran) tidak ditemukan atau tidak cocok konteks.", variant: "destructive" });
          router.push('/risk-analysis');
          return;
        }
        setParentRiskCause(cause);
        setParentPotentialRisk(pRisk);
        setGrandParentGoal(goal);
        setCurrentControlMeasure(null);
        reset({ controlType: 'Prv', description: "", keyControlIndicator: "", target: "", responsiblePerson: "", deadline: null, budget: null });
      } else {
        const control = await getControlMeasureById(controlMeasureIdParam, currentUserId, currentPeriod);
        if (!control) {
          toast({ title: "Pengendalian Tidak Ditemukan", description: "Tindakan pengendalian tidak ditemukan atau tidak cocok konteks.", variant: "destructive" });
          router.push('/risk-analysis');
          return;
        }
        setCurrentControlMeasure(control);
        const [cause, pRisk, goal] = await Promise.all([
          getRiskCauseById(control.riskCauseId, currentUserId, currentPeriod),
          getPotentialRiskById(control.potentialRiskId, currentUserId, currentPeriod),
          getGoalById(control.goalId, currentUserId, currentPeriod),
        ]);
        setParentRiskCause(cause);
        setParentPotentialRisk(pRisk);
        setGrandParentGoal(goal);
        reset({
          controlType: control.controlType,
          description: control.description,
          keyControlIndicator: control.keyControlIndicator || "",
          target: control.target || "",
          responsiblePerson: control.responsiblePerson || "",
          deadline: control.deadline && isValidDate(parseISO(control.deadline)) ? parseISO(control.deadline) : null,
          budget: control.budget,
        });
      }
    } catch (error: any) {
      console.error("[ManageControlMeasurePage] Error loading data:", error.message);
      toast({ title: "Gagal Memuat Data", description: error.message, variant: "destructive" });
      router.push(returnPath);
    } finally {
      setPageIsLoading(false);
    }
  }, [authLoading, currentUserId, currentPeriod, isCreatingNew, controlMeasureIdParam, riskCauseIdQuery, potentialRiskIdQuery, goalIdQuery, reset, router, toast, returnPath]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  const onSubmit: SubmitHandler<ControlMeasureFormData> = async (formData) => {
    if (!currentUserId || !currentPeriod) {
      toast({ title: "Konteks Pengguna/Periode Hilang", description: "Tidak dapat menyimpan. Harap muat ulang.", variant: "destructive" });
      return;
    }
    if (isCreatingNew && (!parentRiskCause || !parentPotentialRisk || !grandParentGoal)) {
      toast({ title: "Konteks Induk Hilang", description: "Tidak dapat menyimpan. Data induk tidak lengkap.", variant: "destructive" });
      return;
    }
    if (!isCreatingNew && !currentControlMeasure) {
      toast({ title: "Data Pengendalian Hilang", description: "Tidak dapat menyimpan. Data pengendalian saat ini tidak ada.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    const controlDataForService = {
      ...formData,
      deadline: formData.deadline ? formData.deadline.toISOString() : null,
      budget: formData.budget === null || isNaN(Number(formData.budget)) ? null : Number(formData.budget),
    };

    try {
      if (isCreatingNew && parentRiskCause && parentPotentialRisk && grandParentGoal) {
        const existingControls = await getControlMeasuresByRiskCauseId(parentRiskCause.id, currentUserId, currentPeriod);
        const newSequenceNumber = (existingControls.filter(c => c.controlType === formData.controlType).length) + 1;
        
        await addControlMeasure(
          controlDataForService,
          parentRiskCause.id,
          parentPotentialRisk.id,
          grandParentGoal.id,
          currentUserId,
          currentPeriod,
          newSequenceNumber
        );
        toast({ title: "Pengendalian Ditambahkan", description: `Pengendalian "${formData.description}" telah ditambahkan.` });
      } else if (currentControlMeasure && currentControlMeasure.id) {
        await updateControlMeasure(currentControlMeasure.id, controlDataForService);
        toast({ title: "Pengendalian Diperbarui", description: `Pengendalian "${formData.description}" telah diperbarui.` });
      }
      router.push(returnPath);
    } catch (error: any) {
      console.error("Error saving control measure:", error.message);
      toast({ title: "Gagal Menyimpan Pengendalian", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (pageIsLoading || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat data pengelolaan tindakan pengendalian...</p>
      </div>
    );
  }

  if (!isCreatingNew && !currentControlMeasure) {
     return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-xl text-muted-foreground">Tindakan pengendalian tidak ditemukan.</p>
        <Button onClick={() => router.push(returnPath)} variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
        </Button>
      </div>
    );
  }
  
  if (isCreatingNew && (!parentRiskCause || !parentPotentialRisk || !grandParentGoal)) {
     return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-xl text-muted-foreground">Konteks data induk untuk membuat pengendalian tidak ditemukan.</p>
         <Button onClick={() => router.push(returnPath)} variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
        </Button>
      </div>
    );
  }

  const pageTitle = isCreatingNew ? "Tambah Tindakan Pengendalian Baru" : `Edit Tindakan Pengendalian (${currentControlMeasure?.controlType}.${currentControlMeasure?.sequenceNumber})`;
  const goalCode = grandParentGoal?.code || 'S?';
  const potentialRiskCode = `${goalCode}.PR${parentPotentialRisk?.sequenceNumber || '?'}`;
  const riskCauseCode = `${potentialRiskCode}.PC${parentRiskCause?.sequenceNumber || '?'}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={pageTitle}
        description={`UPR: ${uprDisplayName}, Periode: ${currentPeriod || '...'}.`}
        actions={
          <Button onClick={() => router.push(returnPath)} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Analisis Penyebab
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Konteks Risiko</CardTitle>
          <CardDescription className="text-xs space-y-0.5">
            <p><strong>Sasaran ({goalCode}):</strong> {grandParentGoal?.name || 'Memuat...'}</p>
            <p><strong>Potensi Risiko ({potentialRiskCode}):</strong> {parentPotentialRisk?.description || 'Memuat...'}</p>
            <p><strong>Penyebab Risiko ({riskCauseCode}):</strong> {parentRiskCause?.description || 'Memuat...'}</p>
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detail Tindakan Pengendalian</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label htmlFor="controlType">Tipe Pengendalian</Label>
                <Controller
                  name="controlType"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value} disabled={isSaving}>
                      <SelectTrigger id="controlType" className={errors.controlType ? "border-destructive" : ""}>
                        <SelectValue placeholder="Pilih tipe pengendalian" />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTROL_MEASURE_TYPE_KEYS.map(typeKey => (
                          <SelectItem key={typeKey} value={typeKey}>{getControlTypeName(typeKey)} ({typeKey})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.controlType && <p className="text-xs text-destructive mt-1">{errors.controlType.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="responsiblePerson">Penanggung Jawab</Label>
                <Input
                  id="responsiblePerson"
                  {...register("responsiblePerson")}
                  placeholder="Contoh: Manajer SDM, Kepala Divisi TI"
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="controlDescription">Deskripsi Pengendalian Risiko</Label>
              <Textarea
                id="controlDescription"
                {...register("description")}
                className={errors.description ? "border-destructive" : ""}
                rows={3}
                placeholder="Jelaskan tindakan pengendalian..."
                disabled={isSaving}
              />
              {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label htmlFor="keyControlIndicator">Indikator Pengendalian Risiko (KCI)</Label>
                <Input
                  id="keyControlIndicator"
                  {...register("keyControlIndicator")}
                  placeholder="Contoh: Persentase penyelesaian pelatihan"
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="target">Target KCI</Label>
                <Input
                  id="target"
                  {...register("target")}
                  placeholder="Contoh: 100% pegawai mengikuti pelatihan"
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label htmlFor="deadline">Waktu (Deadline)</Label>
                <Controller
                    name="deadline"
                    control={control}
                    render={({ field }) => (
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground",
                            errors.deadline && "border-destructive"
                            )}
                            disabled={isSaving}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : <span>Pilih tanggal</span>}
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
                {errors.deadline && <p className="text-xs text-destructive mt-1">{errors.deadline.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="budget">Anggaran (Rp)</Label>
                <Input
                  id="budget"
                  type="text" // Ganti ke text untuk format angka
                  {...register("budget", { 
                    setValueAs: (value) => value === "" || value === null ? null : parseInt(String(value).replace(/[^0-9]/g, ''), 10) 
                  })}
                  onChange={(e) => {
                    const value = e.target.value;
                    const numericValue = parseInt(value.replace(/[^0-9]/g, ''), 10);
                    if (!isNaN(numericValue)) {
                      e.target.value = numericValue.toLocaleString('id-ID');
                      setValue("budget", numericValue, {shouldValidate: true});
                    } else if (value === "") {
                       e.target.value = "";
                       setValue("budget", null, {shouldValidate: true});
                    } else {
                        // Jika input bukan angka dan bukan string kosong, pertahankan nilai sebelumnya
                        e.target.value = getValues("budget")?.toLocaleString('id-ID') || "";
                    }
                  }}
                  onBlur={(e) => { // Format saat blur
                    const value = getValues("budget");
                    if (value !== null && value !== undefined) {
                        e.target.value = value.toLocaleString('id-ID');
                    } else {
                        e.target.value = "";
                    }
                  }}
                  placeholder="Contoh: 5.000.000"
                  className={errors.budget ? "border-destructive" : ""}
                  disabled={isSaving}
                />
                {errors.budget && <p className="text-xs text-destructive mt-1">{errors.budget.message}</p>}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isCreatingNew ? "Simpan Pengendalian Baru" : "Simpan Perubahan Pengendalian"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

    