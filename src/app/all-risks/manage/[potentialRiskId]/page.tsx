
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { PotentialRisk, Goal, RiskCategory, RiskCause, RiskSource } from '@/lib/types';
import { RISK_CATEGORIES, RISK_SOURCES, LIKELIHOOD_LEVELS_DESC_MAP, IMPACT_LEVELS_DESC_MAP, CalculatedRiskLevelCategory } from '@/lib/types';
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, PlusCircle, Trash2, Loader2, Save, BarChart3, Wand2, Settings2, LayoutGrid, List } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { BrainstormCausesContextModal } from '@/components/risks/brainstorm-causes-context-modal';
import { BrainstormSuggestionsModal } from '@/components/risks/brainstorm-suggestions-modal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RiskCauseCardItem } from '@/components/risks/risk-cause-card-item';
import { getCalculatedRiskLevel, getRiskLevelColor } from '@/app/risk-cause-analysis/[riskCauseId]/page';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

import { useAuth } from '@/contexts/auth-context';
import { getGoals as fetchGoalsFromService, type GoalsResult, getGoalById as fetchGoalByIdFromService } from '@/services/goalService';
// PotentialRisk services will be called via store
// import { getPotentialRisksByGoalId as fetchPotentialRisksByGoalIdFromService, getPotentialRiskById as fetchPotentialRiskByIdFromService } from '@/services/potentialRiskService';
// import { addRiskCause as addRiskCauseToService, getRiskCausesByPotentialRiskId as fetchRiskCausesByPotentialRiskIdFromService, deleteRiskCauseAndSubCollections } from '@/services/riskCauseService';
import { useAppStore } from '@/stores/useAppStore';


const potentialRiskFormSchema = z.object({
  description: z.string().min(10, "Deskripsi potensi risiko minimal 10 karakter."),
  goalId: z.string().min(1, "Sasaran harus dipilih."),
  category: z.custom<RiskCategory>().nullable().refine(val => val === null || RISK_CATEGORIES.includes(val as RiskCategory), {
    message: "Kategori risiko tidak valid.",
  }),
  owner: z.string().nullable(),
});

type PotentialRiskFormData = z.infer<typeof potentialRiskFormSchema>;

const riskCauseFormSchema = z.object({
  causeDescription: z.string().min(5, "Deskripsi penyebab minimal 5 karakter."),
  causeSource: z.custom<RiskSource>().refine(val => RISK_SOURCES.includes(val as RiskSource), {
    message: "Sumber harus dipilih.",
  }),
});
type RiskCauseFormData = z.infer<typeof riskCauseFormSchema>;

const NO_CATEGORY_SENTINEL = "__NONE__";

interface AISuggestedCauseItem {
  description: string;
  source: RiskSource | null;
  category?: RiskCategory | null; 
}

export default function ManagePotentialRiskPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const potentialRiskIdParam = params.potentialRiskId as string;
  const isCreatingNew = potentialRiskIdParam === 'new';
  const { currentUser, appUser, loading: authLoading } = useAuth();

  const store = useAppStore();
  const { addPotentialRisk: addPotentialRiskToStore, updatePotentialRisk: updatePotentialRiskInStore, getPotentialRiskById: getPotentialRiskFromStore } = store;
  const { riskCauses: storeRiskCauses, addRiskCause: addRiskCauseToStore, deleteRiskCause: deleteRiskCauseFromStore, fetchRiskCauses, riskCausesLoading } = store;


  const [pageIsLoading, setPageIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [currentPotentialRisk, setCurrentPotentialRisk] = useState<PotentialRisk | null>(null);
  // RiskCauses now comes from store
  // const [riskCauses, setRiskCauses] = useState<RiskCause[]>([]);
  const [causeViewMode, setCauseViewMode] = useState<'table' | 'card'>('table');
  const [causeToDelete, setCauseToDelete] = useState<RiskCause | null>(null);
  const [isDeleteCauseAlertOpen, setIsDeleteCauseAlertOpen] = useState(false);

  const [isBrainstormCausesContextModalOpen, setIsBrainstormCausesContextModalOpen] = useState(false);
  const [isBrainstormCausesSuggestionsModalOpen, setIsBrainstormCausesSuggestionsModalOpen] = useState(false);
  const [aiSuggestedCauses, setAISuggestedCauses] = useState<AISuggestedCauseItem[]>([]);

  const { toast } = useToast();

  const {
    register: registerPotentialRisk,
    handleSubmit: handleSubmitPotentialRisk,
    reset: resetPotentialRiskForm,
    setValue: setPotentialRiskValue,
    control: potentialRiskControl,
    getValues: getPotentialRiskValues,
    formState: { errors: potentialRiskErrors },
  } = useForm<PotentialRiskFormData>({
    resolver: zodResolver(potentialRiskFormSchema),
    defaultValues: { description: "", goalId: "", category: null, owner: "" },
  });

  const {
    register: registerRiskCause,
    handleSubmit: handleSubmitRiskCause,
    reset: resetRiskCauseForm,
    control: riskCauseControl,
    formState: { errors: riskCauseErrors, isSubmitting: isAddingCause },
  } = useForm<RiskCauseFormData>({
    resolver: zodResolver(riskCauseFormSchema),
    defaultValues: { causeDescription: "", causeSource: "Internal" },
  });

  const currentUserId = useMemo(() => currentUser?.uid || null, [currentUser]);
  const currentPeriod = useMemo(() => appUser?.activePeriod || null, [appUser]);
  const uprDisplayName = useMemo(() => appUser?.displayName || 'UPR...', [appUser]);
  const defaultBackPath = useMemo(() => searchParams.get('from') || `/all-risks`, [searchParams]);

  const displayedRiskCauses = useMemo(() => {
    if (!currentPotentialRisk) return [];
    return storeRiskCauses.filter(rc => rc.potentialRiskId === currentPotentialRisk.id)
                         .sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0));
  }, [storeRiskCauses, currentPotentialRisk]);


  const fetchPageData = useCallback(async (userId: string, period: string) => {
    setPageIsLoading(true);
    try {
      const goalsResult = await fetchGoalsFromService(userId, period);
      let fetchedGoals: Goal[] = [];
      if (goalsResult.success && goalsResult.goals) {
        fetchedGoals = goalsResult.goals.sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' }));
        setGoals(fetchedGoals);
      } else {
        setGoals([]);
        toast({ title: "Kesalahan Data Sasaran", description: goalsResult.message || "Gagal memuat daftar sasaran.", variant: "destructive" });
      }

      if (isCreatingNew) {
        setCurrentPotentialRisk(null);
        const defaultGoalIdFromQuery = searchParams.get('goalId');
        const defaultGoalId = defaultGoalIdFromQuery || (fetchedGoals.length > 0 ? fetchedGoals[0].id : "");
        resetPotentialRiskForm({ description: "", goalId: defaultGoalId, category: null, owner: "" });
      } else {
        const risk = await getPotentialRiskFromStore(potentialRiskIdParam, userId, period);
        if (risk) {
          setCurrentPotentialRisk(risk);
          resetPotentialRiskForm({
            description: risk.description,
            goalId: risk.goalId,
            category: risk.category,
            owner: risk.owner || "",
          });
          // Risk causes are now fetched by the store if potentialRisks are loaded
          // If store.fetchRiskCauses needs explicit trigger, it would be called after fetchPotentialRisks in store.
          // For now, assume they are available if currentPotentialRisk is set and store is up-to-date.
        } else {
          toast({ title: "Kesalahan", description: "Potensi Risiko tidak ditemukan atau tidak cocok dengan konteks pengguna/periode.", variant: "destructive" });
          router.push(defaultBackPath);
        }
      }
    } catch (error: any) {
      console.error("Error fetching page data for ManagePotentialRiskPage:", error);
      toast({ title: "Kesalahan Fatal", description: `Gagal memuat data: ${error.message}`, variant: "destructive" });
      router.push(defaultBackPath);
    } finally {
      setPageIsLoading(false);
    }
  }, [potentialRiskIdParam, isCreatingNew, resetPotentialRiskForm, router, toast, searchParams, defaultBackPath, getPotentialRiskFromStore]);

  useEffect(() => {
    if (authLoading) {
      setPageIsLoading(true);
      return;
    }
    if (!currentUser || !appUser || !appUser.activePeriod || !currentUserId || !currentPeriod) {
      setPageIsLoading(true); 
      if (!authLoading && !currentUser) router.push('/login');
      return;
    }
    fetchPageData(currentUserId, currentPeriod);
  }, [authLoading, currentUser, appUser, currentUserId, currentPeriod, fetchPageData, router]);


  const onPotentialRiskSubmit: SubmitHandler<PotentialRiskFormData> = async (formData) => {
    if (!currentUser || !currentUserId || !currentPeriod || !appUser) {
      toast({ title: "Konteks Tidak Lengkap", description: "Informasi pengguna atau periode tidak tersedia.", variant: "destructive" });
      return;
    }
    
    const parentGoal = goals.find(g => g.id === formData.goalId);
    if (!parentGoal) {
      toast({ title: "Kesalahan", description: "Sasaran induk yang dipilih tidak valid.", variant: "destructive" });
      setIsSaving(false);
      return;
    }

    setIsSaving(true);
    try {
      let savedPotentialRisk: PotentialRisk | null = null;
      let successMessage = "";

      const pRiskDataPayload: Omit<PotentialRisk, 'id' | 'identifiedAt' | 'userId' | 'period' | 'sequenceNumber' | 'goalId'> = {
        description: formData.description,
        category: formData.category === NO_CATEGORY_SENTINEL ? null : formData.category,
        owner: formData.owner || null,
      };

      if (isCreatingNew) {
        const existingPRsForGoal = store.potentialRisks.filter(pr => pr.goalId === parentGoal.id && pr.userId === currentUserId && pr.period === currentPeriod);
        const newSequenceNumber = existingPRsForGoal.length + 1;
        
        savedPotentialRisk = await addPotentialRiskToStore(pRiskDataPayload, parentGoal.id, currentUserId, currentPeriod, newSequenceNumber);
        if (savedPotentialRisk) {
          successMessage = `Potensi Risiko "${savedPotentialRisk.description}" (PR${savedPotentialRisk.sequenceNumber}) dibuat. Anda sekarang dapat menambahkan penyebabnya.`;
          setCurrentPotentialRisk(savedPotentialRisk); 
          router.replace(`/all-risks/manage/${savedPotentialRisk.id}?from=${encodeURIComponent(defaultBackPath)}`); 
        } else {
          throw new Error("Gagal membuat potensi risiko baru melalui store.");
        }
      } else if (currentPotentialRisk) {
        const updateData = { ...pRiskDataPayload };
        // If goalId changed, it's a more complex update in Firestore;
        // for now, service `updatePotentialRiskInService` only updates fields on existing doc.
        // If goalId can change, it might imply moving the PR or recreating it.
        // For this iteration, we assume goalId is not part of the updateData passed to update service for simplicity.
        // The form can still change goalId, which the store.updatePotentialRisk will reflect.
        savedPotentialRisk = await updatePotentialRiskInStore(currentPotentialRisk.id, updateData);
        if (savedPotentialRisk) {
          successMessage = `Potensi Risiko "${savedPotentialRisk.description}" (PR${savedPotentialRisk.sequenceNumber}) diperbarui.`;
          setCurrentPotentialRisk(savedPotentialRisk); 
          if(currentPotentialRisk.goalId !== formData.goalId && savedPotentialRisk.id){ // If goal changed
             // The store's updatePotentialRisk needs to handle goalId change correctly if it means re-parenting
             // For now, just ensure local state currentPotentialRisk reflects the new goalId
             setCurrentPotentialRisk(prev => prev ? {...prev, goalId: formData.goalId} : null);
             // Re-fetch might be needed if context for causes changes, but store should ideally handle this
          }
        } else {
          throw new Error("Gagal memperbarui potensi risiko melalui store.");
        }
      } else {
        toast({ title: "Kesalahan", description: "Tidak dapat menyimpan. Data potensi risiko tidak lengkap.", variant: "destructive" });
        setIsSaving(false);
        return;
      }
      toast({ title: "Sukses", description: successMessage });
    } catch (error: any) {
        console.error("Error saving potential risk:", error.message);
        toast({ title: "Gagal Menyimpan", description: `Terjadi kesalahan saat menyimpan potensi risiko: ${error.message}`, variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  const onRiskCauseSubmit: SubmitHandler<RiskCauseFormData> = async (data) => {
    if (!currentUser || !currentUserId || !currentPeriod || !appUser) {
        toast({ title: "Konteks Pengguna/Periode Hilang", variant: "destructive" });
        return;
    }
    if (!currentPotentialRisk) {
        toast({ title: "Kesalahan", description: "Konteks potensi risiko induk tidak ditemukan.", variant: "destructive" });
        return;
    }
    
    try {
      const existingCausesForPR = store.riskCauses.filter(rc => rc.potentialRiskId === currentPotentialRisk.id && rc.userId === currentUserId && rc.period === currentPeriod);
      const newSequenceNumber = existingCausesForPR.length + 1;
      const newCauseData: Omit<RiskCause, 'id' | 'createdAt' | 'userId' | 'period' | 'potentialRiskId' | 'goalId' | 'sequenceNumber' > = {
          description: data.causeDescription,
          source: data.causeSource,
          keyRiskIndicator: null,
          riskTolerance: null,
          likelihood: null,
          impact: null,
      };
      const newCause = await addRiskCauseToStore(newCauseData, currentPotentialRisk.id, currentPotentialRisk.goalId, currentUserId, currentPeriod, newSequenceNumber);
      if (newCause) {
        toast({ title: "Penyebab Risiko Ditambahkan", description: `Penyebab "${newCause.description}" (PC${newCause.sequenceNumber}) ditambahkan.` });
        resetRiskCauseForm();
      } else {
        throw new Error("Gagal membuat penyebab risiko baru melalui store.");
      }
    } catch (error: any) {
        console.error("Error adding risk cause:", error.message);
        toast({ title: "Gagal Menambah Penyebab", description: `Terjadi kesalahan: ${error.message}`, variant: "destructive" });
    }
  };

  const handleDeleteRiskCauseSubmit = async () => {
    if (!currentUser || !currentUserId || !currentPeriod || !appUser) {
        toast({ title: "Konteks Pengguna/Periode Hilang", variant: "destructive" });
        setIsDeleteCauseAlertOpen(false); setCauseToDelete(null); return;
    }
     if (!currentPotentialRisk || !causeToDelete) {
        toast({ title: "Data Tidak Lengkap", variant: "destructive" });
        setIsDeleteCauseAlertOpen(false); setCauseToDelete(null); return;
    }
    
    try {
      await deleteRiskCauseFromStore(causeToDelete.id, currentUserId, currentPeriod);
      toast({ title: "Penyebab Risiko Dihapus", description: `Penyebab "${causeToDelete.description}" (PC${causeToDelete.sequenceNumber}) dan data terkait telah dihapus.`, variant: "destructive" });
    } catch (error: any) {
        console.error("Error deleting risk cause:", error.message);
        toast({ title: "Gagal Menghapus", description: `Terjadi kesalahan: ${error.message}`, variant: "destructive" });
    } finally {
        setIsDeleteCauseAlertOpen(false);
        setCauseToDelete(null);
    }
  };

  const handleOpenDeleteCauseAlert = (cause: RiskCause) => {
    setCauseToDelete(cause);
    setIsDeleteCauseAlertOpen(true);
  };

  const handleAISuggestionsReady = (suggestions: AISuggestedCauseItem[]) => {
    if (!currentPotentialRisk) return;
    if (suggestions.length === 0) {
      toast({ title: "Tidak Ada Saran Penyebab", variant: "default" });
      setIsBrainstormCausesContextModalOpen(false);
      return;
    }
    setAISuggestedCauses(suggestions);
    setIsBrainstormCausesContextModalOpen(false);
    setIsBrainstormCausesSuggestionsModalOpen(true);
  };

  const handleSaveAISelectedCauses = async (selectedItems: AISuggestedCauseItem[]) => {
     if (!currentUser || !currentUserId || !currentPeriod || !appUser) {
        toast({ title: "Konteks Pengguna/Periode Hilang", variant: "destructive" });
        setIsBrainstormCausesSuggestionsModalOpen(false); return;
    }
    if (!currentPotentialRisk) {
      toast({ title: "Konteks Potensi Risiko Hilang", variant: "destructive" });
      setIsBrainstormCausesSuggestionsModalOpen(false); return;
    }

    try {
      let currentSequence = store.riskCauses.filter(rc => rc.potentialRiskId === currentPotentialRisk.id && rc.userId === currentUserId && rc.period === currentPeriod).length;
      const newRiskCausesPromises: Promise<RiskCause | null>[] = [];

      for (const item of selectedItems) {
        currentSequence++;
        const newCauseData: Omit<RiskCause, 'id' | 'createdAt' | 'userId' | 'period' | 'potentialRiskId' | 'goalId' | 'sequenceNumber' > = {
            description: item.description,
            source: item.source || "Internal",
            keyRiskIndicator: null,
            riskTolerance: null,
            likelihood: null,
            impact: null,
        };
        newRiskCausesPromises.push(addRiskCauseToStore(newCauseData, currentPotentialRisk.id, currentPotentialRisk.goalId, currentUserId, currentPeriod, currentSequence));
      }
      
      const createdCauses = (await Promise.all(newRiskCausesPromises)).filter(Boolean) as RiskCause[];
      
      if (createdCauses.length > 0) {
        toast({ title: "Saran Penyebab Disimpan", description: `${createdCauses.length} penyebab risiko baru dari AI telah ditambahkan.` });
      }
      if (selectedItems.length !== createdCauses.length) {
         toast({ title: "Sebagian Gagal Disimpan", description: "Beberapa saran penyebab dari AI gagal disimpan.", variant: "warning" });
      }
    } catch (error: any) {
        console.error("Error saving AI suggested causes:", error.message);
        toast({ title: "Gagal Menyimpan", description: `Terjadi kesalahan: ${error.message}`, variant: "destructive" });
    } finally {
      setIsBrainstormCausesSuggestionsModalOpen(false);
    }
  };

  if (pageIsLoading || authLoading || !currentUser || !appUser || !appUser.activePeriod) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat data potensi risiko...</p>
      </div>
    );
  }

  const parentGoalForDisplay = goals.find(g => g.id === (currentPotentialRisk ? currentPotentialRisk.goalId : (isCreatingNew ? getPotentialRiskValues("goalId") : '')));
  const goalCodeForPR = parentGoalForDisplay?.code || 'S?';
  const potentialRiskCode = goalCodeForPR && currentPotentialRisk && typeof currentPotentialRisk.sequenceNumber === 'number' ? `${goalCodeForPR}.PR${currentPotentialRisk.sequenceNumber}` : (isCreatingNew ? "PR Baru" : "PR...");


  return (
    <div className="space-y-6">
      <PageHeader
        title={isCreatingNew ? "Tambah Potensi Risiko Baru" : `Edit Potensi Risiko (${potentialRiskCode})`}
        description={`Kelola detail dan penyebab potensi risiko. UPR: ${uprDisplayName}, Periode: ${currentPeriod || '...'}.`}
        actions={
          <Button onClick={() => router.push(defaultBackPath)} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Detail Potensi Risiko</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitPotentialRisk(onPotentialRiskSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="goalIdPotentialRisk">Sasaran Terkait</Label>
              <Controller
                name="goalId"
                control={potentialRiskControl}
                render={({ field }) => (
                    <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={goals.length === 0 || isSaving}
                    >
                        <SelectTrigger id="goalIdPotentialRisk" className={potentialRiskErrors.goalId ? "border-destructive" : ""}>
                        <SelectValue placeholder="Pilih sasaran" />
                        </SelectTrigger>
                        <SelectContent>
                        {goals.length > 0 ? (
                            goals.map(goal => (
                            <SelectItem key={goal.id} value={goal.id}>{(goal.code || '[Tanpa Kode]') + ' - ' + goal.name}</SelectItem>
                            ))
                        ) : (
                            <SelectItem value="no-goals" disabled>Tidak ada sasaran di UPR/Periode ini.</SelectItem>
                        )}
                        </SelectContent>
                    </Select>
                )}
              />
              {potentialRiskErrors.goalId && <p className="text-xs text-destructive mt-1">{potentialRiskErrors.goalId.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="descriptionPotentialRisk">Deskripsi Potensi Risiko</Label>
              <Textarea
                id="descriptionPotentialRisk"
                {...registerPotentialRisk("description")}
                className={potentialRiskErrors.description ? "border-destructive" : ""}
                rows={3}
                placeholder="Jelaskan potensi risiko..."
                disabled={isSaving}
              />
              {potentialRiskErrors.description && <p className="text-xs text-destructive mt-1">{potentialRiskErrors.description.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label htmlFor="categoryPotentialRisk">Kategori Risiko</Label>
                    <Controller
                        name="category"
                        control={potentialRiskControl}
                        render={({ field }) => (
                            <Select
                                value={field.value || NO_CATEGORY_SENTINEL}
                                onValueChange={(value) => field.onChange(value === NO_CATEGORY_SENTINEL ? null : value as RiskCategory)}
                                disabled={isSaving}
                            >
                                <SelectTrigger id="categoryPotentialRisk" className={potentialRiskErrors.category ? "border-destructive" : ""}>
                                <SelectValue placeholder="Pilih kategori (opsional)" />
                                </SelectTrigger>
                                <SelectContent>
                                <SelectItem value={NO_CATEGORY_SENTINEL}>_Tanpa Kategori_</SelectItem>
                                {RISK_CATEGORIES.map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {potentialRiskErrors.category && <p className="text-xs text-destructive mt-1">{potentialRiskErrors.category.message}</p>}
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="ownerPotentialRisk">Pemilik Risiko (Opsional)</Label>
                    <Input
                    id="ownerPotentialRisk"
                    {...registerPotentialRisk("owner")}
                    placeholder="Contoh: Kepala Operasional, Departemen TI"
                    className={potentialRiskErrors.owner ? "border-destructive" : ""}
                    disabled={isSaving}
                    />
                    {potentialRiskErrors.owner && <p className="text-xs text-destructive mt-1">{potentialRiskErrors.owner.message}</p>}
                </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving || (goals.length === 0 && isCreatingNew) || !currentUser}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isCreatingNew ? "Buat Potensi Risiko" : "Simpan Perubahan"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {!isCreatingNew && currentPotentialRisk && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div className="flex-grow">
                    <CardTitle>Penyebab Risiko untuk: ({potentialRiskCode})</CardTitle>
                    <CardDescription className="mt-1 line-clamp-2" title={currentPotentialRisk.description}>{currentPotentialRisk.description}</CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsBrainstormCausesContextModalOpen(true)}
                        disabled={!currentPotentialRisk || !parentGoalForDisplay || !currentUser || riskCausesLoading}
                        className="text-xs"
                    >
                        {riskCausesLoading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Wand2 className="mr-2 h-3 w-3" />} Brainstorm Penyebab (AI)
                    </Button>
                    <div className="flex items-center space-x-1 border p-0.5 rounded-md">
                        <Button
                            variant={causeViewMode === 'table' ? 'secondary' : 'ghost'}
                            size="icon"
                            onClick={() => setCauseViewMode('table')}
                            aria-label="Tampilan Tabel Penyebab"
                            className="h-7 w-7"
                        >
                            <List className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={causeViewMode === 'card' ? 'secondary' : 'ghost'}
                            size="icon"
                            onClick={() => setCauseViewMode('card')}
                            aria-label="Tampilan Kartu Penyebab"
                            className="h-7 w-7"
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmitRiskCause(onRiskCauseSubmit)} className="space-y-4 border p-4 rounded-md shadow">
                <h3 className="text-lg font-semibold">Tambah Penyebab Baru (Manual)</h3>
                <div className="space-y-1.5">
                  <Label htmlFor="causeDescription">Deskripsi Penyebab</Label>
                  <Textarea
                    id="causeDescription"
                    {...registerRiskCause("causeDescription")}
                    className={riskCauseErrors.causeDescription ? "border-destructive" : ""}
                    rows={2}
                    placeholder="Jelaskan penyebab spesifik..."
                    disabled={isAddingCause}
                  />
                  {riskCauseErrors.causeDescription && <p className="text-xs text-destructive mt-1">{riskCauseErrors.causeDescription.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="causeSource">Sumber Penyebab</Label>
                  <Controller
                    name="causeSource"
                    control={riskCauseControl}
                    defaultValue="Internal"
                    render={({ field }) => (
                        <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={isAddingCause}
                        >
                            <SelectTrigger id="causeSource" className={riskCauseErrors.causeSource ? "border-destructive" : ""}>
                            <SelectValue placeholder="Pilih sumber" />
                            </SelectTrigger>
                            <SelectContent>
                            {RISK_SOURCES.map(src => (
                                <SelectItem key={src} value={src}>{src}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                    )}
                  />
                  {riskCauseErrors.causeSource && <p className="text-xs text-destructive mt-1">{riskCauseErrors.causeSource.message}</p>}
                </div>
                <Button type="submit" disabled={isAddingCause || !currentUser} size="sm">
                  {isAddingCause ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                  Tambah Penyebab (Manual)
                </Button>
              </form>

              <div>
                <h3 className="text-lg font-semibold mb-2">Penyebab yang Ada ({displayedRiskCauses.length})</h3>
                {riskCausesLoading && <div className="flex justify-center items-center p-4"><Loader2 className="h-6 w-6 animate-spin" /> <span className="ml-2">Memuat penyebab...</span></div>}
                {!riskCausesLoading && displayedRiskCauses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada penyebab yang teridentifikasi untuk potensi risiko ini.</p>
                ) : !riskCausesLoading && causeViewMode === 'table' ? (
                  <div className="border rounded-md overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">Kode</TableHead>
                          <TableHead className="min-w-[250px]">Deskripsi</TableHead>
                          <TableHead className="min-w-[100px]">Sumber</TableHead>
                          <TableHead className="min-w-[150px]">KRI</TableHead>
                          <TableHead className="min-w-[150px]">Toleransi</TableHead>
                          <TableHead className="min-w-[150px]">Tingkat Risiko</TableHead>
                          <TableHead className="text-right min-w-[100px]">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayedRiskCauses.map(cause => {
                            const {level: causeRiskLevelText, score: causeRiskScore} = getCalculatedRiskLevel(cause.likelihood, cause.impact);
                            const returnPath = `/all-risks/manage/${currentPotentialRisk.id}`;
                            const causeFullCode = `${potentialRiskCode}.PC${cause.sequenceNumber}`;
                            return (
                              <TableRow key={cause.id}>
                                <TableCell className="font-mono text-xs">{causeFullCode}</TableCell>
                                <TableCell className="text-xs max-w-sm truncate" title={cause.description}>{cause.description}</TableCell>
                                <TableCell><Badge variant="outline" className="text-xs">{cause.source}</Badge></TableCell>
                                <TableCell className="text-xs max-w-[150px] truncate" title={cause.keyRiskIndicator || ''}>{cause.keyRiskIndicator || '-'}</TableCell>
                                <TableCell className="text-xs max-w-[150px] truncate" title={cause.riskTolerance || ''}>{cause.riskTolerance || '-'}</TableCell>
                                <TableCell>
                                   <Badge className={`${getRiskLevelColor(causeRiskLevelText)} text-xs`}>
                                      {causeRiskLevelText === 'N/A' ? 'N/A' : `${causeRiskLevelText} (${causeRiskScore || 'N/A'})`}
                                   </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7">
                                        <Settings2 className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem asChild>
                                        <Link href={`/risk-cause-analysis/${cause.id}?from=${encodeURIComponent(returnPath)}`}>
                                          <BarChart3 className="mr-2 h-4 w-4" />
                                          Analisis Detail
                                        </Link>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleOpenDeleteCauseAlert(cause)}
                                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                        disabled={!currentUser}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Hapus
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : !riskCausesLoading && ( // card view
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {displayedRiskCauses.map(cause => (
                      <RiskCauseCardItem
                        key={cause.id}
                        riskCause={cause}
                        potentialRiskFullCode={potentialRiskCode}
                        onAnalyze={(causeId) => router.push(`/risk-cause-analysis/${causeId}?from=${encodeURIComponent(`/all-risks/manage/${currentPotentialRisk.id}`)}`)}
                        onDelete={() => handleOpenDeleteCauseAlert(cause)}
                        returnPath={`/all-risks/manage/${currentPotentialRisk.id}`}
                        canDelete={!!currentUser}
                      />
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
      {currentPotentialRisk && parentGoalForDisplay && isBrainstormCausesContextModalOpen && (
        <BrainstormCausesContextModal
            isOpen={isBrainstormCausesContextModalOpen}
            onOpenChange={setIsBrainstormCausesContextModalOpen}
            potentialRisk={currentPotentialRisk}
            goalDescription={parentGoalForDisplay.description}
            onSuggestionsReady={handleAISuggestionsReady}
        />
      )}
      {isBrainstormCausesSuggestionsModalOpen && currentPotentialRisk && (
        <BrainstormSuggestionsModal
            isOpen={isBrainstormCausesSuggestionsModalOpen}
            onOpenChange={setIsBrainstormCausesSuggestionsModalOpen}
            suggestions={aiSuggestedCauses}
            onSaveSelectedCauses={handleSaveAISelectedCauses} 
        />
      )}
      <AlertDialog open={isDeleteCauseAlertOpen} onOpenChange={setIsDeleteCauseAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus Penyebab</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus penyebab "{causeToDelete?.description}" (PC{causeToDelete?.sequenceNumber})? Semua rencana pengendalian terkait juga akan dihapus. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setIsDeleteCauseAlertOpen(false); setCauseToDelete(null); }}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRiskCauseSubmit} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
