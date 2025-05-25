
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { PotentialRisk, Goal, RiskCause, LikelihoodImpactLevel, RiskCategory } from '@/lib/types';
import { LIKELIHOOD_IMPACT_LEVELS } from '@/lib/types';
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Loader2, Save, Info, BarChartHorizontalBig } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUprId, getCurrentPeriod, initializeAppContext } from '@/lib/upr-period-context';
import { LikelihoodCriteriaModal } from '@/components/risks/likelihood-criteria-modal';
import { ImpactCriteriaModal } from '@/components/risks/impact-criteria-modal';
import { RiskMatrixModal } from '@/components/risks/risk-matrix-modal';
import { Badge } from '@/components/ui/badge';

const riskCauseAnalysisSchema = z.object({
  keyRiskIndicator: z.string().nullable(),
  riskTolerance: z.string().nullable(),
  likelihood: z.custom<LikelihoodImpactLevel>().nullable(),
  impact: z.custom<LikelihoodImpactLevel>().nullable(),
});

type RiskCauseAnalysisFormData = z.infer<typeof riskCauseAnalysisSchema>;

const getGoalsStorageKey = (uprId: string, period: string) => `riskwise-upr${uprId}-period${period}-goals`;
const getPotentialRisksStorageKeyForGoal = (uprId: string, period: string, goalId: string) => `riskwise-upr${uprId}-period${period}-goal${goalId}-potentialRisks`;
const getRiskCausesStorageKey = (uprId: string, period: string, potentialRiskId: string) => `riskwise-upr${uprId}-period${period}-potentialRisk${potentialRiskId}-causes`;

const getRiskLevel = (likelihood: LikelihoodImpactLevel | null, impact: LikelihoodImpactLevel | null): string => {
  if (!likelihood || !impact) return 'N/A';
  const L: { [key in LikelihoodImpactLevel]: number } = { 'Sangat Rendah': 1, 'Rendah': 2, 'Sedang': 3, 'Tinggi': 4, 'Sangat Tinggi': 5 };
  const I: { [key in LikelihoodImpactLevel]: number } = { 'Sangat Rendah': 1, 'Rendah': 2, 'Sedang': 3, 'Tinggi': 4, 'Sangat Tinggi': 5 };
  const likelihoodValue = L[likelihood];
  const impactValue = I[impact];
  if (!likelihoodValue || !impactValue) return 'N/A';
  const score = likelihoodValue * impactValue;
  if (score >= 20) return 'Sangat Tinggi';
  if (score >= 16) return 'Tinggi';
  if (score >= 12) return 'Sedang';
  if (score >= 6) return 'Rendah';
  if (score >= 1) return 'Sangat Rendah';
  return 'N/A';
};

const getRiskLevelColor = (level: string) => {
  switch (level.toLowerCase()) {
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
  const riskCauseId = params.riskCauseId as string;

  const [currentUprId, setCurrentUprId] = useState('');
  const [currentPeriod, setCurrentPeriod] = useState('');
  
  const [pageIsLoading, setPageIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [currentRiskCause, setCurrentRiskCause] = useState<RiskCause | null>(null);
  const [parentPotentialRisk, setParentPotentialRisk] = useState<PotentialRisk | null>(null);
  const [grandParentGoal, setGrandParentGoal] = useState<Goal | null>(null);

  const [isLikelihoodCriteriaModalOpen, setIsLikelihoodCriteriaModalOpen] = useState(false);
  const [isImpactCriteriaModalOpen, setIsImpactCriteriaModalOpen] = useState(false);
  const [isRiskMatrixModalOpen, setIsRiskMatrixModalOpen] = useState(false);

  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<RiskCauseAnalysisFormData>({
    resolver: zodResolver(riskCauseAnalysisSchema),
  });

  const watchedLikelihood = watch("likelihood");
  const watchedImpact = watch("impact");
  const calculatedRiskLevel = getRiskLevel(watchedLikelihood, watchedImpact);

  const loadData = useCallback(async (uprId: string, period: string) => {
    setPageIsLoading(true);
    const goalsStorageKey = getGoalsStorageKey(uprId, period);
    const storedGoalsData = localStorage.getItem(goalsStorageKey);
    const allGoals: Goal[] = storedGoalsData ? JSON.parse(storedGoalsData) : [];

    let foundCause: RiskCause | null = null;
    let foundPotentialRisk: PotentialRisk | null = null;
    let foundGoal: Goal | null = null;

    for (const goal of allGoals) {
      const potentialRisksStorageKey = getPotentialRisksStorageKeyForGoal(goal.uprId, goal.period, goal.id);
      const storedPotentialRisksData = localStorage.getItem(potentialRisksStorageKey);
      if (storedPotentialRisksData) {
        const goalPotentialRisks: PotentialRisk[] = JSON.parse(storedPotentialRisksData);
        for (const pRisk of goalPotentialRisks) {
          const causesStorageKey = getRiskCausesStorageKey(goal.uprId, goal.period, pRisk.id);
          const storedCausesData = localStorage.getItem(causesStorageKey);
          if (storedCausesData) {
            const pRiskCauses: RiskCause[] = JSON.parse(storedCausesData);
            const cause = pRiskCauses.find(rc => rc.id === riskCauseId);
            if (cause) {
              foundCause = cause;
              foundPotentialRisk = pRisk;
              foundGoal = goal;
              break;
            }
          }
        }
      }
      if (foundCause) break;
    }

    setCurrentRiskCause(foundCause);
    setParentPotentialRisk(foundPotentialRisk);
    setGrandParentGoal(foundGoal);

    if (foundCause) {
      reset({
        keyRiskIndicator: foundCause.keyRiskIndicator || "",
        riskTolerance: foundCause.riskTolerance || "",
        likelihood: foundCause.likelihood,
        impact: foundCause.impact,
      });
    } else {
      toast({ title: "Kesalahan", description: "Detail Penyebab Risiko tidak ditemukan.", variant: "destructive" });
      router.push('/risk-analysis'); // Redirect if cause not found
    }
    setPageIsLoading(false);
  }, [riskCauseId, reset, router, toast]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const context = initializeAppContext();
      setCurrentUprId(context.uprId);
      setCurrentPeriod(context.period);
      loadData(context.uprId, context.period);
    }
  }, [loadData]);

  const onSubmit: SubmitHandler<RiskCauseAnalysisFormData> = async (data) => {
    if (!currentRiskCause || !parentPotentialRisk || !grandParentGoal) {
      toast({ title: "Kesalahan", description: "Konteks data tidak lengkap untuk menyimpan.", variant: "destructive" });
      return;
    }
    setIsSaving(true);

    const updatedRiskCause: RiskCause = {
      ...currentRiskCause,
      keyRiskIndicator: data.keyRiskIndicator || null,
      riskTolerance: data.riskTolerance || null,
      likelihood: data.likelihood,
      impact: data.impact,
      analysisUpdatedAt: new Date().toISOString(),
    };

    const causesStorageKey = getRiskCausesStorageKey(grandParentGoal.uprId, grandParentGoal.period, parentPotentialRisk.id);
    const storedCausesData = localStorage.getItem(causesStorageKey);
    let currentRiskCauses: RiskCause[] = storedCausesData ? JSON.parse(storedCausesData) : [];
    currentRiskCauses = currentRiskCauses.map(rc => rc.id === updatedRiskCause.id ? updatedRiskCause : rc);
    localStorage.setItem(causesStorageKey, JSON.stringify(currentRiskCauses.sort((a,b) => a.sequenceNumber - b.sequenceNumber)));
    
    setCurrentRiskCause(updatedRiskCause); // Update local state
    toast({ title: "Sukses", description: `Analisis untuk penyebab risiko PC${updatedRiskCause.sequenceNumber} telah disimpan.` });
    setIsSaving(false);
  };

  if (pageIsLoading || !currentRiskCause || !parentPotentialRisk || !grandParentGoal) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat data analisis penyebab risiko...</p>
      </div>
    );
  }
  
  const goalCode = `S${grandParentGoal.sequenceNumber}`;
  const potentialRiskCode = `${goalCode}.PR${parentPotentialRisk.sequenceNumber}`;
  const riskCauseCode = `${potentialRiskCode}.PC${currentRiskCause.sequenceNumber}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Analisis Detail Penyebab Risiko: ${riskCauseCode}`}
        description={`Input KRI, Toleransi, Probabilitas, dan Dampak untuk penyebab: "${currentRiskCause.description}"`}
        actions={
          <Button 
            onClick={() => router.push(`/all-risks/manage/${parentPotentialRisk.id}`)} 
            variant="outline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Detail Potensi Risiko
          </Button>
        }
      />

      <Card className="mb-6">
        <CardHeader>
            <CardTitle>Konteks Risiko</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
            <div><strong>Sasaran Terkait ({goalCode}):</strong> {grandParentGoal.name}</div>
            <div><strong>Potensi Risiko ({potentialRiskCode}):</strong> {parentPotentialRisk.description}</div>
            <div><strong>Kategori Risiko:</strong> <Badge variant="secondary">{parentPotentialRisk.category || 'N/A'}</Badge></div>
            <div><strong>Pemilik Potensi Risiko:</strong> {parentPotentialRisk.owner || 'N/A'}</div>
            <div><strong>Deskripsi Penyebab (PC{currentRiskCause.sequenceNumber}):</strong> {currentRiskCause.description}</div>
            <div><strong>Sumber Penyebab:</strong> <Badge variant="outline">{currentRiskCause.source}</Badge></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Formulir Analisis Penyebab Risiko</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="likelihood">Probabilitas Penyebab</Label>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => setIsLikelihoodCriteriaModalOpen(true)} type="button"><Info className="h-4 w-4" /></Button>
                    </div>
                    <Controller
                        name="likelihood"
                        control={control}
                        render={({ field }) => (
                        <Select value={field.value || ""} onValueChange={field.onChange} disabled={isSaving}>
                            <SelectTrigger id="likelihood" className={errors.likelihood ? "border-destructive" : ""}>
                                <SelectValue placeholder="Pilih probabilitas" />
                            </SelectTrigger>
                            <SelectContent>
                            {LIKELIHOOD_IMPACT_LEVELS.map(level => (<SelectItem key={`lh-${level}`} value={level}>{level}</SelectItem>))}
                            </SelectContent>
                        </Select>
                        )}
                    />
                    {errors.likelihood && <p className="text-xs text-destructive mt-1">{errors.likelihood.message}</p>}
                </div>

                <div className="space-y-1.5">
                     <div className="flex items-center justify-between">
                        <Label htmlFor="impact">Dampak Penyebab</Label>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => setIsImpactCriteriaModalOpen(true)} type="button"><Info className="h-4 w-4" /></Button>
                    </div>
                    <Controller
                        name="impact"
                        control={control}
                        render={({ field }) => (
                        <Select value={field.value || ""} onValueChange={field.onChange} disabled={isSaving}>
                            <SelectTrigger id="impact" className={errors.impact ? "border-destructive" : ""}>
                                <SelectValue placeholder="Pilih dampak" />
                            </SelectTrigger>
                            <SelectContent>
                            {LIKELIHOOD_IMPACT_LEVELS.map(level => (<SelectItem key={`im-${level}`} value={level}>{level}</SelectItem>))}
                            </SelectContent>
                        </Select>
                        )}
                    />
                    {errors.impact && <p className="text-xs text-destructive mt-1">{errors.impact.message}</p>}
                </div>
            </div>

            <div className="space-y-2 rounded-md border p-3 bg-muted/30">
                <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Tingkat Risiko (Penyebab)</Label>
                     <Badge className={`${getRiskLevelColor(calculatedRiskLevel)}`}>
                        {calculatedRiskLevel}
                     </Badge>
                </div>
                <p className="text-xs text-muted-foreground">Dihitung berdasarkan Probabilitas dan Dampak yang dipilih untuk penyebab ini.</p>
            </div>
            
            <div className="pt-2">
               <Button variant="outline" size="sm" onClick={() => setIsRiskMatrixModalOpen(true)} type="button" className="w-full">
                  <BarChartHorizontalBig className="mr-2 h-4 w-4" /> Lihat Matriks Profil Risiko
                </Button>
            </div>
            
            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Simpan Analisis Penyebab
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <LikelihoodCriteriaModal isOpen={isLikelihoodCriteriaModalOpen} onOpenChange={setIsLikelihoodCriteriaModalOpen} />
      <ImpactCriteriaModal isOpen={isImpactCriteriaModalOpen} onOpenChange={setIsImpactCriteriaModalOpen} />
      <RiskMatrixModal isOpen={isRiskMatrixModalOpen} onOpenChange={setIsRiskMatrixModalOpen} />
    </div>
  );
}


    