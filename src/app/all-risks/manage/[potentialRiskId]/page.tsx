
"use client";

import React, { useState, useEffect, useCallback } from 'react';
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
import type { PotentialRisk, Goal, RiskCategory, RiskCause, RiskSource, LikelihoodLevelDesc, ImpactLevelDesc, CalculatedRiskLevelCategory } from '@/lib/types';
import { RISK_CATEGORIES, RISK_SOURCES, LIKELIHOOD_LEVELS_MAP, IMPACT_LEVELS_MAP } from '@/lib/types';
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, PlusCircle, Trash2, Loader2, Save, BarChart3, Wand2, Settings2, LayoutGrid, List } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUprId, getCurrentPeriod, initializeAppContext } from '@/lib/upr-period-context';
import { Separator } from '@/components/ui/separator';
import { BrainstormCausesContextModal } from '@/components/risks/brainstorm-causes-context-modal';
import { BrainstormCausesSuggestionsModal } from '@/components/risks/brainstorm-causes-suggestions-modal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RiskCauseCardItem } from '@/components/risks/risk-cause-card-item'; // Import the new card item


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

const getGoalsStorageKey = (uprId: string, period: string) => `riskwise-upr${uprId}-period${period}-goals`;
const getPotentialRisksStorageKeyForGoal = (uprId: string, period: string, goalId: string) => `riskwise-upr${uprId}-period${period}-goal${goalId}-potentialRisks`;
const getRiskCausesStorageKey = (uprId: string, period: string, potentialRiskId: string) => `riskwise-upr${uprId}-period${period}-potentialRisk${potentialRiskId}-causes`;

type AISuggestedCause = {
  description: string;
  source: RiskSource | null;
};

// Helper function from risk-cause-analysis page (or make it a shared util)
export const getCalculatedRiskLevel = (likelihood: LikelihoodLevelDesc | null, impact: ImpactLevelDesc | null): { level: CalculatedRiskLevelCategory | 'N/A'; score: number | null } => {
  if (!likelihood || !impact) return { level: 'N/A', score: null };
  
  const likelihoodValue = LIKELIHOOD_LEVELS_MAP[likelihood];
  const impactValue = IMPACT_LEVELS_MAP[impact];

  if (likelihoodValue === undefined || impactValue === undefined) return { level: 'N/A', score: null };

  const score = likelihoodValue * impactValue;

  let level: CalculatedRiskLevelCategory;
  if (score >= 20) level = 'Sangat Tinggi';
  else if (score >= 16) level = 'Tinggi';
  else if (score >= 12) level = 'Sedang';
  else if (score >= 6) level = 'Rendah';
  else if (score >= 1) level = 'Sangat Rendah';
  else level = 'Sangat Rendah'; 

  return { level, score };
};

export const getRiskLevelColor = (level: CalculatedRiskLevelCategory | 'N/A') => {
  switch (level?.toLowerCase()) {
    case 'sangat tinggi': return 'bg-red-600 hover:bg-red-700 text-white';
    case 'tinggi': return 'bg-orange-500 hover:bg-orange-600 text-white';
    case 'sedang': return 'bg-yellow-400 hover:bg-yellow-500 text-black dark:bg-yellow-500 dark:text-black';
    case 'rendah': return 'bg-blue-500 hover:bg-blue-600 text-white'; 
    case 'sangat rendah': return 'bg-green-500 hover:bg-green-600 text-white';
    default: return 'bg-gray-400 hover:bg-gray-500 text-white';
  }
};


export default function ManagePotentialRiskPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const potentialRiskIdParam = params.potentialRiskId as string;
  const isCreatingNew = potentialRiskIdParam === 'new';

  const [currentUprId, setCurrentUprId] = useState('');
  const [currentPeriod, setCurrentPeriod] = useState('');
  
  const [pageIsLoading, setPageIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [currentPotentialRisk, setCurrentPotentialRisk] = useState<PotentialRisk | null>(null);
  const [riskCauses, setRiskCauses] = useState<RiskCause[]>([]);
  const [causeViewMode, setCauseViewMode] = useState<'table' | 'card'>('table'); // New state for cause view mode

  const [isBrainstormCausesContextModalOpen, setIsBrainstormCausesContextModalOpen] = useState(false);
  const [isBrainstormCausesSuggestionsModalOpen, setIsBrainstormCausesSuggestionsModalOpen] = useState(false);
  const [aiSuggestedCauses, setAISuggestedCauses] = useState<AISuggestedCause[]>([]);

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

  const loadAllGoals = useCallback((uprId: string, period: string) => {
    const goalsStorageKey = getGoalsStorageKey(uprId, period);
    const storedGoalsData = localStorage.getItem(goalsStorageKey);
    const loadedGoals: Goal[] = storedGoalsData ? JSON.parse(storedGoalsData).sort((a:Goal, b:Goal) => (a.code || '').localeCompare(b.code || '', undefined, {numeric: true, sensitivity: 'base'})) : [];
    setGoals(loadedGoals);
    if (loadedGoals.length > 0 && isCreatingNew) {
        setPotentialRiskValue("goalId", loadedGoals[0].id);
    }
    return loadedGoals;
  }, [isCreatingNew, setPotentialRiskValue]);

  const loadPotentialRiskAndCauses = useCallback(async (uprId: string, period: string, allGoals: Goal[]) => {
    if (isCreatingNew) {
      setCurrentPotentialRisk(null);
      setRiskCauses([]);
      resetPotentialRiskForm({ description: "", goalId: allGoals.length > 0 ? allGoals[0].id : "", category: null, owner: "" });
      setPageIsLoading(false);
      return;
    }

    let foundPotentialRisk: PotentialRisk | null = null;
    let parentGoalForRisk: Goal | null = null;

    for (const goal of allGoals) {
        const potentialRisksStorageKey = getPotentialRisksStorageKeyForGoal(goal.uprId, goal.period, goal.id);
        const storedPotentialRisksData = localStorage.getItem(potentialRisksStorageKey);
        if (storedPotentialRisksData) {
            const goalPotentialRisks: PotentialRisk[] = JSON.parse(storedPotentialRisksData);
            const risk = goalPotentialRisks.find(pr => pr.id === potentialRiskIdParam);
            if (risk) {
                foundPotentialRisk = risk;
                parentGoalForRisk = goal;
                break;
            }
        }
    }
    
    setCurrentPotentialRisk(foundPotentialRisk);

    if (foundPotentialRisk && parentGoalForRisk) {
      resetPotentialRiskForm({
        description: foundPotentialRisk.description,
        goalId: foundPotentialRisk.goalId,
        category: foundPotentialRisk.category,
        owner: foundPotentialRisk.owner || "",
      });
      const causesStorageKey = getRiskCausesStorageKey(parentGoalForRisk.uprId, parentGoalForRisk.period, foundPotentialRisk.id);
      const storedCausesData = localStorage.getItem(causesStorageKey);
      setRiskCauses(storedCausesData ? JSON.parse(storedCausesData).sort((a: RiskCause, b: RiskCause) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0)) : []);
    } else if (!isCreatingNew) {
      toast({ title: "Kesalahan", description: "Potensi Risiko tidak ditemukan.", variant: "destructive" });
      router.push('/all-risks');
    }
    setPageIsLoading(false);
  }, [isCreatingNew, potentialRiskIdParam, resetPotentialRiskForm, router, toast]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const context = initializeAppContext();
      setCurrentUprId(context.uprId);
      setCurrentPeriod(context.period);
      setPageIsLoading(true);
      const loadedGoals = loadAllGoals(context.uprId, context.period);
      loadPotentialRiskAndCauses(context.uprId, context.period, loadedGoals);
    }
  }, [loadAllGoals, loadPotentialRiskAndCauses]); 


  const onPotentialRiskSubmit: SubmitHandler<PotentialRiskFormData> = async (data) => {
    setIsSaving(true);
    const parentGoal = goals.find(g => g.id === data.goalId);
    if (!parentGoal || parentGoal.uprId !== currentUprId || parentGoal.period !== currentPeriod) {
      toast({ title: "Kesalahan", description: "Sasaran induk yang dipilih tidak valid untuk UPR/Periode saat ini.", variant: "destructive" });
      setIsSaving(false);
      return;
    }

    let pRiskToSave: PotentialRisk;
    let successMessage = "";
    
    const goalPotentialRisksKey = getPotentialRisksStorageKeyForGoal(parentGoal.uprId, parentGoal.period, parentGoal.id);
    const storedPotentialRisks = localStorage.getItem(goalPotentialRisksKey);
    let currentGoalPotentialRisks: PotentialRisk[] = storedPotentialRisks ? JSON.parse(storedPotentialRisks) : [];

    if (isCreatingNew) {
      pRiskToSave = {
        id: `prisk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        goalId: data.goalId,
        description: data.description,
        category: data.category === NO_CATEGORY_SENTINEL ? null : data.category,
        owner: data.owner || null,
        identifiedAt: new Date().toISOString(),
        sequenceNumber: currentGoalPotentialRisks.length + 1,
      };
      successMessage = `Potensi Risiko "${pRiskToSave.description}" (PR${pRiskToSave.sequenceNumber}) dibuat. Anda sekarang dapat menambahkan penyebabnya.`;
      currentGoalPotentialRisks.push(pRiskToSave);
      localStorage.setItem(goalPotentialRisksKey, JSON.stringify(currentGoalPotentialRisks.sort((a,b)=>(a.sequenceNumber || 0) - (b.sequenceNumber || 0) || a.description.localeCompare(b.description))));
      
      setCurrentPotentialRisk(pRiskToSave); 
      router.replace(`/all-risks/manage/${pRiskToSave.id}`);

    } else if (currentPotentialRisk) {
      pRiskToSave = {
        ...currentPotentialRisk,
        description: data.description,
        category: data.category === NO_CATEGORY_SENTINEL ? null : data.category,
        owner: data.owner || null,
      };

      if (currentPotentialRisk.goalId !== data.goalId) {
        const oldParentGoal = goals.find(g => g.id === currentPotentialRisk.goalId);
        if (oldParentGoal) {
            const oldGoalPRKey = getPotentialRisksStorageKeyForGoal(oldParentGoal.uprId, oldParentGoal.period, oldParentGoal.id);
            let oldGoalPRs: PotentialRisk[] = JSON.parse(localStorage.getItem(oldGoalPRKey) || '[]');
            oldGoalPRs = oldGoalPRs.filter(pr => pr.id !== currentPotentialRisk.id);
            oldGoalPRs.forEach((pr, index) => pr.sequenceNumber = index + 1);
            localStorage.setItem(oldGoalPRKey, JSON.stringify(oldGoalPRs.sort((a,b)=>(a.sequenceNumber || 0) - (b.sequenceNumber || 0) || a.description.localeCompare(b.description))));
        }
        const newGoalPRKey = getPotentialRisksStorageKeyForGoal(parentGoal.uprId, parentGoal.period, data.goalId);
        let newGoalPRs: PotentialRisk[] = JSON.parse(localStorage.getItem(newGoalPRKey) || '[]');
        pRiskToSave.goalId = data.goalId; 
        pRiskToSave.sequenceNumber = newGoalPRs.length + 1; 
        newGoalPRs.push(pRiskToSave);
        localStorage.setItem(newGoalPRKey, JSON.stringify(newGoalPRs.sort((a,b)=>(a.sequenceNumber || 0) - (b.sequenceNumber || 0) || a.description.localeCompare(b.description))));
      } else {
        currentGoalPotentialRisks = currentGoalPotentialRisks.map(pr => pr.id === pRiskToSave.id ? pRiskToSave : pr);
        localStorage.setItem(goalPotentialRisksKey, JSON.stringify(currentGoalPotentialRisks.sort((a,b)=>(a.sequenceNumber || 0) - (b.sequenceNumber || 0) || a.description.localeCompare(b.description))));
      }
      setCurrentPotentialRisk(pRiskToSave); 
      successMessage = `Potensi Risiko "${pRiskToSave.description}" (PR${pRiskToSave.sequenceNumber}) diperbarui.`;
    } else {
      toast({ title: "Kesalahan", description: "Tidak dapat menyimpan. Data potensi risiko tidak lengkap.", variant: "destructive" });
      setIsSaving(false);
      return;
    }
    
    toast({ title: "Sukses", description: successMessage });
    setIsSaving(false);
  };

  const onRiskCauseSubmit: SubmitHandler<RiskCauseFormData> = (data) => {
    if (!currentPotentialRisk || !currentUprId || !currentPeriod) {
        toast({ title: "Kesalahan", description: "Tidak dapat menambah penyebab. Konteks potensi risiko induk tidak ditemukan.", variant: "destructive" });
        return;
    }
    const parentPotentialRiskGoal = goals.find(g => g.id === currentPotentialRisk.goalId);
     if (!parentPotentialRiskGoal) {
        toast({ title: "Kesalahan", description: "Tidak dapat menambah penyebab. Sasaran induk untuk potensi risiko tidak ditemukan.", variant: "destructive" });
        return;
    }

    const newCause: RiskCause = {
      id: `rcause_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      potentialRiskId: currentPotentialRisk.id,
      description: data.causeDescription,
      source: data.causeSource,
      keyRiskIndicator: null,
      riskTolerance: null,
      likelihood: null,
      impact: null,
      createdAt: new Date().toISOString(),
      sequenceNumber: riskCauses.length + 1,
    };
    const updatedCauses = [...riskCauses, newCause].sort((a,b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0));
    setRiskCauses(updatedCauses);
    localStorage.setItem(getRiskCausesStorageKey(parentPotentialRiskGoal.uprId, parentPotentialRiskGoal.period, currentPotentialRisk.id), JSON.stringify(updatedCauses));
    toast({ title: "Penyebab Risiko Ditambahkan", description: `Penyebab "${newCause.description}" (PC${newCause.sequenceNumber}) ditambahkan.` });
    resetRiskCauseForm();
  };

  const handleDeleteRiskCause = (causeId: string) => {
    if (!currentPotentialRisk || !currentUprId || !currentPeriod) return;
    const parentPotentialRiskGoal = goals.find(g => g.id === currentPotentialRisk.goalId);
    if (!parentPotentialRiskGoal) return;

    const causeToDelete = riskCauses.find(c => c.id === causeId);
    if (!causeToDelete) return;
    let updatedCauses = riskCauses.filter(c => c.id !== causeId);
    updatedCauses = updatedCauses.map((cause, index) => ({ ...cause, sequenceNumber: index + 1 }));
    setRiskCauses(updatedCauses.sort((a,b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0))); 
    localStorage.setItem(getRiskCausesStorageKey(parentPotentialRiskGoal.uprId, parentPotentialRiskGoal.period, currentPotentialRisk.id), JSON.stringify(updatedCauses));
    toast({ title: "Penyebab Risiko Dihapus", description: `Penyebab "${causeToDelete.description}" (PC${causeToDelete.sequenceNumber}) dihapus.`, variant: "destructive" });
  };

  const handleAISuggestionsReady = (suggestions: AISuggestedCause[]) => {
    if (suggestions.length === 0) {
      toast({ title: "Tidak Ada Saran Penyebab", description: "AI tidak menghasilkan saran penyebab risiko untuk konteks ini.", variant: "default" });
      setIsBrainstormCausesContextModalOpen(false);
      return;
    }
    setAISuggestedCauses(suggestions);
    setIsBrainstormCausesContextModalOpen(false);
    setIsBrainstormCausesSuggestionsModalOpen(true);
  };

  const handleSaveAISelectedCauses = (newCauses: RiskCause[]) => {
    if (!currentPotentialRisk || !currentUprId || !currentPeriod) return;
    const parentPotentialRiskGoal = goals.find(g => g.id === currentPotentialRisk.goalId);
    if (!parentPotentialRiskGoal) return;

    const updatedCauses = [...riskCauses, ...newCauses].sort((a,b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0));
    const resequencedCauses = updatedCauses.map((cause, index) => ({ ...cause, sequenceNumber: index + 1 }));
    
    setRiskCauses(resequencedCauses);
    localStorage.setItem(getRiskCausesStorageKey(parentPotentialRiskGoal.uprId, parentPotentialRiskGoal.period, currentPotentialRisk.id), JSON.stringify(resequencedCauses));
    toast({ title: "Saran Penyebab Disimpan", description: `${newCauses.length} penyebab risiko baru dari AI telah ditambahkan.` });
    setIsBrainstormCausesSuggestionsModalOpen(false);
  };

  const defaultBackPath = searchParams.get('from') || `/all-risks`;


  if (pageIsLoading || !currentUprId || !currentPeriod) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat data potensi risiko...</p>
      </div>
    );
  }
  
  const parentGoalForDisplay = goals.find(g => g.id === (currentPotentialRisk ? currentPotentialRisk.goalId : (isCreatingNew && goals.length > 0 ? goals[0].id : '')));
  const parentGoalCode = parentGoalForDisplay?.code || 'S?';
  const potentialRiskCode = parentGoalCode && currentPotentialRisk ? `${parentGoalCode}.PR${currentPotentialRisk.sequenceNumber}` : (isCreatingNew ? "PR Baru" : "PR...");


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
              <Button type="submit" disabled={isSaving || (goals.length === 0 && isCreatingNew)}>
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
                <div>
                    <CardTitle>Penyebab Risiko untuk: ({potentialRiskCode})</CardTitle>
                    <CardDescription className="mt-1">{currentPotentialRisk.description}</CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setIsBrainstormCausesContextModalOpen(true)}
                        disabled={!currentPotentialRisk || !parentGoalForDisplay}
                        className="text-xs"
                    >
                        <Wand2 className="mr-2 h-3 w-3" /> Brainstorm (AI)
                    </Button>
                    <div className="flex items-center space-x-1">
                        <Button 
                            variant={causeViewMode === 'table' ? 'default' : 'outline'} 
                            size="icon-sm" 
                            onClick={() => setCauseViewMode('table')}
                            aria-label="Tampilan Tabel Penyebab"
                        >
                            <List className="h-4 w-4" />
                        </Button>
                        <Button 
                            variant={causeViewMode === 'card' ? 'default' : 'outline'} 
                            size="icon-sm" 
                            onClick={() => setCauseViewMode('card')}
                            aria-label="Tampilan Kartu Penyebab"
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
                <Button type="submit" disabled={isAddingCause} size="sm">
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
                          <TableHead className="w-[80px]">No.</TableHead>
                          <TableHead className="w-[35%] min-w-[200px]">Deskripsi</TableHead>
                          <TableHead className="min-w-[100px]">Sumber</TableHead>
                          <TableHead className="min-w-[100px]">KRI</TableHead>
                          <TableHead className="min-w-[100px]">Toleransi</TableHead>
                          <TableHead className="min-w-[150px]">Tingkat Risiko</TableHead>
                          <TableHead className="text-right min-w-[100px]">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {riskCauses.map(cause => {
                            const {level: causeRiskLevelText, score: causeRiskScore} = getCalculatedRiskLevel(cause.likelihood, cause.impact);
                            const returnPath = `/all-risks/manage/${currentPotentialRisk.id}`;
                            return (
                              <TableRow key={cause.id}>
                                <TableCell>PC{cause.sequenceNumber}</TableCell>
                                <TableCell className="text-xs max-w-xs truncate" title={cause.description}>{cause.description}</TableCell>
                                <TableCell><Badge variant="outline" className="text-xs">{cause.source}</Badge></TableCell>
                                <TableCell className="text-xs max-w-[100px] truncate" title={cause.keyRiskIndicator || ''}>{cause.keyRiskIndicator || '-'}</TableCell>
                                <TableCell className="text-xs max-w-[100px] truncate" title={cause.riskTolerance || ''}>{cause.riskTolerance || '-'}</TableCell>
                                <TableCell>
                                   <Badge className={`${getRiskLevelColor(causeRiskLevelText)} text-xs`}>
                                      {causeRiskLevelText === 'N/A' ? 'N/A' : `${causeRiskLevelText} (${causeRiskScore})`}
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
                                        onClick={() => handleDeleteRiskCause(cause.id)}
                                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
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
                        onDelete={handleDeleteRiskCause}
                        returnPath={`/all-risks/manage/${currentPotentialRisk.id}`}
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
        <BrainstormCausesSuggestionsModal
            isOpen={isBrainstormCausesSuggestionsModalOpen}
            onOpenChange={setIsBrainstormCausesSuggestionsModalOpen}
            suggestions={aiSuggestedCauses}
            potentialRiskId={currentPotentialRisk.id}
            existingCausesCount={riskCauses.length}
            onSaveSelectedCauses={handleSaveAISelectedCauses}
        />
      )}
    </div>
  );
}

