
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { PotentialRisk, Goal, RiskCause, LikelihoodLevelDesc, ImpactLevelDesc, RiskCategory, ControlMeasure, ControlMeasureTypeKey, CalculatedRiskLevelCategory } from '@/lib/types';
import { LIKELIHOOD_LEVELS_DESC, IMPACT_LEVELS_DESC, LIKELIHOOD_LEVELS_DESC_MAP, IMPACT_LEVELS_DESC_MAP, getControlTypeName, CONTROL_MEASURE_TYPE_KEYS } from '@/lib/types';
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Loader2, Save, Info, BarChartHorizontalBig, Wand2, PlusCircle, Trash2, Edit, Settings2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LikelihoodCriteriaModal } from '@/components/risks/likelihood-criteria-modal';
import { ImpactCriteriaModal } from '@/components/risks/impact-criteria-modal';
import { RiskMatrixModal } from '@/components/risks/risk-matrix-modal';
import { Badge } from '@/components/ui/badge';
import { suggestRiskParametersAction, suggestKriToleranceAction } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { KriToleranceAISuggestionsModal } from '@/components/risks/kri-tolerance-ai-suggestions-modal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format, parseISO, isValid as isValidDate } from 'date-fns';
import { useAuth } from '@/contexts/auth-context';
import { useAppStore } from '@/stores/useAppStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"; // Added DropdownMenu imports

const riskCauseAnalysisSchema = z.object({
  keyRiskIndicator: z.string().nullable(),
  riskTolerance: z.string().nullable(),
  likelihood: z.custom<LikelihoodLevelDesc>((val): val is LikelihoodLevelDesc => LIKELIHOOD_LEVELS_DESC.includes(val as LikelihoodLevelDesc)).nullable(),
  impact: z.custom<ImpactLevelDesc>((val): val is ImpactLevelDesc => IMPACT_LEVELS_DESC.includes(val as ImpactLevelDesc)).nullable(),
});
type RiskCauseAnalysisFormData = z.infer<typeof riskCauseAnalysisSchema>;


export const getCalculatedRiskLevel = (likelihood: LikelihoodLevelDesc | null, impact: ImpactLevelDesc | null): { level: CalculatedRiskLevelCategory | 'N/A'; score: number | null } => {
  if (!likelihood || !impact) return { level: 'N/A', score: null };
  
  const likelihoodValue = LIKELIHOOD_LEVELS_DESC_MAP[likelihood];
  const impactValue = IMPACT_LEVELS_DESC_MAP[impact];

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

export const getControlGuidance = (riskLevel: CalculatedRiskLevelCategory | 'N/A'): string => {
  switch (riskLevel) {
    case 'Sangat Tinggi':
    case 'Tinggi':
      return "Disarankan: Preventif (Prv), Mitigasi (RM), dan Korektif (Crr).";
    case 'Sedang':
      return "Disarankan: Preventif (Prv) dan Mitigasi (RM).";
    case 'Rendah':
    case 'Sangat Rendah':
      return "Disarankan: Preventif (Prv).";
    default:
      return "Tentukan tingkat risiko penyebab terlebih dahulu untuk mendapatkan panduan pengendalian.";
  }
};

export default function RiskCauseAnalysisPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const riskCauseId = params.riskCauseId as string;
  const { currentUser, appUser, loading: authLoading, isProfileComplete } = useAuth(); 
  
  const store = useAppStore();
  const { 
    getGoalById: getGoalByIdFromStore,
    getPotentialRiskById: getPotentialRiskByIdFromStore,
    getRiskCauseById: getRiskCauseByIdFromStore,
    updateRiskCause: updateRiskCauseInStore,
    controlMeasures,
    fetchControlMeasures,
    controlMeasuresLoading,
    deleteControlMeasure: deleteControlMeasureFromStore,
  } = store;

  const [pageIsLoading, setPageIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [currentRiskCause, setCurrentRiskCause] = useState<RiskCause | null>(null);
  const [parentPotentialRisk, setParentPotentialRisk] = useState<PotentialRisk | null>(null);
  const [grandParentGoal, setGrandParentGoal] = useState<Goal | null>(null);
  
  const [controlToDelete, setControlToDelete] = useState<ControlMeasure | null>(null);
  const [isDeleteControlAlertOpen, setIsDeleteControlAlertOpen] = useState(false);
  
  const [isLikelihoodCriteriaModalOpen, setIsLikelihoodCriteriaModalOpen] = useState(false);
  const [isImpactCriteriaModalOpen, setIsImpactCriteriaModalOpen] = useState(false);
  const [isRiskMatrixModalOpen, setIsRiskMatrixModalOpen] = useState(false);

  const [aiLikelihoodImpactSuggestion, setAiLikelihoodImpactSuggestion] = useState<{
    likelihood: LikelihoodLevelDesc | null;
    likelihoodJustification: string;
    impact: ImpactLevelDesc | null;
    impactJustification: string;
  } | null>(null);
  const [isAILikelihoodImpactLoading, setIsAILikelihoodImpactLoading] = useState(false);

  const [isKriToleranceSuggestionsModalOpen, setIsKriToleranceSuggestionsModalOpen] = useState(false);
  const [aiKriToleranceSuggestions, setAiKriToleranceSuggestions] = useState<any | null>(null); 
  const [isAIKriToleranceLoading, setIsAIKriToleranceLoading] = useState(false);

  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue, 
    getValues,
    formState: { errors },
  } = useForm<RiskCauseAnalysisFormData>({
    resolver: zodResolver(riskCauseAnalysisSchema),
    defaultValues: {
        keyRiskIndicator: null,
        riskTolerance: null,
        likelihood: null,
        impact: null,
    }
  });

  const watchedLikelihood = watch("likelihood");
  const watchedImpact = watch("impact");
  const { level: calculatedRiskLevelText, score: calculatedRiskScore } = getCalculatedRiskLevel(watchedLikelihood, watchedImpact);

  const currentUserId = useMemo(() => currentUser?.uid || null, [currentUser]);
  const currentPeriod = useMemo(() => appUser?.activePeriod || null, [appUser]);
  const uprDisplayName = useMemo(() => appUser?.displayName || 'UPR...', [appUser]);
  const riskAppetiteFromUser = useMemo(() => appUser?.riskAppetite ?? 5, [appUser]);

  const returnPathForButton = useMemo(() => {
    const fromQuery = searchParams.get('from');
    if (fromQuery) return fromQuery;
    if (parentPotentialRisk?.id) return `/all-risks/manage/${parentPotentialRisk.id}`; 
    return '/risk-analysis'; 
  }, [searchParams, parentPotentialRisk?.id]);

  const fetchData = useCallback(async () => {
    if (authLoading || !isProfileComplete || !currentUserId || !currentPeriod || !riskCauseId) {
      console.log("[RiskCauseAnalysisPage] fetchData SKIPPED: Pre-conditions not met.", { authLoading, isProfileComplete, currentUserId, currentPeriod, riskCauseId });
      setPageIsLoading(authLoading || !isProfileComplete);
      if (!authLoading && currentUser && !isProfileComplete) router.push('/settings');
      else if (!authLoading && !currentUser) router.push('/login');
      return;
    }
    
    console.log("[RiskCauseAnalysisPage] fetchData START for RiskCauseID:", riskCauseId, "UserID:", currentUserId, "Period:", currentPeriod);
    setPageIsLoading(true);
    setCurrentRiskCause(null);
    setParentPotentialRisk(null);
    setGrandParentGoal(null);
    // setDisplayedControls([]); // Dihapus, akan diambil dari store
    reset({ keyRiskIndicator: null, riskTolerance: null, likelihood: null, impact: null });
    setAiLikelihoodImpactSuggestion(null);
    setAiKriToleranceSuggestions(null);

    try {
      const cause = await getRiskCauseByIdFromStore(riskCauseId, currentUserId, currentPeriod);
      console.log("[RiskCauseAnalysisPage] Fetched RiskCause:", cause);
      if (!cause) {
        throw new Error(`Penyebab risiko dengan ID ${riskCauseId} tidak ditemukan atau tidak cocok dengan konteks pengguna/periode.`);
      }
      setCurrentRiskCause(cause);

      const pRisk = await getPotentialRiskByIdFromStore(cause.potentialRiskId, currentUserId, currentPeriod);
      console.log("[RiskCauseAnalysisPage] Fetched PotentialRisk:", pRisk);
      if (!pRisk) {
        throw new Error(`Potensi risiko induk (ID: ${cause.potentialRiskId}) tidak ditemukan atau tidak cocok konteks.`);
      }
      setParentPotentialRisk(pRisk);

      const goal = await getGoalByIdFromStore(pRisk.goalId, currentUserId, currentPeriod);
      console.log("[RiskCauseAnalysisPage] Fetched Goal:", goal);
      if (!goal) {
        throw new Error(`Sasaran induk (ID: ${pRisk.goalId}) tidak ditemukan atau tidak cocok konteks.`);
      }
      setGrandParentGoal(goal);
      
      console.log("[RiskCauseAnalysisPage] All parent data fetched. Fetching controls for cause:", cause.id);
      if (cause) { // Pastikan cause ada sebelum fetch controls
          await fetchControlMeasures(currentUserId, currentPeriod, cause.id); // Ambil controls dari store
      }
      console.log("[RiskCauseAnalysisPage] Data fetching for core entities complete.");
      
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      console.error("[RiskCauseAnalysisPage] Error in fetchData:", errorMessage);
      toast({ title: "Kesalahan Memuat Data", description: errorMessage, variant: "destructive" });
      router.push(returnPathForButton); 
    } finally {
      console.log("[RiskCauseAnalysisPage] fetchData FINISHED, pageIsLoading set to false.");
      setPageIsLoading(false);
    }
  }, [
      riskCauseId, currentUserId, currentPeriod, authLoading, isProfileComplete, 
      reset, router, toast, returnPathForButton, 
      getGoalByIdFromStore, getPotentialRiskByIdFromStore, getRiskCauseByIdFromStore, fetchControlMeasures, currentUser // Ditambahkan currentUser
    ]);

  useEffect(() => {
    if (currentUserId && currentPeriod && riskCauseId && !authLoading && isProfileComplete) { 
        fetchData();
    } else if (!authLoading && currentUser && !isProfileComplete && !pageIsLoading) {
        router.push('/settings'); // Pengguna ada, tapi profil belum lengkap
    } else if (!authLoading && !currentUser && !pageIsLoading) {
        router.push('/login'); // Pengguna tidak ada
    }
  }, [fetchData, currentUserId, currentPeriod, riskCauseId, authLoading, isProfileComplete, currentUser, pageIsLoading, router]);


  useEffect(() => {
    if (currentRiskCause) {
      console.log("[RiskCauseAnalysisPage] currentRiskCause changed, resetting form with:", JSON.stringify({
        kri: currentRiskCause.keyRiskIndicator,
        tolerance: currentRiskCause.riskTolerance,
        likelihood: currentRiskCause.likelihood,
        impact: currentRiskCause.impact,
      }));
      reset({
        keyRiskIndicator: currentRiskCause.keyRiskIndicator || "",
        riskTolerance: currentRiskCause.riskTolerance || "",
        likelihood: currentRiskCause.likelihood,
        impact: currentRiskCause.impact,
      });
      setAiLikelihoodImpactSuggestion(null); 
      setAiKriToleranceSuggestions(null);
    }
  }, [currentRiskCause, reset]);
  
  const displayedControls = useMemo(() => {
    if (!currentRiskCause) return [];
    return controlMeasures.filter(cm => cm.riskCauseId === currentRiskCause.id && cm.userId === currentUserId && cm.period === currentPeriod)
                         .sort((a, b) => 
                            (CONTROL_MEASURE_TYPE_KEYS.indexOf(a.controlType) - CONTROL_MEASURE_TYPE_KEYS.indexOf(b.controlType)) || 
                            (a.sequenceNumber - b.sequenceNumber)
                          );
  }, [controlMeasures, currentRiskCause, currentUserId, currentPeriod]);


  const onSubmitAnalysis: SubmitHandler<RiskCauseAnalysisFormData> = async (data) => {
    if (!currentRiskCause || !currentUserId || !currentPeriod) {
      toast({ title: "Kesalahan", description: "Konteks data tidak lengkap untuk menyimpan analisis penyebab.", variant: "destructive" });
      return;
    }
    setIsSaving(true);

    const updatedRiskCauseData: Partial<Omit<RiskCause, 'id' | 'potentialRiskId' | 'goalId' | 'userId' | 'period' | 'createdAt' | 'sequenceNumber' | 'description' | 'source' | 'analysisUpdatedAt'>> = {
      keyRiskIndicator: data.keyRiskIndicator || null,
      riskTolerance: data.riskTolerance || null,
      likelihood: data.likelihood,
      impact: data.impact,
    };
    
    try {
      const updatedCause = await updateRiskCauseInStore(currentRiskCause.id, updatedRiskCauseData);
      if (updatedCause) {
        setCurrentRiskCause(updatedCause); 
        toast({ title: "Sukses", description: `Analisis untuk penyebab risiko ${riskCauseCodeDisplay} telah disimpan.` });
      } else {
        throw new Error("Gagal memperbarui penyebab risiko melalui store.");
      }
    } catch (error:any) {
      const errorMessage = error.message || String(error);
      console.error("[RiskCauseAnalysisPage] Error saving risk cause analysis:", errorMessage);
      toast({ title: "Gagal Menyimpan", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGetAILikelihoodImpactSuggestion = async () => {
    if (!currentRiskCause || !parentPotentialRisk || !grandParentGoal || !currentUser) {
        toast({ title: "Konteks Tidak Lengkap", description: "Data induk tidak tersedia untuk saran AI.", variant: "warning" });
        return;
    }
    setIsAILikelihoodImpactLoading(true);
    setAiLikelihoodImpactSuggestion(null);
    try {
      const result = await suggestRiskParametersAction({
        potentialRiskDescription: parentPotentialRisk.description,
        riskCategory: parentPotentialRisk.category,
        goalDescription: grandParentGoal.description,
        riskCauseDescription: currentRiskCause.description,
      });

      if (result.success && result.data) {
        const currentFormValues = getValues();
        const newAiSuggestionData = {
          likelihood: result.data.suggestedLikelihood,
          likelihoodJustification: result.data.likelihoodJustification,
          impact: result.data.suggestedImpact,
          impactJustification: result.data.impactJustification,
        };
        setAiLikelihoodImpactSuggestion(newAiSuggestionData);

        if (result.data.suggestedLikelihood && result.data.suggestedLikelihood !== currentFormValues.likelihood) {
          setValue('likelihood', result.data.suggestedLikelihood, {shouldValidate: true});
        }
        if (result.data.suggestedImpact && result.data.suggestedImpact !== currentFormValues.impact) {
          setValue('impact', result.data.suggestedImpact, {shouldValidate: true});
        }
      } else {
        toast({ title: "Kesalahan Saran AI (L/I)", description: result.error || "Gagal mendapatkan saran dari AI.", variant: "destructive" });
      }
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      toast({ title: "Kesalahan AI", description: errorMessage, variant: "destructive" });
    } finally {
      setIsAILikelihoodImpactLoading(false);
    }
  };

  const handleGetAIKriToleranceSuggestion = async () => {
    if (!currentRiskCause || !parentPotentialRisk || !grandParentGoal || !currentUser) {
      toast({ title: "Konteks Tidak Lengkap", description: "Data induk tidak tersedia untuk saran KRI/Toleransi AI.", variant: "warning" });
      return;
    }
    setIsAIKriToleranceLoading(true);
    setAiKriToleranceSuggestions(null);
    try {
      const result = await suggestKriToleranceAction({
        riskCauseDescription: currentRiskCause.description,
        potentialRiskDescription: parentPotentialRisk.description,
        riskCategory: parentPotentialRisk.category,
        goalDescription: grandParentGoal.description,
      });
      if (result.success && result.data) {
        setAiKriToleranceSuggestions(result.data);
        setIsKriToleranceSuggestionsModalOpen(true);
      } else {
        toast({ title: "Kesalahan Saran AI (KRI/Toleransi)", description: result.error || "Gagal mendapatkan saran dari AI.", variant: "destructive" });
      }
    } catch (error: any) {
      const errorMessage = error.message ? String(error.message) : String(error);
      toast({ title: "Kesalahan AI", description: errorMessage, variant: "destructive" });
    } finally {
      setIsAIKriToleranceLoading(false);
    }
  };

  const handleApplyKRI = (kri: string) => setValue('keyRiskIndicator', kri, { shouldValidate: true });
  const handleApplyTolerance = (tolerance: string) => setValue('riskTolerance', tolerance, { shouldValidate: true });
  const handleApplyBothKriTolerance = (kri: string, tolerance: string) => {
    setValue('keyRiskIndicator', kri, { shouldValidate: true });
    setValue('riskTolerance', tolerance, { shouldValidate: true });
  };

  const confirmDeleteControlMeasure = async () => {
    if (!controlToDelete || !controlToDelete.id || !currentUserId || !currentPeriod) {
        toast({ title: "Gagal Menghapus", description: "Data tidak lengkap untuk menghapus pengendalian.", variant: "destructive"});
        setIsDeleteControlAlertOpen(false);
        setControlToDelete(null);
        return;
    }
    try {
      await deleteControlMeasureFromStore(controlToDelete.id, currentUserId, currentPeriod); // Call store action
      toast({ title: "Pengendalian Dihapus", description: `Pengendalian "${controlToDelete.description}" telah dihapus.`, variant: "destructive" });
    } catch (error: any) {
        const errorMessage = error.message || String(error);
        console.error("[RiskCauseAnalysisPage] Error deleting control measure:", errorMessage);
        toast({ title: "Gagal Menghapus Pengendalian", description: errorMessage, variant: "destructive" });
    } finally {
        setIsDeleteControlAlertOpen(false);
        setControlToDelete(null);
    }
  };
  
  const riskCauseCodeDisplay = useMemo(() => {
    if (!grandParentGoal || !parentPotentialRisk || !currentRiskCause) return 'PC...';
    const goalCode = `${grandParentGoal.code || 'S?'}`;
    const potentialRiskCode = `${goalCode}.PR${parentPotentialRisk.sequenceNumber || '?'}`;
    return `${potentialRiskCode}.PC${currentRiskCause.sequenceNumber || '?'}`;
  }, [grandParentGoal, parentPotentialRisk, currentRiskCause]);

  const pathname = useSearchParams().get('from') || `/risk-analysis`; // Use searchParams hook


  if (pageIsLoading || authLoading || !currentUser || !currentUserId || !currentPeriod || !appUser || (appUser && !isProfileComplete && pathname !== '/settings')) { 
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat data analisis penyebab risiko...</p>
         <Button onClick={() => router.push(returnPathForButton)} variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
        </Button>
      </div>
    );
  }
  
  if (!currentRiskCause || !parentPotentialRisk || !grandParentGoal) {
     return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Info className="h-12 w-12 text-destructive mb-4" />
        <p className="text-xl text-muted-foreground">Gagal memuat data lengkap untuk analisis penyebab risiko.</p>
         <Button onClick={() => router.push(returnPathForButton)} variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
        </Button>
      </div>
    );
  }
  
  const goalCodeForDisplay = `${grandParentGoal.code || 'S?'}`;
  const potentialRiskCodeForDisplay = `${goalCodeForDisplay}.PR${parentPotentialRisk.sequenceNumber || '?'}`;
  const controlGuidanceText = getControlGuidance(calculatedRiskLevelText);
  
  return (
    <div className="space-y-6">
      <PageHeader
        title={`Analisis Detail Penyebab Risiko: ${riskCauseCodeDisplay}`}
        description={`UPR: ${uprDisplayName}, Periode: ${currentPeriod}. Untuk penyebab: "${currentRiskCause.description}"`}
        actions={
          <Button 
            onClick={() => router.push(returnPathForButton)} 
            variant="outline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Button>
        }
      />

      <Card className="mb-6">
        <CardHeader>
            <CardTitle>Konteks Risiko</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
            <p><strong>Sasaran Terkait ({goalCodeForDisplay}):</strong> {grandParentGoal.name}</p>
            <p><strong>Potensi Risiko ({potentialRiskCodeForDisplay}):</strong> {parentPotentialRisk.description}</p>
            <div><strong>Kategori Risiko:</strong> <Badge variant="secondary">{parentPotentialRisk.category || 'N/A'}</Badge></div>
            <p><strong>Pemilik Potensi Risiko:</strong> {parentPotentialRisk.owner || 'N/A'}</p>
            <p><strong>Deskripsi Penyebab (PC{currentRiskCause.sequenceNumber || '?' }):</strong> {currentRiskCause.description}</p>
            <div><strong>Sumber Penyebab:</strong> <Badge variant="outline">{currentRiskCause.source}</Badge></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Formulir Analisis Penyebab Risiko</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmitAnalysis)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6"> {/* Kolom Kiri */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="keyRiskIndicator">Key Risk Indicator (KRI)</Label>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={handleGetAIKriToleranceSuggestion} disabled={isAIKriToleranceLoading || !currentUser} aria-label="Dapatkan Saran AI untuk KRI" type="button">
                      {isAIKriToleranceLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Textarea
                    id="keyRiskIndicator"
                    {...register("keyRiskIndicator")}
                    rows={3}
                    placeholder="Contoh: Jumlah keluhan pelanggan melebihi X per bulan, Persentase downtime sistem > Y%"
                    disabled={isSaving}
                  />
                  {errors.keyRiskIndicator && <p className="text-xs text-destructive mt-1">{errors.keyRiskIndicator.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="riskTolerance">Toleransi Risiko</Label>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={handleGetAIKriToleranceSuggestion} disabled={isAIKriToleranceLoading || !currentUser} aria-label="Dapatkan Saran AI untuk Toleransi Risiko" type="button">
                      {isAIKriToleranceLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Textarea
                    id="riskTolerance"
                    {...register("riskTolerance")}
                    rows={3}
                    placeholder="Contoh: Maksimal 5 keluhan pelanggan per bulan, Downtime sistem tidak boleh melebihi 2 jam per kuartal"
                    disabled={isSaving}
                  />
                  {errors.riskTolerance && <p className="text-xs text-destructive mt-1">{errors.riskTolerance.message}</p>}
                </div>
              </div>

              <div className="space-y-6"> {/* Kolom Kanan */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="likelihood">Kemungkinan</Label>
                    <div className="flex items-center space-x-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={handleGetAILikelihoodImpactSuggestion} disabled={isAILikelihoodImpactLoading || !currentUser} aria-label="Dapatkan Saran AI untuk Kemungkinan" type="button">
                        {isAILikelihoodImpactLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => setIsLikelihoodCriteriaModalOpen(true)} type="button" aria-label="Lihat Kriteria Kemungkinan"><Info className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <Controller
                    name="likelihood"
                    control={control}
                    render={({ field }) => (
                      <Select 
                        value={field.value || ""} 
                        onValueChange={(value) => field.onChange(value as LikelihoodLevelDesc)} 
                        disabled={isSaving}
                      >
                        <SelectTrigger id="likelihood" className={errors.likelihood ? "border-destructive" : ""}>
                          <SelectValue placeholder="Pilih kemungkinan" />
                        </SelectTrigger>
                        <SelectContent>
                          {LIKELIHOOD_LEVELS_DESC.map(level => (<SelectItem key={`lh-${level}`} value={level}>{level}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.likelihood && <p className="text-xs text-destructive mt-1">{errors.likelihood.message}</p>}
                  {aiLikelihoodImpactSuggestion?.likelihoodJustification && (
                    <Alert variant="default" className="mt-2 text-xs">
                      <Wand2 className="h-4 w-4" />
                      <AlertTitle className="font-semibold">Saran AI (Kemungkinan): {aiLikelihoodImpactSuggestion.likelihood || "Tidak ada"}</AlertTitle>
                      <AlertDescription>{aiLikelihoodImpactSuggestion.likelihoodJustification}</AlertDescription>
                    </Alert>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="impact">Dampak</Label>
                    <div className="flex items-center space-x-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={handleGetAILikelihoodImpactSuggestion} disabled={isAILikelihoodImpactLoading || !currentUser} aria-label="Dapatkan Saran AI untuk Dampak" type="button">
                        {isAILikelihoodImpactLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => setIsImpactCriteriaModalOpen(true)} type="button" aria-label="Lihat Kriteria Dampak"><Info className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <Controller
                    name="impact"
                    control={control}
                    render={({ field }) => ( 
                      <Select 
                        value={field.value || ""} 
                        onValueChange={(value) => field.onChange(value as ImpactLevelDesc)} 
                        disabled={isSaving}
                      >
                        <SelectTrigger id="impact" className={errors.impact ? "border-destructive" : ""}>
                          <SelectValue placeholder="Pilih dampak" />
                        </SelectTrigger>
                        <SelectContent>
                          {IMPACT_LEVELS_DESC.map(level => (<SelectItem key={`im-${level}`} value={level}>{level}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.impact && <p className="text-xs text-destructive mt-1">{errors.impact.message}</p>}
                  {aiLikelihoodImpactSuggestion?.impactJustification && (
                    <Alert variant="default" className="mt-2 text-xs">
                      <Wand2 className="h-4 w-4" />
                      <AlertTitle className="font-semibold">Saran AI (Dampak): {aiLikelihoodImpactSuggestion.impact || "Tidak ada"}</AlertTitle>
                      <AlertDescription>{aiLikelihoodImpactSuggestion.impactJustification}</AlertDescription>
                    </Alert>
                  )}
                </div>

                <div className="space-y-2 rounded-md border p-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Tingkat Risiko (Penyebab)</Label>
                    <Badge className={`${getRiskLevelColor(calculatedRiskLevelText)} text-xs`}>
                      {calculatedRiskLevelText === 'N/A' ? 'N/A' : `${calculatedRiskLevelText} (${calculatedRiskScore || 'N/A'})`}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Dihitung berdasarkan Kemungkinan dan Dampak yang dipilih untuk penyebab ini.</p>
                </div>
                
                <div className="pt-2">
                  <Button variant="outline" size="sm" onClick={() => setIsRiskMatrixModalOpen(true)} type="button" className="w-full">
                    <BarChartHorizontalBig className="mr-2 h-4 w-4" /> Lihat Matriks Profil Risiko
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end mt-8">
              <Button type="submit" disabled={isSaving || !currentUser}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Simpan Analisis Penyebab
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Rencana Pengendalian Risiko</CardTitle>
            {calculatedRiskScore !== null && riskAppetiteFromUser !== null && calculatedRiskScore <= riskAppetiteFromUser && (
            <Alert variant="default" className="mt-2 text-sm bg-sky-50 dark:bg-sky-900/30 border-sky-200 dark:border-sky-700">
              <Info className="h-4 w-4 text-sky-700 dark:text-sky-300" />
              <AlertTitle className="font-semibold text-sky-800 dark:text-sky-200">Informasi Selera Risiko</AlertTitle>
              <AlertDescription className="text-sky-700 dark:text-sky-300">
                Berdasarkan Selera Risiko Anda (batas: {riskAppetiteFromUser}), penyebab risiko ini dengan skor tingkat risiko {calculatedRiskScore} mungkin tidak memerlukan tindakan pengendalian prioritas tinggi. Pertimbangkan efisiensi sumber daya.
              </AlertDescription>
            </Alert>
          )}
          <CardDescription className="mt-2">
            {controlGuidanceText}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
             <Link 
                href={currentRiskCause && parentPotentialRisk && grandParentGoal && currentUserId && currentPeriod ? `/control-measure-manage/new?riskCauseId=${currentRiskCause.id}&potentialRiskId=${parentPotentialRisk.id}&goalId=${grandParentGoal.id}` : '#'}
                passHref
              >
                <Button 
                    disabled={!currentRiskCause || !parentPotentialRisk || !grandParentGoal || !currentUser || controlMeasuresLoading || pageIsLoading}
                >
                    <PlusCircle className="mr-2 h-4 w-4" /> Tambah Pengendalian Baru
                </Button>
              </Link>

            {(controlMeasuresLoading && displayedControls.length === 0 && currentRiskCause /*Hanya tampilkan loading jika penyebab ada*/) && <div className="flex items-center space-x-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /><span>Memuat tindakan pengendalian...</span></div>}
            {!controlMeasuresLoading && displayedControls.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Belum ada rencana pengendalian untuk penyebab risiko ini.</p>
            ) : !controlMeasuresLoading && displayedControls.length > 0 && (
                <div className="border rounded-md overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="min-w-[100px]">Kode</TableHead>
                                <TableHead className="min-w-[100px]">Tipe</TableHead>
                                <TableHead className="min-w-[200px]">Deskripsi Pengendalian</TableHead>
                                <TableHead className="min-w-[150px]">KCI</TableHead>
                                <TableHead className="min-w-[150px]">Target</TableHead>
                                <TableHead className="min-w-[150px]">Penanggung Jawab</TableHead>
                                <TableHead className="min-w-[120px]">Waktu</TableHead>
                                <TableHead className="min-w-[120px] text-right">Anggaran (Rp)</TableHead>
                                <TableHead className="text-right min-w-[100px]">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {displayedControls.map(controlItem => { 
                                const controlCode = `${riskCauseCodeDisplay}.${controlItem.controlType}.${controlItem.sequenceNumber}`;
                                const controlReturnPath = `/risk-cause-analysis/${riskCauseId}?from=${encodeURIComponent(returnPathForButton)}`; // Path kembali dari halaman edit kontrol
                                const editPath = `/control-measure-manage/${controlItem.id}?from=${encodeURIComponent(controlReturnPath)}`;
                                
                                return (
                                <TableRow key={controlItem.id}>
                                    <TableCell className="text-xs font-mono">{controlCode}</TableCell>
                                    <TableCell className="text-xs"><Badge variant="outline">{getControlTypeName(controlItem.controlType)} ({controlItem.controlType})</Badge></TableCell>
                                    <TableCell className="text-xs max-w-xs truncate" title={controlItem.description}>{controlItem.description}</TableCell>
                                    <TableCell className="text-xs max-w-[150px] truncate" title={controlItem.keyControlIndicator || ''}>{controlItem.keyControlIndicator || '-'}</TableCell>
                                    <TableCell className="text-xs max-w-[150px] truncate" title={controlItem.target || ''}>{controlItem.target || '-'}</TableCell>
                                    <TableCell className="text-xs max-w-[150px] truncate" title={controlItem.responsiblePerson || ''}>{controlItem.responsiblePerson || '-'}</TableCell>
                                    <TableCell className="text-xs">{controlItem.deadline && isValidDate(parseISO(controlItem.deadline)) ? format(parseISO(controlItem.deadline), "dd/MM/yyyy") : '-'}</TableCell>
                                    <TableCell className="text-xs text-right">{controlItem.budget ? controlItem.budget.toLocaleString('id-ID') : '-'}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={!currentUser}>
                                                    <Settings2 className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem asChild>
                                                    <Link href={editPath}>
                                                        <Edit className="mr-2 h-4 w-4" /> Edit
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => { setControlToDelete(controlItem); setIsDeleteControlAlertOpen(true);}} className="text-destructive focus:text-destructive focus:bg-destructive/10" disabled={!currentUser}>
                                                    <Trash2 className="mr-2 h-4 w-4" /> Hapus
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
            )}
        </CardContent>
      </Card>


      <LikelihoodCriteriaModal isOpen={isLikelihoodCriteriaModalOpen} onOpenChange={setIsLikelihoodCriteriaModalOpen} />
      <ImpactCriteriaModal isOpen={isImpactCriteriaModalOpen} onOpenChange={setIsImpactCriteriaModalOpen} />
      <RiskMatrixModal isOpen={isRiskMatrixModalOpen} onOpenChange={setIsRiskMatrixModalOpen} />
      
      {isKriToleranceSuggestionsModalOpen && aiKriToleranceSuggestions && currentRiskCause && (
        <KriToleranceAISuggestionsModal
          isOpen={isKriToleranceSuggestionsModalOpen}
          onOpenChange={setIsKriToleranceSuggestionsModalOpen}
          suggestions={aiKriToleranceSuggestions}
          onApplyKRI={handleApplyKRI}
          onApplyTolerance={handleApplyTolerance}
          onApplyBoth={handleApplyBothKriTolerance}
        />
      )}

       <AlertDialog open={isDeleteControlAlertOpen} onOpenChange={setIsDeleteControlAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus Pengendalian</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus pengendalian: "{controlToDelete?.description}"? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setIsDeleteControlAlertOpen(false); setControlToDelete(null); }}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteControlMeasure} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
