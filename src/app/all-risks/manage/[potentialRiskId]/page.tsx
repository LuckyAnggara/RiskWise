
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
import { RISK_CATEGORIES, RISK_SOURCES } from '@/lib/types';
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
import { useAppStore } from '@/stores/useAppStore';
import { getGoals as fetchGoalsFromService } from '@/services/goalService';
import { addPotentialRisk as addPotentialRiskToService, getPotentialRiskById as getPotentialRiskByIdFromService, updatePotentialRisk as updatePotentialRiskInService } from '@/services/potentialRiskService';
import { addRiskCause as addRiskCauseToService, getRiskCausesByPotentialRiskId as getRiskCausesByPotentialRiskIdFromService, deleteRiskCause as deleteRiskCauseFromService } from '@/services/riskCauseService';


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
}

export default function ManagePotentialRiskPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const potentialRiskIdParam = params.potentialRiskId as string;
  const isCreatingNew = potentialRiskIdParam === 'new';
  const { currentUser, appUser, loading: authLoading, isProfileComplete, profileLoading } = useAuth();

  const store = useAppStore(); // Menggunakan store secara langsung untuk beberapa actions
  
  const [pageIsLoading, setPageIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [allGoals, setAllGoals] = useState<Goal[]>([]); // State lokal untuk daftar sasaran
  const [currentPotentialRisk, setCurrentPotentialRisk] = useState<PotentialRisk | null>(null);
  const [displayedRiskCauses, setDisplayedRiskCauses] = useState<RiskCause[]>([]); // State lokal untuk penyebab

  const [causeViewMode, setCauseViewMode] = useState<'table' | 'card'>('table');
  const [causeToDelete, setCauseToDelete] = useState<RiskCause | null>(null);
  const [isDeleteCauseAlertOpen, setIsDeleteCauseAlertOpen] = useState(false);

  const [isBrainstormCausesContextModalOpen, setIsBrainstormCausesContextModalOpen] = useState(false);
  const [isBrainstormCausesSuggestionsModalOpen, setIsBrainstormCausesSuggestionsModalOpen] = useState(false);
  const [aiSuggestedCauses, setAISuggestedCauses] = useState<AISuggestedCauseItem[]>([]);

  const { toast } = useToast();

  const currentUserId = useMemo(() => currentUser?.uid || null, [currentUser]);
  const currentPeriod = useMemo(() => appUser?.activePeriod || null, [appUser]);
  const uprDisplayName = useMemo(() => appUser?.displayName || 'UPR...', [appUser]);
  
  const defaultBackPath = useMemo(() => {
    const from = searchParams.get('from');
    if (from) return from;
    return currentPotentialRisk?.goalId ? `/risks/${currentPotentialRisk.goalId}` : `/all-risks`;
  }, [searchParams, currentPotentialRisk?.goalId]);

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


  const fetchPageData = useCallback(async () => {
    if (!currentUserId || !currentPeriod) {
      console.warn("[ManagePRPage] fetchPageData: User context not ready. Aborting.");
      setPageIsLoading(false);
      return;
    }
    setPageIsLoading(true);
    let isActive = true;

    try {
      // 1. Fetch Goals
      const goalsResult = await fetchGoalsFromService(currentUserId, currentPeriod);
      if (!isActive) return;
      if (goalsResult.success && goalsResult.goals) {
        const sortedGoals = goalsResult.goals.sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' }));
        setAllGoals(sortedGoals);
        
        if (isCreatingNew) {
          const defaultGoalIdFromQuery = searchParams.get('goalId');
          const defaultGoalId = defaultGoalIdFromQuery || (sortedGoals.length > 0 ? sortedGoals[0].id : "");
          resetPotentialRiskForm({ description: "", goalId: defaultGoalId, category: null, owner: "" });
          setCurrentPotentialRisk(null);
          setDisplayedRiskCauses([]);
        }
      } else {
        toast({ title: "Gagal Memuat Sasaran", description: goalsResult.message || "Tidak dapat memuat daftar sasaran.", variant: "destructive"});
        setAllGoals([]);
      }

      // 2. Fetch Potential Risk (if editing) and its Causes
      if (!isCreatingNew && potentialRiskIdParam) {
        const risk = await getPotentialRiskByIdFromService(potentialRiskIdParam, currentUserId, currentPeriod);
        if (!isActive) return;
        if (risk) {
          setCurrentPotentialRisk(risk);
          resetPotentialRiskForm({
            description: risk.description,
            goalId: risk.goalId,
            category: risk.category,
            owner: risk.owner || "",
          });
          const causes = await getRiskCausesByPotentialRiskIdFromService(risk.id, currentUserId, currentPeriod);
          if (!isActive) return;
          setDisplayedRiskCauses(causes.sort((a,b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0)));
        } else {
          toast({ title: "Kesalahan", description: "Potensi Risiko tidak ditemukan atau tidak cocok dengan konteks pengguna/periode.", variant: "destructive" });
          router.push(defaultBackPath);
        }
      }
    } catch (error: any) {
      if (!isActive) return;
      console.error("[ManagePRPage] Error fetching page data:", error.message || String(error));
      toast({ title: "Kesalahan Fatal", description: `Gagal memuat data: ${error.message || String(error)}`, variant: "destructive" });
      router.push(defaultBackPath);
    } finally {
      if (isActive) setPageIsLoading(false);
    }
    return () => { isActive = false; };
  }, [potentialRiskIdParam, isCreatingNew, resetPotentialRiskForm, router, toast, defaultBackPath, currentUserId, currentPeriod, searchParams]);

  useEffect(() => {
    if (authLoading || profileLoading) {
      setPageIsLoading(true);
      return;
    }
    if (!currentUser || !isProfileComplete || !currentUserId || !currentPeriod) {
      setPageIsLoading(true); 
      if (!authLoading && !currentUser) router.push('/login');
      else if (!authLoading && !isProfileComplete && pathname !== '/settings') router.push('/settings');
      return;
    }
    fetchPageData();
  }, [authLoading, profileLoading, currentUser, isProfileComplete, currentUserId, currentPeriod, fetchPageData, router]);


  const onPotentialRiskSubmit: SubmitHandler<PotentialRiskFormData> = async (formData) => {
    if (!currentUser || !currentUserId || !currentPeriod) {
      toast({ title: "Konteks Tidak Lengkap", description: "Informasi pengguna atau periode tidak tersedia.", variant: "destructive" });
      return;
    }
    
    const parentGoal = allGoals.find(g => g.id === formData.goalId);
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
        const existingPRsForGoal = store.getState().potentialRisks.filter(pr => pr.goalId === parentGoal.id && pr.userId === currentUserId && pr.period === currentPeriod);
        const newSequenceNumber = existingPRsForGoal.length + 1;
        
        const userIdForService = currentUser.uid;
        const periodForService = appUser?.activePeriod;

        if (!userIdForService || !periodForService) {
          toast({ title: "Kesalahan Kritis", description: "User ID atau Periode tidak valid saat mencoba menyimpan. Harap coba lagi.", variant: "destructive" });
          setIsSaving(false);
          return;
        }
        savedPotentialRisk = await addPotentialRiskToService(pRiskDataPayload, parentGoal.id, userIdForService, periodForService, newSequenceNumber);
        if (savedPotentialRisk) {
          store.getState().addPotentialRisk(pRiskDataPayload, parentGoal.id, userIdForService, periodForService, newSequenceNumber); // Update store
          successMessage = `Potensi Risiko "${savedPotentialRisk.description}" (Kode: ${parentGoal.code}.PR${savedPotentialRisk.sequenceNumber}) dibuat. Anda sekarang dapat menambahkan penyebabnya.`;
          setCurrentPotentialRisk(savedPotentialRisk); 
          router.replace(`/all-risks/manage/${savedPotentialRisk.id}?from=${encodeURIComponent(defaultBackPath)}`); 
        } else {
          throw new Error("Gagal membuat potensi risiko baru melalui service.");
        }
      } else if (currentPotentialRisk) {
        const updateData: Partial<Omit<PotentialRisk, 'id' | 'userId' | 'period' | 'identifiedAt' | 'sequenceNumber' | 'updatedAt'>> = { 
            ...pRiskDataPayload 
        };
        if (currentPotentialRisk.goalId !== formData.goalId) {
            updateData.goalId = formData.goalId;
        }
        
        savedPotentialRisk = await updatePotentialRiskInService(currentPotentialRisk.id, updateData);
        if (savedPotentialRisk) {
          store.getState().updatePotentialRisk(currentPotentialRisk.id, updateData); // Update store
          successMessage = `Potensi Risiko "${savedPotentialRisk.description}" (Kode: ${parentGoal.code}.PR${savedPotentialRisk.sequenceNumber}) diperbarui.`;
          setCurrentPotentialRisk(savedPotentialRisk); 
        } else {
          throw new Error("Gagal memperbarui potensi risiko melalui service.");
        }
      } else {
        toast({ title: "Kesalahan", description: "Tidak dapat menyimpan. Data potensi risiko tidak lengkap.", variant: "destructive" });
        setIsSaving(false);
        return;
      }
      toast({ title: "Sukses", description: successMessage });
    } catch (error: any) {
        console.error("[ManagePRPage] Error saving potential risk:", error.message || String(error));
        toast({ title: "Gagal Menyimpan", description: `Terjadi kesalahan saat menyimpan potensi risiko: ${error.message || String(error)}`, variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  const onRiskCauseSubmit: SubmitHandler<RiskCauseFormData> = async (data) => {
    if (!currentUser || !currentUserId || !currentPeriod) {
        toast({ title: "Konteks Pengguna/Periode Hilang", variant: "destructive" });
        return;
    }
    if (!currentPotentialRisk) {
        toast({ title: "Kesalahan", description: "Konteks potensi risiko induk tidak ditemukan.", variant: "destructive" });
        return;
    }
    
    try {
      const existingCausesForPR = displayedRiskCauses;
      const newSequenceNumber = existingCausesForPR.length + 1;
      const newCauseData: Omit<RiskCause, 'id' | 'createdAt' | 'userId' | 'period' | 'potentialRiskId' | 'goalId' | 'sequenceNumber' > = {
          description: data.causeDescription,
          source: data.causeSource,
      };
      const newCause = await addRiskCauseToService(newCauseData, currentPotentialRisk.id, currentPotentialRisk.goalId, currentUserId, currentPeriod, newSequenceNumber);
      if (newCause) {
        setDisplayedRiskCauses(prev => [...prev, newCause].sort((a,b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0)));
        toast({ title: "Penyebab Risiko Ditambahkan", description: `Penyebab "${newCause.description}" (PC${newCause.sequenceNumber}) ditambahkan.` });
        resetRiskCauseForm();
      } else {
        throw new Error("Gagal membuat penyebab risiko baru melalui service.");
      }
    } catch (error: any) {
        console.error("[ManagePRPage] Error adding risk cause:", error.message || String(error));
        toast({ title: "Gagal Menambah Penyebab", description: `Terjadi kesalahan: ${error.message || String(error)}`, variant: "destructive" });
    }
  };

  const handleDeleteRiskCauseSubmit = async () => {
    if (!currentUser || !currentUserId || !currentPeriod) {
        toast({ title: "Konteks Pengguna/Periode Hilang", variant: "destructive" });
        setIsDeleteCauseAlertOpen(false); setCauseToDelete(null); return;
    }
     if (!currentPotentialRisk || !causeToDelete) {
        toast({ title: "Data Tidak Lengkap", variant: "destructive" });
        setIsDeleteCauseAlertOpen(false); setCauseToDelete(null); return;
    }
    
    try {
      await deleteRiskCauseFromService(causeToDelete.id, currentUserId, currentPeriod); // Ini sudah menghapus dari Firestore dan subkoleksi
      setDisplayedRiskCauses(prev => prev.filter(c => c.id !== causeToDelete!.id));
      toast({ title: "Penyebab Risiko Dihapus", description: `Penyebab "${causeToDelete.description}" (PC${causeToDelete.sequenceNumber}) dan data terkait telah dihapus.`, variant: "destructive" });
    } catch (error: any) {
        console.error("[ManagePRPage] Error deleting risk cause:", error.message || String(error));
        toast({ title: "Gagal Menghapus", description: `Terjadi kesalahan: ${error.message || String(error)}`, variant: "destructive" });
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
     if (!currentUser || !currentUserId || !currentPeriod) {
        toast({ title: "Konteks Pengguna/Periode Hilang", variant: "destructive" });
        setIsBrainstormCausesSuggestionsModalOpen(false); return;
    }
    if (!currentPotentialRisk) {
      toast({ title: "Konteks Potensi Risiko Hilang", variant: "destructive" });
      setIsBrainstormCausesSuggestionsModalOpen(false); return;
    }

    try {
      let currentSequence = displayedRiskCauses.length;
      const newRiskCausesPromises: Promise<RiskCause | null>[] = [];

      for (const item of selectedItems) {
        currentSequence++;
        const newCauseData: Omit<RiskCause, 'id' | 'createdAt' | 'userId' | 'period' | 'potentialRiskId' | 'goalId' | 'sequenceNumber' > = {
            description: item.description,
            source: item.source || "Internal", 
        };
        newRiskCausesPromises.push(addRiskCauseToService(newCauseData, currentPotentialRisk.id, currentPotentialRisk.goalId, currentUserId, currentPeriod, currentSequence));
      }
      
      const createdCauses = (await Promise.all(newRiskCausesPromises)).filter(Boolean) as RiskCause[];
      
      if (createdCauses.length > 0) {
        setDisplayedRiskCauses(prev => [...prev, ...createdCauses].sort((a,b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0)));
        toast({ title: "Saran Penyebab Disimpan", description: `${createdCauses.length} penyebab risiko baru dari AI telah ditambahkan.` });
      }
      if (selectedItems.length !== createdCauses.length) {
         toast({ title: "Sebagian Gagal Disimpan", description: "Beberapa saran penyebab dari AI gagal disimpan.", variant: "warning" });
      }
    } catch (error: any) {
        console.error("[ManagePRPage] Error saving AI suggested causes:", error.message || String(error));
        toast({ title: "Gagal Menyimpan", description: `Terjadi kesalahan: ${error.message || String(error)}`, variant: "destructive" });
    } finally {
      setIsBrainstormCausesSuggestionsModalOpen(false);
    }
  };

  const isLoadingPageContext = authLoading || profileLoading;
  const isLoadingData = pageIsLoading || (isCreatingNew ? false : (!currentPotentialRisk && !authLoading && !profileLoading));


  if (isLoadingPageContext || isLoadingData) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat data potensi risiko...</p>
      </div>
    );
  }
  
  if (!currentUser || !isProfileComplete) {
    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-xl text-muted-foreground">Mengarahkan...</p>
        </div>
    );
  }

  const parentGoalForDisplay = allGoals.find(g => g.id === (currentPotentialRisk ? currentPotentialRisk.goalId : (isCreatingNew ? getPotentialRiskValues("goalId") : '')));
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
                        disabled={allGoals.length === 0 || isSaving}
                    >
                        <SelectTrigger id="goalIdPotentialRisk" className={potentialRiskErrors.goalId ? "border-destructive" : ""}>
                        <SelectValue placeholder="Pilih sasaran" />
                        </SelectTrigger>
                        <SelectContent>
                        {allGoals.length > 0 ? (
                            allGoals.map(goal => (
                            <SelectItem key={goal.id} value={goal.id}>{(goal.code || '[Tanpa Kode]') + ' - ' + goal.name}</SelectItem>
                            ))
                        ) : (
                            <SelectItem value="no-goals" disabled>Tidak ada sasaran di UPR/Periode ini. Harap buat sasaran terlebih dahulu.</SelectItem>
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
              <Button type="submit" disabled={isSaving || (allGoals.length === 0 && isCreatingNew) || !currentUser}>
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
                        disabled={!currentPotentialRisk || !parentGoalForDisplay || !currentUser}
                        className="text-xs"
                    >
                        <Wand2 className="mr-2 h-3 w-3" /> Brainstorm Penyebab (AI)
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
                {displayedRiskCauses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada penyebab yang teridentifikasi untuk potensi risiko ini.</p>
                ) : causeViewMode === 'table' ? (
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
                                      {causeRiskLevelText === 'N/A' ? 'N/A' : `${causeRiskLevelText} (${causeRiskScore ?? 'N/A'})`}
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
                ) : ( 
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {displayedRiskCauses.map(cause => (
                      <RiskCauseCardItem
                        key={cause.id}
                        riskCause={cause}
                        potentialRiskFullCode={potentialRiskCode}
                        returnPath={`/all-risks/manage/${currentPotentialRisk.id}`}
                        canDelete={!!currentUser}
                        onDeleteClick={() => handleOpenDeleteCauseAlert(cause)}
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
            potentialRiskId={currentPotentialRisk.id} // Tambahkan ini
            existingCausesCount={displayedRiskCauses.length} // Tambahkan ini
            onSaveSelectedCauses={(newCausesData) => { // Sesuaikan handler
                // Logika ini sekarang mirip dengan onRiskCauseSubmit tapi untuk batch
                const newCauses: RiskCause[] = newCausesData.map((causeData, index) => ({
                    ...causeData, // causeData adalah AISuggestedCauseItem
                    id: `rcause_${Date.now()}_${index}`, // Buat ID unik
                    potentialRiskId: currentPotentialRisk.id,
                    goalId: currentPotentialRisk.goalId,
                    userId: currentUserId!,
                    period: currentPeriod!,
                    sequenceNumber: displayedRiskCauses.length + index + 1,
                    createdAt: new Date().toISOString(),
                    // field analisis lainnya default ke null
                    keyRiskIndicator: null,
                    riskTolerance: null,
                    likelihood: null,
                    impact: null,
                }));
                
                const allNewCausesPromises = newCauses.map(nc => 
                    addRiskCauseToService(
                        { description: nc.description, source: nc.source },
                        nc.potentialRiskId,
                        nc.goalId,
                        nc.userId,
                        nc.period,
                        nc.sequenceNumber
                    )
                );

                Promise.all(allNewCausesPromises).then(createdServiceCauses => {
                    const successfulCauses = createdServiceCauses.filter(Boolean) as RiskCause[];
                    if (successfulCauses.length > 0) {
                        setDisplayedRiskCauses(prev => [...prev, ...successfulCauses].sort((a,b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0)));
                        toast({ title: "Saran Penyebab Disimpan", description: `${successfulCauses.length} penyebab risiko baru dari AI telah ditambahkan.` });
                    }
                    if (newCauses.length !== successfulCauses.length) {
                        toast({ title: "Sebagian Gagal Disimpan", description: "Beberapa saran penyebab dari AI gagal disimpan.", variant: "warning" });
                    }
                }).catch(error => {
                    console.error("Error saving batch AI suggested causes:", error);
                    toast({ title: "Gagal Menyimpan Saran AI", description: `Terjadi kesalahan: ${error.message || String(error)}`, variant: "destructive" });
                });
                setIsBrainstormCausesSuggestionsModalOpen(false);
            }}
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
