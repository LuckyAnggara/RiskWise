
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
import type { ControlMeasure, RiskCause, PotentialRisk, Goal, ControlMeasureTypeKey, AppUser } from '@/lib/types';
import { CONTROL_MEASURE_TYPE_KEYS, getControlTypeName, LIKELIHOOD_LEVELS_DESC_MAP, IMPACT_LEVELS_DESC_MAP, getCalculatedRiskLevel } from '@/lib/types';
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Loader2, Save, Calendar as CalendarIcon, PlusCircle, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, parseISO, isValid as isValidDate } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { useAppStore } from '@/stores/useAppStore';
import { suggestControlMeasuresAction } from '@/app/actions'; // Import AI action
import { ControlMeasureAISuggestionsModal, type AISuggestedControlMeasure } from '@/components/risks/control-measure-ai-suggestions-modal'; // Import new modal

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
    (val) => (val === "" || val === null || val === undefined ? null : Number(String(val).replace(/[^0-9]/g, ''))),
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

  const { currentUser, appUser, loading: authLoading, profileLoading, isProfileComplete } = useAuth();
  const { toast } = useToast();
  
  const store = useAppStore();
  const { 
    addControlMeasure, 
    updateControlMeasure: updateControlMeasureInStore,
    getRiskCauseById, 
    getPotentialRiskById, 
    getGoalById,
    getControlMeasureById: getControlMeasureFromStore,
  } = store;

  const [pageIsLoading, setPageIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [currentControlMeasure, setCurrentControlMeasure] = useState<ControlMeasure | null>(null);
  const [parentRiskCause, setParentRiskCause] = useState<RiskCause | null>(null);
  const [parentPotentialRisk, setParentPotentialRisk] = useState<PotentialRisk | null>(null);
  const [grandParentGoal, setGrandParentGoal] = useState<Goal | null>(null);

  const riskCauseIdQuery = searchParams.get('riskCauseId');
  const potentialRiskIdQuery = searchParams.get('potentialRiskId');
  const goalIdQuery = searchParams.get('goalId');

  const [isAISuggestionsModalOpen, setIsAISuggestionsModalOpen] = useState(false);
  const [aiControlSuggestions, setAiControlSuggestions] = useState<AISuggestedControlMeasure[] | null>(null);
  const [isAISuggestionsLoading, setIsAISuggestionsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    getValues,
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
  const uprDisplayName = useMemo(() => appUser?.displayName || 'UPR...', [appUser]);

  const returnPath = useMemo(() => {
    const fromQuery = searchParams.get('from');
    if (fromQuery) return fromQuery;
    if (currentControlMeasure?.riskCauseId) return `/risk-cause-analysis/${currentControlMeasure.riskCauseId}`;
    if (parentRiskCause?.id) return `/risk-cause-analysis/${parentRiskCause.id}`;
    if (riskCauseIdQuery) return `/risk-cause-analysis/${riskCauseIdQuery}`;
    return '/risk-analysis'; 
  }, [parentRiskCause, riskCauseIdQuery, currentControlMeasure, searchParams]);


  const fetchData = useCallback(async () => {
    if (!currentUserId || !currentPeriod) {
      setPageIsLoading(false);
      return;
    }
    setPageIsLoading(true);
    console.log("[ManageCMPage] fetchData triggered. isCreatingNew:", isCreatingNew, "CM ID:", controlMeasureIdParam);

    try {
      let fetchedRiskCause: RiskCause | null = null;
      let fetchedPotentialRisk: PotentialRisk | null = null;
      let fetchedGoal: Goal | null = null;
      let fetchedControlMeasure: ControlMeasure | null = null;

      if (isCreatingNew) {
        if (!riskCauseIdQuery || !potentialRiskIdQuery || !goalIdQuery) {
          toast({ title: "Konteks Tidak Lengkap", description: "ID Induk (Penyebab/Potensi/Sasaran) diperlukan untuk membuat pengendalian baru.", variant: "destructive" });
          router.push('/risk-analysis');
          return;
        }
        fetchedRiskCause = await getRiskCauseById(riskCauseIdQuery, currentUserId, currentPeriod);
        fetchedPotentialRisk = await getPotentialRiskById(potentialRiskIdQuery, currentUserId, currentPeriod);
        fetchedGoal = await getGoalById(goalIdQuery, currentUserId, currentPeriod);
        
        if (!fetchedRiskCause || !fetchedPotentialRisk || !fetchedGoal) {
          toast({ title: "Data Induk Tidak Ditemukan", description: "Salah satu data induk (penyebab, potensi, atau sasaran) tidak ditemukan atau tidak cocok konteks.", variant: "destructive" });
          router.push(returnPath);
          return;
        }
        setCurrentControlMeasure(null);
        reset({ controlType: 'Prv', description: "", keyControlIndicator: "", target: "", responsiblePerson: "", deadline: null, budget: null });
      } else {
        fetchedControlMeasure = await getControlMeasureFromStore(controlMeasureIdParam, currentUserId, currentPeriod);
        if (!fetchedControlMeasure) {
          toast({ title: "Pengendalian Tidak Ditemukan", description: "Tindakan pengendalian tidak ditemukan atau tidak cocok konteks.", variant: "destructive" });
          router.push(returnPath);
          return;
        }
        setCurrentControlMeasure(fetchedControlMeasure);
        fetchedRiskCause = await getRiskCauseById(fetchedControlMeasure.riskCauseId, currentUserId, currentPeriod);
        fetchedPotentialRisk = await getPotentialRiskById(fetchedControlMeasure.potentialRiskId, currentUserId, currentPeriod);
        fetchedGoal = await getGoalById(fetchedControlMeasure.goalId, currentUserId, currentPeriod);

        if (!fetchedRiskCause || !fetchedPotentialRisk || !fetchedGoal) {
          toast({ title: "Data Induk Tidak Ditemukan", description: "Data induk untuk tindakan pengendalian ini tidak ditemukan.", variant: "destructive" });
          router.push(returnPath);
          return;
        }
        reset({
          controlType: fetchedControlMeasure.controlType,
          description: fetchedControlMeasure.description,
          keyControlIndicator: fetchedControlMeasure.keyControlIndicator || "",
          target: fetchedControlMeasure.target || "",
          responsiblePerson: fetchedControlMeasure.responsiblePerson || "",
          deadline: fetchedControlMeasure.deadline && isValidDate(parseISO(fetchedControlMeasure.deadline)) ? parseISO(fetchedControlMeasure.deadline) : null,
          budget: fetchedControlMeasure.budget,
        });
      }
      setParentRiskCause(fetchedRiskCause);
      setParentPotentialRisk(fetchedPotentialRisk);
      setGrandParentGoal(fetchedGoal);
    } catch (error: any) {
      console.error("[ManageCMPage] Error loading data:", error.message);
      toast({ title: "Gagal Memuat Data", description: error.message, variant: "destructive" });
      router.push(returnPath);
    } finally {
      setPageIsLoading(false);
    }
  }, [controlMeasureIdParam, isCreatingNew, currentUserId, currentPeriod, riskCauseIdQuery, potentialRiskIdQuery, goalIdQuery, reset, router, toast, returnPath, getControlMeasureFromStore, getRiskCauseById, getPotentialRiskById, getGoalById]);

  useEffect(() => {
    if (!authLoading && isProfileComplete && currentUserId && currentPeriod) {
      fetchData();
    } else if (!authLoading && (!currentUser || !isProfileComplete)) {
        setPageIsLoading(false); 
    }
  }, [authLoading, profileLoading, isProfileComplete, currentUser, currentUserId, currentPeriod, fetchData]);

  const processSave = async (formData: ControlMeasureFormData, forNewEntry: boolean): Promise<string | null> => {
    if (!currentUserId || !currentPeriod || !parentRiskCause?.id || !parentPotentialRisk?.id || !grandParentGoal?.id) {
      toast({ title: "Konteks Tidak Lengkap", description: "Data induk (Penyebab/Potensi/Sasaran/Pengguna/Periode) tidak lengkap.", variant: "destructive" });
      return null;
    }
  
    setIsSaving(true);
    const controlDataPayload: Omit<ControlMeasure, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'period' | 'riskCauseId' | 'potentialRiskId' | 'goalId' | 'sequenceNumber'> = {
      controlType: formData.controlType,
      description: formData.description,
      keyControlIndicator: formData.keyControlIndicator || null,
      target: formData.target || null,
      responsiblePerson: formData.responsiblePerson || null,
      deadline: formData.deadline ? formData.deadline.toISOString().split('T')[0] : null,
      budget: formData.budget === null || isNaN(Number(formData.budget)) ? null : Number(formData.budget),
    };
  
    try {
      if (forNewEntry) {
        const newControl = await addControlMeasure(
          controlDataPayload,
          parentRiskCause.id,
          parentPotentialRisk.id,
          grandParentGoal.id,
          currentUserId,
          currentPeriod
        );
        if (!newControl) throw new Error("Gagal menambahkan tindakan pengendalian baru melalui store.");
        return newControl.id;
      } else if (currentControlMeasure?.id) {
        const updatedControl = await updateControlMeasureInStore(currentControlMeasure.id, controlDataPayload);
        if (!updatedControl) throw new Error("Gagal memperbarui tindakan pengendalian melalui store.");
        return updatedControl.id;
      } else {
        throw new Error("Kondisi tidak valid untuk menyimpan pengendalian.");
      }
    } catch (error: any) {
      console.error("Error saving control measure:", error.message);
      toast({ title: "Gagal Menyimpan Pengendalian", description: error.message, variant: "destructive" });
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const onSubmitAndClose: SubmitHandler<ControlMeasureFormData> = async (formData) => {
    const savedId = await processSave(formData, isCreatingNew);
    if (savedId) {
      toast({ title: isCreatingNew ? "Pengendalian Ditambahkan" : "Pengendalian Diperbarui", description: `Pengendalian "${formData.description}" telah disimpan.` });
      router.push(returnPath);
    }
  };

  const onSubmitAndNew: SubmitHandler<ControlMeasureFormData> = async (formData) => {
    if (!isCreatingNew) {
        toast({ title: "Aksi Tidak Valid", description: "Simpan & Tambah Baru hanya untuk pengendalian baru.", variant: "warning"});
        return;
    }
    const savedId = await processSave(formData, true);
    if (savedId) {
      toast({ title: "Pengendalian Disimpan", description: `Pengendalian "${formData.description}" ditambahkan. Silakan input yang baru.` });
      reset({ controlType: 'Prv', description: "", keyControlIndicator: "", target: "", responsiblePerson: "", deadline: null, budget: null });
    }
  };

  const handleGetAIControlSuggestions = async () => {
    if (!parentRiskCause || !parentPotentialRisk || !grandParentGoal || !currentUserId || !currentPeriod) {
      toast({ title: "Konteks Tidak Lengkap", description: "Data induk (Penyebab/Potensi/Sasaran) diperlukan untuk saran AI.", variant: "warning" });
      return;
    }
    const { level: riskLevel } = getCalculatedRiskLevel(parentRiskCause.likelihood, parentRiskCause.impact);
    if (riskLevel === 'N/A') {
        toast({ title: "Analisis Penyebab Belum Lengkap", description: "Harap lengkapi analisis kemungkinan dan dampak penyebab risiko terlebih dahulu.", variant: "warning" });
        return;
    }

    setIsAISuggestionsLoading(true);
    setAiControlSuggestions(null);
    try {
      const result = await suggestControlMeasuresAction({
        riskCauseDescription: parentRiskCause.description,
        parentPotentialRiskDescription: parentPotentialRisk.description,
        grandParentGoalDescription: grandParentGoal.description,
        riskCauseLevelText: riskLevel,
        riskCauseLikelihood: parentRiskCause.likelihood,
        riskCauseImpact: parentRiskCause.impact,
        // desiredSuggestionCount can be added if needed
      });

      if (result.success && result.data && result.data.suggestions) {
        setAiControlSuggestions(result.data.suggestions);
        setIsAISuggestionsModalOpen(true);
      } else {
        toast({ title: "Kesalahan Saran AI", description: result.error || "Gagal mendapatkan saran pengendalian dari AI.", variant: "destructive" });
      }
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      toast({ title: "Kesalahan AI", description: errorMessage, variant: "destructive" });
    } finally {
      setIsAISuggestionsLoading(false);
    }
  };
  
  const handleApplyAISuggestion = (suggestion: AISuggestedControlMeasure) => {
    setValue('description', suggestion.description, { shouldValidate: true });
    setValue('controlType', suggestion.suggestedControlType, { shouldValidate: true });
    // KCI, Target, dll. bisa diisi manual oleh user atau AI disempurnakan untuk menyarankannya
    toast({ title: "Saran Diterapkan", description: "Deskripsi dan tipe pengendalian telah diisi dari saran AI."});
    setIsAISuggestionsModalOpen(false);
  };


  if (authLoading || profileLoading || pageIsLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat data pengelolaan tindakan pengendalian...</p>
      </div>
    );
  }

  if (!currentUser || !isProfileComplete) {
    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <p className="text-xl text-muted-foreground">Mengarahkan...</p>
        </div>
    );
  }
  
  if ((isCreatingNew && (!parentRiskCause || !parentPotentialRisk || !grandParentGoal)) || 
      (!isCreatingNew && (!currentControlMeasure || !parentRiskCause || !parentPotentialRisk || !grandParentGoal))) {
     return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-xl text-muted-foreground">Konteks data induk untuk tindakan pengendalian tidak lengkap atau tidak ditemukan.</p>
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
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
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
          <div className="flex justify-between items-center">
            <CardTitle>Detail Tindakan Pengendalian</CardTitle>
            <Button 
                variant="outline" 
                size="sm" 
                onClick={handleGetAIControlSuggestions}
                disabled={isAISuggestionsLoading || !parentRiskCause || !parentPotentialRisk || !grandParentGoal || (parentRiskCause?.likelihood === null || parentRiskCause?.impact === null)}
            >
                {isAISuggestionsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                Brainstorm Kontrol (AI)
            </Button>
          </div>
          {parentRiskCause && (parentRiskCause.likelihood === null || parentRiskCause.impact === null) && (
            <CardDescription className="text-xs text-orange-600 mt-1">
                Saran AI untuk kontrol memerlukan analisis kemungkinan dan dampak penyebab risiko diselesaikan terlebih dahulu.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <form className="space-y-6">
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
                 {errors.responsiblePerson && <p className="text-xs text-destructive mt-1">{errors.responsiblePerson.message}</p>}
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
                 {errors.keyControlIndicator && <p className="text-xs text-destructive mt-1">{errors.keyControlIndicator.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="target">Target KCI</Label>
                <Input
                  id="target"
                  {...register("target")}
                  placeholder="Contoh: 100% pegawai mengikuti pelatihan"
                  disabled={isSaving}
                />
                 {errors.target && <p className="text-xs text-destructive mt-1">{errors.target.message}</p>}
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
                            {field.value ? format(field.value, "dd/MM/yyyy", { locale: localeID }) : <span>Pilih tanggal</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            disabled={(date) => date < new Date("1900-01-01")}
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
                  type="text" 
                  defaultValue={getValues("budget")?.toLocaleString('id-ID') || ""}
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
                        const currentBudget = getValues("budget");
                        e.target.value = currentBudget?.toLocaleString('id-ID') || "";
                    }
                  }}
                  onBlur={(e) => { 
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

            <div className="flex justify-end items-center gap-2 pt-4">
              <Button type="button" onClick={handleSubmit(onSubmitAndClose)} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isCreatingNew ? "Simpan & Tutup" : "Simpan Perubahan & Tutup"}
              </Button>
              {isCreatingNew && (
                <Button type="button" variant="outline" onClick={handleSubmit(onSubmitAndNew)} disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                  Simpan & Tambah Baru
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
      {isAISuggestionsModalOpen && aiControlSuggestions && (
        <ControlMeasureAISuggestionsModal
          isOpen={isAISuggestionsModalOpen}
          onOpenChange={setIsAISuggestionsModalOpen}
          suggestions={aiControlSuggestions}
          onApplySuggestion={handleApplyAISuggestion}
        />
      )}
    </div>
  );
}
