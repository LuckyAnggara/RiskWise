
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { PotentialRisk, Goal, RiskCause, LikelihoodLevelDesc, ImpactLevelDesc, RiskCategory, ControlMeasure, ControlMeasureTypeKey, AppUser } from '@/lib/types'; // Impor AppUser
import { LIKELIHOOD_LEVELS_DESC, IMPACT_LEVELS_DESC, LIKELIHOOD_LEVELS_DESC_MAP, IMPACT_LEVELS_DESC_MAP, CalculatedRiskLevelCategory, getControlTypeName, CONTROL_MEASURE_TYPE_KEYS } from '@/lib/types';
import { useForm, type SubmitHandler, Controller, type Control as ReactHookFormControl } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Loader2, Save, Info, BarChartHorizontalBig, Wand2, PlusCircle, Trash2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LikelihoodCriteriaModal } from '@/components/risks/likelihood-criteria-modal';
import { ImpactCriteriaModal } from '@/components/risks/impact-criteria-modal';
import { RiskMatrixModal } from '@/components/risks/risk-matrix-modal';
import { Badge } from '@/components/ui/badge';
import { suggestRiskParametersAction, suggestKriToleranceAction } from '@/app/actions'; // Impor action baru
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { AddEditControlMeasureModal } from '@/components/risks/add-edit-control-measure-modal';
import { KriToleranceAISuggestionsModal } from '@/components/risks/kri-tolerance-ai-suggestions-modal'; // Impor modal baru
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format, parseISO } from 'date-fns';
import { useAuth } from '@/contexts/auth-context';
import { getGoalById } from '@/services/goalService';
import { getPotentialRiskById } from '@/services/potentialRiskService';
import { getRiskCauseById, updateRiskCause } from '@/services/riskCauseService';
import { addControlMeasure, getControlMeasuresByRiskCauseId, deleteControlMeasure, updateControlMeasure as updateControlMeasureService } from '@/services/controlMeasureService';

// Zod schema for form data
const riskCauseAnalysisSchema = z.object({
  keyRiskIndicator: z.string().nullable(),
  riskTolerance: z.string().nullable(),
  likelihood: z.custom<LikelihoodLevelDesc>((val): val is LikelihoodLevelDesc => LIKELIHOOD_LEVELS_DESC.includes(val as LikelihoodLevelDesc)).nullable(),
  impact: z.custom<ImpactLevelDesc>((val): val is ImpactLevelDesc => IMPACT_LEVELS_DESC.includes(val as ImpactLevelDesc)).nullable(),
});
type RiskCauseAnalysisFormData = z.infer<typeof riskCauseAnalysisSchema>;

export interface ControlMeasureFormData {
  controlType: ControlMeasureTypeKey;
  description: string;
  keyControlIndicator: string | null;
  target: string | null;
  responsiblePerson: string | null;
  deadline: Date | null;
  budget: number | null;
}

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

const getControlGuidance = (riskLevel: CalculatedRiskLevelCategory | 'N/A'): string => {
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
  const { currentUser, appUser, loading: authLoading } = useAuth();
  
  const [pageIsLoading, setPageIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [currentRiskCause, setCurrentRiskCause] = useState<RiskCause | null>(null);
  const [parentPotentialRisk, setParentPotentialRisk] = useState<PotentialRisk | null>(null);
  const [grandParentGoal, setGrandParentGoal] = useState<Goal | null>(null);

  const [controls, setControls] = useState<ControlMeasure[]>([]);
  const [isControlModalOpen, setIsControlModalOpen] = useState(false);
  const [controlToEdit, setControlToEdit] = useState<ControlMeasure | null>(null);
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
  const [aiKriToleranceSuggestions, setAiKriToleranceSuggestions] = useState<SuggestKriToleranceOutput | null>(null);
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

  const returnPathForButton = useMemo(() => {
    const fromQuery = searchParams.get('from');
    if (fromQuery) return fromQuery;
    if (parentPotentialRisk) return `/all-risks/manage/${parentPotentialRisk.id}`;
    return '/risk-analysis'; 
  }, [searchParams, parentPotentialRisk]);

  const currentUserId = useMemo(() => currentUser?.uid || null, [currentUser]);
  const currentPeriod = useMemo(() => appUser?.activePeriod || null, [appUser]);
  const currentUprNameForDisplay = useMemo(() => appUser?.displayName || 'UPR...', [appUser]);

  const fetchData = useCallback(async () => {
    if (!riskCauseId || !currentUserId || !currentPeriod || !appUser || authLoading) {
      console.log("[RiskCauseAnalysisPage] fetchData: Dependencies not ready. Waiting...", { riskCauseId, currentUserId, currentPeriod, appUserReady: !!appUser, authLoading });
      setPageIsLoading(true); // Ensure loading is true if critical context is missing
      return;
    }
    console.log("[RiskCauseAnalysisPage] fetchData START. riskCauseId:", riskCauseId, "currentUserId:", currentUserId, "currentPeriod:", currentPeriod);
    
    setPageIsLoading(true);
    setCurrentRiskCause(null);
    setParentPotentialRisk(null);
    setGrandParentGoal(null);
    setControls([]);
    setAiLikelihoodImpactSuggestion(null);
    setAiKriToleranceSuggestions(null);
    reset({ keyRiskIndicator: null, riskTolerance: null, likelihood: null, impact: null });

    try {
      const cause = await getRiskCauseById(riskCauseId, currentUserId, currentPeriod);
      console.log("[RiskCauseAnalysisPage] Fetched RiskCause:", cause);
      if (cause) {
        setCurrentRiskCause(cause);
        
        const pRisk = await getPotentialRiskById(cause.potentialRiskId, currentUserId, currentPeriod);
        console.log("[RiskCauseAnalysisPage] Fetched PotentialRisk:", pRisk);
        if (pRisk) {
          setParentPotentialRisk(pRisk);
          
          const goal = await getGoalById(pRisk.goalId, currentUserId, currentPeriod);
          console.log("[RiskCauseAnalysisPage] Fetched Goal:", goal);
          if (goal) {
            setGrandParentGoal(goal);
            
            const fetchedControls = await getControlMeasuresByRiskCauseId(cause.id, currentUserId, currentPeriod);
            console.log("[RiskCauseAnalysisPage] Fetched ControlMeasures:", fetchedControls);
            setControls(fetchedControls.sort((a, b) => {
              const typeOrderKey = CONTROL_MEASURE_TYPE_KEYS;
              const typeOrder = Object.fromEntries(typeOrderKey.map((key, index) => [key, index]));
              return (typeOrder[a.controlType] - typeOrder[b.controlType]) || (a.sequenceNumber - b.sequenceNumber);
            }));
            console.log("[RiskCauseAnalysisPage] Data fetching complete and states set.");
          } else {
            throw new Error(`Sasaran induk (ID: ${pRisk.goalId}) tidak ditemukan atau tidak cocok dengan konteks pengguna/periode.`);
          }
        } else {
          throw new Error(`Potensi risiko induk (ID: ${cause.potentialRiskId}) tidak ditemukan atau tidak cocok dengan konteks pengguna/periode.`);
        }
      } else {
        throw new Error(`Penyebab risiko (ID: ${riskCauseId}) tidak ditemukan atau tidak cocok dengan konteks pengguna/periode.`);
      }
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      console.error("[RiskCauseAnalysisPage] Error loading risk cause analysis data:", errorMessage);
      toast({ title: "Kesalahan Data", description: errorMessage, variant: "destructive" });
      router.push(returnPathForButton); 
    } finally {
      console.log("[RiskCauseAnalysisPage] fetchData FINISHED.");
      setPageIsLoading(false);
    }
  }, [riskCauseId, currentUserId, currentPeriod, router, toast, reset, returnPathForButton, appUser, authLoading]);


  useEffect(() => {
    if (!authLoading && currentUser && currentUserId && currentPeriod && riskCauseId && appUser) {
        fetchData();
    } else if (!authLoading && !currentUser){
        router.push('/login');
    }
  }, [authLoading, currentUser, currentUserId, currentPeriod, riskCauseId, fetchData, router, appUser]);


  useEffect(() => {
    if (currentRiskCause) {
      reset({
        keyRiskIndicator: currentRiskCause.keyRiskIndicator || "",
        riskTolerance: currentRiskCause.riskTolerance || "",
        likelihood: currentRiskCause.likelihood,
        impact: currentRiskCause.impact,
      });
      setAiLikelihoodImpactSuggestion(null); 
      setAiKriToleranceSuggestions(null);
      console.log("[RiskCauseAnalysisPage] Form reset with currentRiskCause data:", currentRiskCause);
    }
  }, [currentRiskCause, reset]);


  const onSubmitAnalysis: SubmitHandler<RiskCauseAnalysisFormData> = async (data) => {
    if (!currentRiskCause || !parentPotentialRisk || !grandParentGoal || !currentUser || !currentUserId || !currentPeriod) {
      toast({ title: "Kesalahan", description: "Konteks data tidak lengkap untuk menyimpan analisis penyebab.", variant: "destructive" });
      return;
    }
    setIsSaving(true);

    const updatedRiskCauseData: Partial<RiskCause> = {
      keyRiskIndicator: data.keyRiskIndicator || null,
      riskTolerance: data.riskTolerance || null,
      likelihood: data.likelihood,
      impact: data.impact,
    };
    
    try {
      await updateRiskCause(currentRiskCause.id, updatedRiskCauseData);
      const updatedCause = await getRiskCauseById(currentRiskCause.id, currentUserId, currentPeriod);
      if (updatedCause) {
        setCurrentRiskCause(updatedCause); 
      }
      toast({ title: "Sukses", description: `Analisis untuk penyebab risiko ${riskCauseCodeDisplay(grandParentGoal, parentPotentialRisk, currentRiskCause)} telah disimpan.` });
    } catch (error:any) {
      const errorMessage = error.message && typeof error.message === 'string' ? error.message : String(error);
      console.error("Error saving risk cause analysis:", errorMessage);
      toast({ title: "Gagal Menyimpan", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGetAILikelihoodImpactSuggestion = async () => {
    if (!currentRiskCause || !parentPotentialRisk || !grandParentGoal || !currentUser) {
        toast({ title: "Konteks Tidak Lengkap", description: "Data induk (sasaran, potensi risiko, atau penyebab) tidak tersedia untuk saran AI.", variant: "warning" });
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
      const errorMessage = error.message && typeof error.message === 'string' ? error.message : String(error);
      toast({ title: "Kesalahan", description: errorMessage, variant: "destructive" });
      console.error("AI likelihood/impact suggestion error:", errorMessage);
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

  const handleSaveControlMeasure = async (
    formData: Omit<ControlMeasure, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'period' | 'riskCauseId' | 'potentialRiskId' | 'goalId' | 'sequenceNumber'>,
    existingControlId?: string,
    isNewControl?: boolean
  ) => {
    if (!currentRiskCause || !parentPotentialRisk || !grandParentGoal || !currentUser || !currentUserId || !currentPeriod) {
        toast({ title: "Konteks Tidak Lengkap", description: "Tidak dapat menyimpan tindakan pengendalian. Data induk tidak lengkap.", variant: "destructive" });
        return;
    }
    
    const controlDataForService: Omit<ControlMeasure, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'period' | 'riskCauseId' | 'potentialRiskId' | 'goalId' | 'sequenceNumber'> = {
      ...formData,
      deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
    };

    try {
        let savedControl: ControlMeasure;
        if (existingControlId && !isNewControl) { 
            await updateControlMeasureService(existingControlId, controlDataForService);
            savedControl = { 
              ...controlDataForService, 
              id: existingControlId, 
              createdAt: controlToEdit?.createdAt || new Date().toISOString(), // Preserve original createdAt
              updatedAt: new Date().toISOString(),
              riskCauseId: currentRiskCause.id,
              potentialRiskId: parentPotentialRisk.id,
              goalId: grandParentGoal.id,
              userId: currentUserId,
              period: currentPeriod,
              sequenceNumber: controlToEdit?.sequenceNumber || 0, // Preserve original sequence
            };
            toast({ title: "Pengendalian Diperbarui", description: `Pengendalian "${savedControl.description}" telah diperbarui.` });
        } else { 
            const existingTypeControls = controls.filter(c => c.controlType === formData.controlType);
            const nextSequenceNumber = existingTypeControls.length + 1;
            
            savedControl = await addControlMeasure(
                controlDataForService, 
                currentRiskCause.id, 
                parentPotentialRisk.id, 
                grandParentGoal.id, 
                currentUserId, 
                currentPeriod, 
                nextSequenceNumber
            );
            toast({ title: "Pengendalian Ditambahkan", description: `Pengendalian "${savedControl.description}" (${getControlTypeName(savedControl.controlType)}.${savedControl.sequenceNumber}) telah ditambahkan.` });
        }
        // Refresh controls list from Firestore
        const fetchedControls = await getControlMeasuresByRiskCauseId(currentRiskCause.id, currentUserId, currentPeriod);
        setControls(fetchedControls.sort((a, b) => (CONTROL_MEASURE_TYPE_KEYS.indexOf(a.controlType) - CONTROL_MEASURE_TYPE_KEYS.indexOf(b.controlType)) || (a.sequenceNumber - b.sequenceNumber) ));
       
        setIsControlModalOpen(false);
        setControlToEdit(null);
    } catch (error: any) {
        const errorMessage = error.message && typeof error.message === 'string' ? error.message : String(error);
        console.error("Error saving control measure:", errorMessage);
        toast({ title: "Gagal Menyimpan Pengendalian", description: errorMessage, variant: "destructive" });
    }
  };

  const handleDeleteControlMeasure = (control: ControlMeasure) => {
    setControlToDelete(control);
    setIsDeleteControlAlertOpen(true);
  };

  const confirmDeleteControlMeasure = async () => {
    if (!controlToDelete || !currentRiskCause || !currentUserId || !currentPeriod) return;
    try {
      await deleteControlMeasure(controlToDelete.id); 
      const updatedControls = await getControlMeasuresByRiskCauseId(currentRiskCause.id, currentUserId, currentPeriod);
      setControls(updatedControls.sort((a,b) => (CONTROL_MEASURE_TYPE_KEYS.indexOf(a.controlType) - CONTROL_MEASURE_TYPE_KEYS.indexOf(b.controlType)) || (a.sequenceNumber - b.sequenceNumber) ));
      toast({ title: "Pengendalian Dihapus", description: `Pengendalian "${controlToDelete.description}" telah dihapus.`, variant: "destructive" });
    } catch (error: any) {
        const errorMessage = error.message && typeof error.message === 'string' ? error.message : String(error);
        console.error("Error deleting control measure:", errorMessage);
        toast({ title: "Gagal Menghapus Pengendalian", description: errorMessage, variant: "destructive" });
    } finally {
        setIsDeleteControlAlertOpen(false);
        setControlToDelete(null);
    }
  };
  
  const riskCauseCodeDisplay = (goal: Goal | null, pRisk: PotentialRisk | null, cause: RiskCause | null) => {
    if (!goal || !pRisk || !cause) return 'PC?';
    const goalCode = `${goal.code || '[Tanpa S]'}`;
    const potentialRiskCode = `${goalCode}•PR${pRisk.sequenceNumber || '?'}`;
    return `${potentialRiskCode}•PC${cause.sequenceNumber || '?'}`;
  };

  if (authLoading || pageIsLoading || !currentUser || !currentUserId || !currentPeriod || !appUser) { 
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
  
  const currentRiskCauseFullCode = riskCauseCodeDisplay(grandParentGoal, parentPotentialRisk, currentRiskCause);
  const goalCodeDisplay = `${grandParentGoal.code || '[Tanpa S]'}`;
  const potentialRiskCodeDisplay = `${goalCodeDisplay}•PR${parentPotentialRisk.sequenceNumber || '?'}`;
  
  return (
    <div className="space-y-6">
      <PageHeader
        title={`Analisis Detail Penyebab Risiko: ${currentRiskCauseFullCode}`}
        description={`UPR: ${currentUprNameForDisplay}, Periode: ${currentPeriod}. Untuk penyebab: "${currentRiskCause.description}"`}
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
            <p><strong>Sasaran Terkait ({goalCodeDisplay}):</strong> {grandParentGoal.name}</p>
            <p><strong>Potensi Risiko ({potentialRiskCodeDisplay}):</strong> {parentPotentialRisk.description}</p>
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
                <div className="space-y-6"> 
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

                <div className="space-y-6"> 
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
                                onValueChange={(value) => {
                                    field.onChange(value as LikelihoodLevelDesc);
                                }} 
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
                                onValueChange={(value) => {
                                    field.onChange(value as ImpactLevelDesc);
                                }} 
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
          <CardDescription>
            {getControlGuidance(calculatedRiskLevelText)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <Button 
                onClick={() => { setControlToEdit(null); setIsControlModalOpen(true); }}
                disabled={!currentRiskCause || !currentUser}
            >
                <PlusCircle className="mr-2 h-4 w-4" /> Tambah Pengendalian Baru
            </Button>

            {controls.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada rencana pengendalian untuk penyebab risiko ini.</p>
            ) : (
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
                                <TableHead className="min-w-[120px]">Anggaran (Rp)</TableHead>
                                <TableHead className="text-right min-w-[100px]">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {controls.map(controlItem => { 
                                const controlCode = `${currentRiskCauseFullCode}.${controlItem.controlType}.${controlItem.sequenceNumber}`;
                                return (
                                <TableRow key={controlItem.id}>
                                    <TableCell className="text-xs font-mono">{controlCode}</TableCell>
                                    <TableCell className="text-xs"><Badge variant="outline">{getControlTypeName(controlItem.controlType)} ({controlItem.controlType})</Badge></TableCell>
                                    <TableCell className="text-xs max-w-xs truncate" title={controlItem.description}>{controlItem.description}</TableCell>
                                    <TableCell className="text-xs max-w-[150px] truncate" title={controlItem.keyControlIndicator || ''}>{controlItem.keyControlIndicator || '-'}</TableCell>
                                    <TableCell className="text-xs max-w-[150px] truncate" title={controlItem.target || ''}>{controlItem.target || '-'}</TableCell>
                                    <TableCell className="text-xs max-w-[150px] truncate" title={controlItem.responsiblePerson || ''}>{controlItem.responsiblePerson || '-'}</TableCell>
                                    <TableCell className="text-xs">{controlItem.deadline ? format(parseISO(controlItem.deadline), "dd/MM/yyyy") : '-'}</TableCell>
                                    <TableCell className="text-xs text-right">{controlItem.budget ? controlItem.budget.toLocaleString('id-ID') : '-'}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" className="h-7 w-7 mr-1" onClick={() => { setControlToEdit(controlItem); setIsControlModalOpen(true);}} disabled={!currentUser}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteControlMeasure(controlItem)} disabled={!currentUser}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
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

      {currentRiskCause && grandParentGoal && parentPotentialRisk && currentUser && currentUserId && currentPeriod && (
        <AddEditControlMeasureModal
            isOpen={isControlModalOpen}
            onOpenChange={(open) => {
                setIsControlModalOpen(open);
                if (!open) setControlToEdit(null);
            }}
            onSave={handleSaveControlMeasure}
            riskCause={currentRiskCause}
            potentialRiskId={parentPotentialRisk.id}
            goalId={grandParentGoal.id}
            uprId={grandParentGoal.userId} // Assuming goal's userId is the UPR context for the control
            period={grandParentGoal.period}
            existingControlMeasure={controlToEdit}
            existingControlsForCause={controls}
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
