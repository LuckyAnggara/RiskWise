
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
import type { PotentialRisk, Goal, RiskCategory, RiskCause, RiskSource, LikelihoodLevelDesc, ImpactLevelDesc } from '@/lib/types';
import { RISK_CATEGORIES, RISK_SOURCES, LIKELIHOOD_LEVELS_DESC_MAP, IMPACT_LEVELS_DESC_MAP, CalculatedRiskLevelCategory } from '@/lib/types';
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, PlusCircle, Trash2, Loader2, Save, BarChart3, Wand2, Settings2, LayoutGrid, List, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUprId, getCurrentPeriod, initializeAppContext } from '@/lib/upr-period-context';
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
import { getGoals, type GoalsResult } from '@/services/goalService';
import { addPotentialRisk, getPotentialRiskById, updatePotentialRisk, getPotentialRisksByGoalId } from '@/services/potentialRiskService';
import { addRiskCause, getRiskCausesByPotentialRiskId, deleteRiskCauseAndSubCollections } from '@/services/riskCauseService';


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
  const { currentUser } = useAuth();

  const [currentUprId, setCurrentUprId] = useState('');
  const [currentPeriod, setCurrentPeriod] = useState('');
  
  const [pageIsLoading, setPageIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [currentPotentialRisk, setCurrentPotentialRisk] = useState<PotentialRisk | null>(null);
  const [riskCauses, setRiskCauses] = useState<RiskCause[]>([]);
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

  const fetchGoals = useCallback(async (uprId: string, period: string): Promise<Goal[]> => {
    if (!currentUser) return [];
    try {
      const goalsResult: GoalsResult = await getGoals(uprId, period);
      let fetchedGoals: Goal[] = [];
      if (goalsResult.success && goalsResult.goals) {
        fetchedGoals = goalsResult.goals;
        setGoals(fetchedGoals);
        if (fetchedGoals.length > 0 && isCreatingNew) {
          setPotentialRiskValue("goalId", fetchedGoals[0].id);
        }
      } else {
        setGoals([]); // Set to empty array if fetch fails or no goals
        toast({ title: "Kesalahan Data Sasaran", description: goalsResult.message || "Gagal memuat daftar sasaran.", variant: "destructive" });
      }
      return fetchedGoals;
    } catch (error: any) {
      toast({ title: "Kesalahan Fatal", description: `Gagal memuat daftar sasaran: ${error.message}`, variant: "destructive" });
      setGoals([]);
      return [];
    }
  }, [currentUser, isCreatingNew, setPotentialRiskValue, toast]);

  const fetchPotentialRiskAndCauses = useCallback(async (uprId: string, period: string, allGoals: Goal[]) => {
    if (isCreatingNew) {
      setCurrentPotentialRisk(null);
      setRiskCauses([]);
      const currentGoalId = allGoals.length > 0 ? allGoals[0].id : "";
      resetPotentialRiskForm({ description: "", goalId: currentGoalId, category: null, owner: "" });
      setPageIsLoading(false);
      return;
    }

    try {
      const risk = await getPotentialRiskById(potentialRiskIdParam);
      if (risk && risk.uprId === uprId && risk.period === period) {
        setCurrentPotentialRisk(risk);
        resetPotentialRiskForm({
          description: risk.description,
          goalId: risk.goalId,
          category: risk.category,
          owner: risk.owner || "",
        });
        const causes = await getRiskCausesByPotentialRiskId(risk.id, uprId, period);
        setRiskCauses(causes);
      } else {
        toast({ title: "Kesalahan", description: "Potensi Risiko tidak ditemukan atau tidak cocok dengan UPR/Periode.", variant: "destructive" });
        router.push('/all-risks');
      }
    } catch (error: any) {
      console.error("Error fetching potential risk/causes:", error);
      toast({ title: "Kesalahan", description: `Gagal memuat data potensi risiko: ${error.message}`, variant: "destructive" });
      router.push('/all-risks');
    } finally {
      setPageIsLoading(false);
    }
  }, [isCreatingNew, potentialRiskIdParam, resetPotentialRiskForm, router, toast]);


  useEffect(() => {
    if (typeof window !== 'undefined') {
      const context = initializeAppContext();
      setCurrentUprId(context.uprId);
      setCurrentPeriod(context.period);
      setPageIsLoading(true); 
      if (currentUser && context.uprId && context.period) {
        fetchGoals(context.uprId, context.period).then(loadedGoalsArray => {
          fetchPotentialRiskAndCauses(context.uprId, context.period, loadedGoalsArray);
        });
      } else if (!currentUser) {
        setPageIsLoading(false); 
      }
    }
  }, [fetchGoals, fetchPotentialRiskAndCauses, currentUser]); 


  const onPotentialRiskSubmit: SubmitHandler<PotentialRiskFormData> = async (data) => {
    if (!currentUser) {
      toast({ title: "Otentikasi Diperlukan", description: "Anda harus login.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    const parentGoal = goals.find(g => g.id === data.goalId);
    if (!parentGoal || parentGoal.uprId !== currentUprId || parentGoal.period !== currentPeriod) {
      toast({ title: "Kesalahan", description: "Sasaran induk yang dipilih tidak valid untuk UPR/Periode saat ini.", variant: "destructive" });
      setIsSaving(false);
      return;
    }

    let pRiskToSave: PotentialRisk;
    let successMessage = "";
    
    try {
      if (isCreatingNew) {
        const existingPRsForGoal = await getPotentialRisksByGoalId(parentGoal.id, currentUprId, currentPeriod);
        const newSequenceNumber = existingPRsForGoal.length + 1;
        const newPRData: Omit<PotentialRisk, 'id' | 'identifiedAt' | 'uprId' | 'period' | 'userId' | 'sequenceNumber'> = {
          goalId: data.goalId,
          description: data.description,
          category: data.category === NO_CATEGORY_SENTINEL ? null : data.category,
          owner: data.owner || null,
        };
        pRiskToSave = await addPotentialRisk(newPRData, parentGoal.id, currentUprId, currentPeriod, currentUser.uid, newSequenceNumber);
        successMessage = `Potensi Risiko "${pRiskToSave.description}" (PR${pRiskToSave.sequenceNumber}) dibuat. Anda sekarang dapat menambahkan penyebabnya.`;
        setCurrentPotentialRisk(pRiskToSave); 
        router.replace(`/all-risks/manage/${pRiskToSave.id}?from=${encodeURIComponent(searchParams.get('from') || '/all-risks')}`);
      } else if (currentPotentialRisk) {
        const updateData: Partial<Omit<PotentialRisk, 'id' | 'uprId' | 'period' | 'userId'>> = {
          description: data.description,
          category: data.category === NO_CATEGORY_SENTINEL ? null : data.category,
          owner: data.owner || null,
          goalId: data.goalId, 
        };
        await updatePotentialRisk(currentPotentialRisk.id, updateData);
        pRiskToSave = { ...currentPotentialRisk, ...updateData }; 
        setCurrentPotentialRisk(pRiskToSave); 
        successMessage = `Potensi Risiko "${pRiskToSave.description}" (PR${pRiskToSave.sequenceNumber}) diperbarui.`;
        if(currentPotentialRisk.goalId !== data.goalId){ 
             fetchPotentialRiskAndCauses(currentUprId, currentPeriod, goals);
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
    if (!currentPotentialRisk || !currentUser || !currentUprId || !currentPeriod) {
        toast({ title: "Kesalahan", description: "Konteks tidak lengkap untuk menambah penyebab.", variant: "destructive" });
        return;
    }
    
    // Directly use isAddingCause from react-hook-form
    // No need for separate setIsAddingCause(true/false)
    try {
      const newSequenceNumber = riskCauses.length + 1;
      const newCauseData: Omit<RiskCause, 'id' | 'createdAt' | 'uprId' | 'period' | 'userId' | 'potentialRiskId' | 'goalId' | 'sequenceNumber'> = {
          description: data.causeDescription,
          source: data.causeSource,
          keyRiskIndicator: null,
          riskTolerance: null,
          likelihood: null,
          impact: null,
      };
      const newCause = await addRiskCause(newCauseData, currentPotentialRisk.id, currentPotentialRisk.goalId, currentUprId, currentPeriod, currentUser.uid, newSequenceNumber);
      const updatedCauses = [...riskCauses, newCause].sort((a,b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0));
      setRiskCauses(updatedCauses);
      toast({ title: "Penyebab Risiko Ditambahkan", description: `Penyebab "${newCause.description}" (PC${newCause.sequenceNumber}) ditambahkan.` });
      resetRiskCauseForm();
    } catch (error: any) {
        console.error("Error adding risk cause:", error.message);
        toast({ title: "Gagal Menambah Penyebab", description: `Terjadi kesalahan saat menambah penyebab risiko: ${error.message}`, variant: "destructive" });
    }
  };
  
  const handleDeleteRiskCauseSubmit = async () => {
    if (!currentPotentialRisk || !causeToDelete || !currentUprId || !currentPeriod) return;

    try {
      await deleteRiskCauseAndSubCollections(causeToDelete.id, currentUprId, currentPeriod);
      let updatedCauses = riskCauses.filter(c => c.id !== causeToDelete.id);
      
      // Re-sequence the remaining causes
      updatedCauses = updatedCauses
        .sort((a,b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0))
        .map((cause, index) => ({ ...cause, sequenceNumber: index + 1 }));
      // Firestore update for re-sequenced items would go here if sequenceNumber is persisted there for ordering
      // For now, just updating local state for display order
      setRiskCauses(updatedCauses); 
      
      toast({ title: "Penyebab Risiko Dihapus", description: `Penyebab "${causeToDelete.description}" (PC${causeToDelete.sequenceNumber}) dan semua kontrol terkait telah dihapus.`, variant: "destructive" });
    } catch (error: any) {
        console.error("Error deleting risk cause:", error.message);
        toast({ title: "Gagal Menghapus", description: `Terjadi kesalahan saat menghapus penyebab risiko: ${error.message}`, variant: "destructive" });
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
    if (suggestions.length === 0) {
      toast({ title: "Tidak Ada Saran Penyebab", description: "AI tidak menghasilkan saran penyebab risiko untuk konteks ini.", variant: "default" });
      setIsBrainstormCausesContextModalOpen(false);
      return;
    }
    setAISuggestedCauses(suggestions);
    setIsBrainstormCausesContextModalOpen(false);
    setIsBrainstormCausesSuggestionsModalOpen(true);
  };

  const handleSaveAISelectedCauses = async (selectedItems: AISuggestedCauseItem[]) => {
    if (!currentPotentialRisk || !currentUser || !currentUprId || !currentPeriod) return;
    
    // isAddingCause from react-hook-form handles loading state of this form, not this bulk add.
    // Consider a separate loading state if this operation takes time.
    try {
      let currentSequence = riskCauses.length;
      const newRiskCausesPromises = selectedItems.map(item => {
        currentSequence++;
         const newCauseData: Omit<RiskCause, 'id' | 'createdAt' | 'uprId' | 'period' | 'userId' | 'potentialRiskId' | 'goalId' | 'sequenceNumber' > = {
            description: item.description,
            source: item.source || "Internal",
            keyRiskIndicator: null,
            riskTolerance: null,
            likelihood: null,
            impact: null,
        };
        return addRiskCause(newCauseData, currentPotentialRisk.id, currentPotentialRisk.goalId, currentUprId, currentPeriod, currentUser.uid, currentSequence);
      });
      const createdCauses = await Promise.all(newRiskCausesPromises);
      const updatedCauses = [...riskCauses, ...createdCauses].sort((a,b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0));
      setRiskCauses(updatedCauses);
      toast({ title: "Saran Penyebab Disimpan", description: `${createdCauses.length} penyebab risiko baru dari AI telah ditambahkan.` });
    } catch (error: any) {
        console.error("Error saving AI suggested causes:", error.message);
        toast({ title: "Gagal Menyimpan", description: `Terjadi kesalahan saat menyimpan saran penyebab dari AI: ${error.message}`, variant: "destructive" });
    } finally {
      setIsBrainstormCausesSuggestionsModalOpen(false);
    }
  };

  const defaultBackPath = useMemo(() => searchParams.get('from') || `/all-risks`, [searchParams]);

  if (pageIsLoading || !currentUprId || !currentPeriod) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat data potensi risiko...</p>
      </div>
    );
  }
  
  const parentGoalForDisplay = Array.isArray(goals) ? goals.find(g => g.id === (currentPotentialRisk ? currentPotentialRisk.goalId : (isCreatingNew && goals.length > 0 ? goals[0].id : ''))) : undefined;
  const goalCodeForPR = parentGoalForDisplay?.code || 'S?';
  const potentialRiskCode = goalCodeForPR && currentPotentialRisk ? `${goalCodeForPR}.PR${currentPotentialRisk.sequenceNumber}` : (isCreatingNew ? "PR Baru" : "PR...");


  return (
    <div className="space-y-6">
      <PageHeader
        title={isCreatingNew ? "Tambah Potensi Risiko Baru" : `Edit Potensi Risiko (${potentialRiskCode})`}
        description={`Kelola detail dan penyebab potensi risiko. UPR: ${currentUprId}, Periode: ${currentPeriod}.`}
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
                    <CardDescription className="mt-1">{currentPotentialRisk.description}</CardDescription>
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
                <h3 className="text-lg font-semibold mb-2">Penyebab yang Ada ({riskCauses.length})</h3>
                {riskCauses.length === 0 ? (
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
                        {riskCauses.map(cause => {
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
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {riskCauses.map(cause => (
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
            potentialRiskId={currentPotentialRisk.id}
            existingCausesCount={riskCauses.length}
            onSaveSelectedCauses={(newCausesData) => { // Adapt to directly receive RiskCause[] if modal is changed, or AISuggestedCauseItem[] if not
                 const transformedCauses = newCausesData.map(nc => ({
                    ...nc,
                    // Ensure all fields for RiskCause are present, or transform AISuggestedCauseItem to RiskCause structure here
                 }));
                // This assumes onSaveSelectedCauses from modal passes back AISuggestedCauseItem[]
                // If it passes RiskCause[], then handleSaveAISelectedCauses can be called directly
                handleSaveAISelectedCauses(newCausesData as AISuggestedCauseItem[]);
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

