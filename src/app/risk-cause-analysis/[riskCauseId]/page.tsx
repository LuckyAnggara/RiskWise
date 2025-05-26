
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { PotentialRisk, Goal, RiskCause, LikelihoodLevelDesc, ImpactLevelDesc, RiskCategory, ControlMeasure, ControlMeasureTypeKey } from '@/lib/types';
import { LIKELIHOOD_LEVELS_DESC, IMPACT_LEVELS_DESC, LIKELIHOOD_LEVELS_DESC_MAP, IMPACT_LEVELS_DESC_MAP, CalculatedRiskLevelCategory, getControlTypeName } from '@/lib/types'; // CORRECTED IMPORT
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Loader2, Save, Info, BarChartHorizontalBig, Wand2, PlusCircle, Trash2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUprId, getCurrentPeriod, initializeAppContext } from '@/lib/upr-period-context';
import { LikelihoodCriteriaModal } from '@/components/risks/likelihood-criteria-modal';
import { ImpactCriteriaModal } from '@/components/risks/impact-criteria-modal';
import { RiskMatrixModal } from '@/components/risks/risk-matrix-modal';
import { Badge } from '@/components/ui/badge';
import { suggestRiskParametersAction } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { AddEditControlMeasureModal } from '@/components/risks/add-edit-control-measure-modal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format, parseISO } from 'date-fns';
import { useAuth } from '@/contexts/auth-context';
import { getGoalById } from '@/services/goalService';
import { getPotentialRiskById } from '@/services/potentialRiskService';
import { getRiskCauseById, updateRiskCause } from '@/services/riskCauseService';
import { addControlMeasure, getControlMeasuresByRiskCauseId, deleteControlMeasure, updateControlMeasure as updateControlMeasureService } from '@/services/controlMeasureService';


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

export default function RiskCauseAnalysisPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const riskCauseId = params.riskCauseId as string;
  const { currentUser } = useAuth();

  const [currentUprId, setCurrentUprId] = useState('');
  const [currentPeriod, setCurrentPeriod] = useState('');
  
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

  const [aiSuggestion, setAiSuggestion] = useState<{
    likelihood: LikelihoodLevelDesc | null;
    likelihoodJustification: string;
    impact: ImpactLevelDesc | null;
    impactJustification: string;
  } | null>(null);
  const [isAISuggestionLoading, setIsAISuggestionLoading] = useState(false);

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

  useEffect(() => {
    const context = initializeAppContext();
    setCurrentUprId(context.uprId);
    setCurrentPeriod(context.period);
  }, []); 

  useEffect(() => {
    if (!currentUprId || !currentPeriod || !riskCauseId || !currentUser) {
      setPageIsLoading(true);
      return;
    }

    const fetchData = async () => {
      setPageIsLoading(true);
      try {
        const cause = await getRiskCauseById(riskCauseId);
        if (cause && cause.uprId === currentUprId && cause.period === currentPeriod) {
          setCurrentRiskCause(cause);
          const pRisk = await getPotentialRiskById(cause.potentialRiskId);
          if (pRisk && pRisk.uprId === currentUprId && pRisk.period === currentPeriod) {
            setParentPotentialRisk(pRisk);
            const goal = await getGoalById(pRisk.goalId);
            if (goal && goal.uprId === currentUprId && goal.period === currentPeriod) {
              setGrandParentGoal(goal);
              const fetchedControls = await getControlMeasuresByRiskCauseId(cause.id, currentUprId, currentPeriod);
              setControls(fetchedControls.sort((a, b) => {
                const typeOrder = { 'Prv': 1, 'RM': 2, 'Crr': 3 };
                return (typeOrder[a.controlType] - typeOrder[b.controlType]) || (a.sequenceNumber - b.sequenceNumber);
              }));
            } else {
              throw new Error("Sasaran induk tidak ditemukan atau tidak cocok.");
            }
          } else {
            throw new Error("Potensi risiko induk tidak ditemukan atau tidak cocok.");
          }
        } else {
          throw new Error("Penyebab risiko tidak ditemukan atau tidak cocok.");
        }
      } catch (error: any) {
        console.error("Error loading risk cause analysis data:", error.message);
        toast({ title: "Kesalahan Data", description: error.message || "Gagal memuat detail penyebab risiko.", variant: "destructive" });
        const fromQuery = searchParams.get('from');
        router.push(fromQuery || '/risk-analysis');
      } finally {
        setPageIsLoading(false);
      }
    };
    fetchData();
  }, [riskCauseId, currentUprId, currentPeriod, router, toast, searchParams, currentUser]);


  useEffect(() => {
    if (currentRiskCause) {
      reset({
        keyRiskIndicator: currentRiskCause.keyRiskIndicator || "",
        riskTolerance: currentRiskCause.riskTolerance || "",
        likelihood: currentRiskCause.likelihood,
        impact: currentRiskCause.impact,
      });
      setAiSuggestion(null); 
    }
  }, [currentRiskCause, reset]);


  const onSubmitAnalysis: SubmitHandler<RiskCauseAnalysisFormData> = async (data) => {
    if (!currentRiskCause || !parentPotentialRisk || !grandParentGoal || !currentUser) {
      toast({ title: "Kesalahan", description: "Konteks data tidak lengkap untuk menyimpan.", variant: "destructive" });
      return;
    }
    setIsSaving(true);

    const updatedRiskCauseData: Partial<RiskCause> = {
      keyRiskIndicator: data.keyRiskIndicator || null,
      riskTolerance: data.riskTolerance || null,
      likelihood: data.likelihood,
      impact: data.impact,
      analysisUpdatedAt: new Date().toISOString(),
      userId: currentUser.uid, // Ensure userId is set on update as well
    };
    
    try {
      await updateRiskCause(currentRiskCause.id, updatedRiskCauseData);
      setCurrentRiskCause(prev => prev ? { ...prev, ...updatedRiskCauseData, analysisUpdatedAt: new Date().toISOString() } : null);
      toast({ title: "Sukses", description: `Analisis untuk penyebab risiko ${riskCauseCodeDisplay(grandParentGoal, parentPotentialRisk, currentRiskCause)} telah disimpan.` });
    } catch (error:any) {
      console.error("Error saving risk cause analysis:", error.message);
      toast({ title: "Gagal Menyimpan", description: error.message || "Gagal menyimpan analisis penyebab risiko.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGetAISuggestion = async () => {
    if (!currentRiskCause || !parentPotentialRisk || !grandParentGoal || !currentUser) return;
    setIsAISuggestionLoading(true);
    setAiSuggestion(null);
    try {
      const result = await suggestRiskParametersAction({
        potentialRiskDescription: parentPotentialRisk.description,
        riskCategory: parentPotentialRisk.category,
        goalDescription: grandParentGoal.description,
        riskCauseDescription: currentRiskCause.description,
      });

      if (result.success && result.data) {
        const currentFormValues = getValues();
        const newAiSuggestion = {
          likelihood: result.data.suggestedLikelihood,
          likelihoodJustification: result.data.likelihoodJustification,
          impact: result.data.suggestedImpact,
          impactJustification: result.data.impactJustification,
        };
        setAiSuggestion(newAiSuggestion);

        if (result.data.suggestedLikelihood && result.data.suggestedLikelihood !== currentFormValues.likelihood) {
          setValue('likelihood', result.data.suggestedLikelihood, {shouldValidate: true});
        }
        if (result.data.suggestedImpact && result.data.suggestedImpact !== currentFormValues.impact) {
          setValue('impact', result.data.suggestedImpact, {shouldValidate: true});
        }
      } else {
        toast({ title: "Kesalahan Saran AI", description: result.error || "Gagal mendapatkan saran dari AI.", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Kesalahan", description: error.message || "Terjadi kesalahan saat meminta saran AI.", variant: "destructive" });
      console.error("AI suggestion error:", error);
    } finally {
      setIsAISuggestionLoading(false);
    }
  };

  const handleSaveControlMeasure = async (controlMeasureData: Omit<ControlMeasure, 'id' | 'createdAt' | 'uprId' | 'period' | 'userId' | 'riskCauseId' | 'potentialRiskId' | 'goalId' | 'sequenceNumber'>, existingId?: string) => {
    if (!currentRiskCause || !parentPotentialRisk || !grandParentGoal || !currentUser) {
        toast({ title: "Konteks Tidak Lengkap", description: "Tidak dapat menyimpan tindakan pengendalian.", variant: "destructive" });
        return;
    }
    
    try {
        let savedControl: ControlMeasure;
        if (existingId) {
            await updateControlMeasureService(existingId, {...controlMeasureData, userId: currentUser.uid});
            savedControl = { ...controls.find(c=>c.id === existingId)!, ...controlMeasureData, userId: currentUser.uid, updatedAt: new Date().toISOString() };
             setControls(prev => prev.map(cm => cm.id === existingId ? savedControl : cm).sort((a,b) => {
                 const typeOrder = { 'Prv': 1, 'RM': 2, 'Crr': 3 };
                 return (typeOrder[a.controlType] - typeOrder[b.controlType]) || (a.sequenceNumber - b.sequenceNumber);
             }));
        } else {
            const existingTypeControls = controls.filter(c => c.controlType === controlMeasureData.controlType);
            const nextSequenceNumber = existingTypeControls.length + 1;
            savedControl = await addControlMeasure(controlMeasureData, currentRiskCause.id, parentPotentialRisk.id, grandParentGoal.id, currentUprId, currentPeriod, currentUser.uid, nextSequenceNumber);
             setControls(prev => [...prev, savedControl].sort((a,b) => {
                 const typeOrder = { 'Prv': 1, 'RM': 2, 'Crr': 3 };
                 return (typeOrder[a.controlType] - typeOrder[b.controlType]) || (a.sequenceNumber - b.sequenceNumber);
             }));
        }
       
        toast({ title: existingId ? "Pengendalian Diperbarui" : "Pengendalian Ditambahkan", description: `Pengendalian "${savedControl.description}" telah disimpan.` });
        setIsControlModalOpen(false);
        setControlToEdit(null);
    } catch (error: any) {
        console.error("Error saving control measure:", error.message);
        toast({ title: "Gagal Menyimpan Pengendalian", description: error.message || "Terjadi kesalahan.", variant: "destructive" });
    }
  };

  const handleDeleteControlMeasure = (controlId: string) => {
    const control = controls.find(c => c.id === controlId);
    if (control) {
        setControlToDelete(control);
        setIsDeleteControlAlertOpen(true);
    }
  };

  const confirmDeleteControlMeasure = async () => {
    if (!controlToDelete || !currentRiskCause || !currentUprId || !currentPeriod) return;
    try {
      await deleteControlMeasure(controlToDelete.id);
      let updatedControls = controls.filter(cm => cm.id !== controlToDelete.id);
       // Re-sequence after delete
      const controlTypes = Array.from(new Set(updatedControls.map(c => c.controlType)));
      let finalSequencedControls: ControlMeasure[] = [];
      controlTypes.forEach(type => {
          const typeControls = updatedControls
              .filter(c => c.controlType === type)
              .sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0))
              .map((c, index) => ({ ...c, sequenceNumber: index + 1 }));
          finalSequencedControls.push(...typeControls);
      });
      setControls(finalSequencedControls.sort((a,b) => {
          const typeOrder = { 'Prv': 1, 'RM': 2, 'Crr': 3 };
          return (typeOrder[a.controlType] - typeOrder[b.controlType]) || (a.sequenceNumber - b.sequenceNumber);
      }));

      toast({ title: "Pengendalian Dihapus", description: `Pengendalian "${controlToDelete.description}" telah dihapus.`, variant: "destructive" });
    } catch (error: any) {
        console.error("Error deleting control measure:", error.message);
        toast({ title: "Gagal Menghapus Pengendalian", description: error.message || "Terjadi kesalahan.", variant: "destructive" });
    } finally {
        setIsDeleteControlAlertOpen(false);
        setControlToDelete(null);
    }
  };

  const getControlGuidance = (level: CalculatedRiskLevelCategory | 'N/A'): string => {
    switch (level) {
      case 'Sangat Tinggi':
      case 'Tinggi':
        return "Disarankan membuat rencana pengendalian: Preventif (Prv), Mitigasi Risiko (RM), dan Korektif (Crr).";
      case 'Sedang':
        return "Disarankan membuat rencana pengendalian: Preventif (Prv) dan Mitigasi Risiko (RM).";
      case 'Rendah':
      case 'Sangat Rendah':
        return "Disarankan membuat rencana pengendalian: Preventif (Prv).";
      default:
        return "Tentukan tingkat risiko penyebab terlebih dahulu untuk melihat panduan pengendalian.";
    }
  };
  
  const riskCauseCodeDisplay = (goal: Goal | null, pRisk: PotentialRisk | null, cause: RiskCause | null) => {
    if (!goal || !pRisk || !cause) return 'PC?';
    const goalCode = `${goal.code || '[Tanpa S]'}`;
    const potentialRiskCode = `${goalCode}•PR${pRisk.sequenceNumber || '?'}`;
    return `${potentialRiskCode}•PC${cause.sequenceNumber || '?'}`;
  };

  if (pageIsLoading || !currentRiskCause || !parentPotentialRisk || !grandParentGoal) { 
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
  
  const currentRiskCauseFullCode = riskCauseCodeDisplay(grandParentGoal, parentPotentialRisk, currentRiskCause);
  const goalCodeDisplay = `${grandParentGoal.code || '[Tanpa S]'}`;
  const potentialRiskCodeDisplay = `${goalCodeDisplay}•PR${parentPotentialRisk.sequenceNumber || '?'}`;


  return (
    <div className="space-y-6">
      <PageHeader
        title={`Analisis Detail Penyebab Risiko: ${currentRiskCauseFullCode}`}
        description={`Input KRI, Toleransi, Kemungkinan, dan Dampak untuk penyebab: "${currentRiskCause.description}"`}
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
                    <Label htmlFor="keyRiskIndicator">Key Risk Indicator (KRI)</Label>
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
                    <Label htmlFor="riskTolerance">Toleransi Risiko</Label>
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
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={handleGetAISuggestion} disabled={isAISuggestionLoading || !currentUser} aria-label="Dapatkan Saran AI untuk Kemungkinan" type="button">
                                {isAISuggestionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
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
                        {aiSuggestion?.likelihoodJustification && (
                        <Alert variant="default" className="mt-2 text-xs">
                            <Wand2 className="h-4 w-4" />
                            <AlertTitle className="font-semibold">Saran AI (Kemungkinan): {aiSuggestion.likelihood || "Tidak ada"}</AlertTitle>
                            <AlertDescription>{aiSuggestion.likelihoodJustification}</AlertDescription>
                        </Alert>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="impact">Dampak</Label>
                            <div className="flex items-center space-x-1">
                           <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={handleGetAISuggestion} disabled={isAISuggestionLoading || !currentUser} aria-label="Dapatkan Saran AI untuk Dampak" type="button">
                                {isAISuggestionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
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
                        {aiSuggestion?.impactJustification && (
                        <Alert variant="default" className="mt-2 text-xs">
                            <Wand2 className="h-4 w-4" />
                            <AlertTitle className="font-semibold">Saran AI (Dampak): {aiSuggestion.impact || "Tidak ada"}</AlertTitle>
                            <AlertDescription>{aiSuggestion.impactJustification}</AlertDescription>
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
                            {controls.map(control => {
                                const controlCode = `${currentRiskCauseFullCode}.${control.controlType}.${control.sequenceNumber}`;
                                return (
                                <TableRow key={control.id}>
                                    <TableCell className="text-xs font-mono">{controlCode}</TableCell>
                                    <TableCell className="text-xs"><Badge variant="outline">{getControlTypeName(control.controlType)} ({control.controlType})</Badge></TableCell>
                                    <TableCell className="text-xs max-w-xs truncate" title={control.description}>{control.description}</TableCell>
                                    <TableCell className="text-xs max-w-[150px] truncate" title={control.keyControlIndicator || ''}>{control.keyControlIndicator || '-'}</TableCell>
                                    <TableCell className="text-xs max-w-[150px] truncate" title={control.target || ''}>{control.target || '-'}</TableCell>
                                    <TableCell className="text-xs max-w-[150px] truncate" title={control.responsiblePerson || ''}>{control.responsiblePerson || '-'}</TableCell>
                                    <TableCell className="text-xs">{control.deadline ? format(parseISO(control.deadline), "dd/MM/yyyy") : '-'}</TableCell>
                                    <TableCell className="text-xs text-right">{control.budget ? control.budget.toLocaleString('id-ID') : '-'}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" className="h-7 w-7 mr-1" onClick={() => { setControlToEdit(control); setIsControlModalOpen(true);}} disabled={!currentUser}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteControlMeasure(control.id)} disabled={!currentUser}>
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
      {currentRiskCause && grandParentGoal && parentPotentialRisk && currentUser && (
        <AddEditControlMeasureModal
            isOpen={isControlModalOpen}
            onOpenChange={(open) => {
                setIsControlModalOpen(open);
                if (!open) setControlToEdit(null); // Reset controlToEdit when modal is closed
            }}
            onSave={handleSaveControlMeasure}
            riskCause={currentRiskCause}
            potentialRiskId={parentPotentialRisk.id}
            goalId={grandParentGoal.id}
            uprId={grandParentGoal.uprId}
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


    