
"use client";

import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PotentialRisk, RiskCause, LikelihoodImpactLevel } from '@/lib/types';
import { LIKELIHOOD_IMPACT_LEVELS } from '@/lib/types';
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Info, BarChartHorizontalBig, Loader2, Save } from 'lucide-react';
import { LikelihoodCriteriaModal } from './likelihood-criteria-modal';
import { ImpactCriteriaModal } from './impact-criteria-modal';
import { RiskMatrixModal } from './risk-matrix-modal'; // Assuming this exists for reference

const riskCauseAnalysisSchema = z.object({
  keyRiskIndicator: z.string().nullable(),
  riskTolerance: z.string().nullable(),
  likelihood: z.custom<LikelihoodImpactLevel>().nullable(),
  impact: z.custom<LikelihoodImpactLevel>().nullable(),
});

type RiskCauseAnalysisFormData = z.infer<typeof riskCauseAnalysisSchema>;

interface RiskCauseAnalysisModalProps {
  riskCause: RiskCause | null;
  potentialRisk: PotentialRisk | null; // Needed for context (goalId, uprId, period for storage key)
  goalUprId: string;
  goalPeriod: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedRiskCause: RiskCause) => void;
}

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

export function RiskCauseAnalysisModal({ 
  riskCause, 
  potentialRisk, 
  goalUprId, 
  goalPeriod, 
  isOpen, 
  onOpenChange, 
  onSave 
}: RiskCauseAnalysisModalProps) {
  const { toast } = useToast();
  const [isLikelihoodCriteriaModalOpen, setIsLikelihoodCriteriaModalOpen] = useState(false);
  const [isImpactCriteriaModalOpen, setIsImpactCriteriaModalOpen] = useState(false);
  const [isRiskMatrixModalOpen, setIsRiskMatrixModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RiskCauseAnalysisFormData>({
    resolver: zodResolver(riskCauseAnalysisSchema),
    defaultValues: {
      keyRiskIndicator: null,
      riskTolerance: null,
      likelihood: null,
      impact: null,
    },
  });

  const watchedLikelihood = watch("likelihood");
  const watchedImpact = watch("impact");
  const calculatedRiskLevel = getRiskLevel(watchedLikelihood, watchedImpact);

  useEffect(() => {
    if (riskCause && isOpen) {
      reset({
        keyRiskIndicator: riskCause.keyRiskIndicator || "",
        riskTolerance: riskCause.riskTolerance || "",
        likelihood: riskCause.likelihood,
        impact: riskCause.impact,
      });
    } else if (!isOpen) {
        reset({ keyRiskIndicator: null, riskTolerance: null, likelihood: null, impact: null });
    }
  }, [riskCause, isOpen, reset]);

  const onSubmit: SubmitHandler<RiskCauseAnalysisFormData> = (data) => {
    if (!riskCause || !potentialRisk) return;

    const updatedRiskCause: RiskCause = {
      ...riskCause,
      keyRiskIndicator: data.keyRiskIndicator || null,
      riskTolerance: data.riskTolerance || null,
      likelihood: data.likelihood,
      impact: data.impact,
      analysisUpdatedAt: new Date().toISOString(),
    };
    onSave(updatedRiskCause);
    toast({ title: "Analisis Penyebab Disimpan", description: `Detail analisis untuk penyebab "${riskCause.description}" telah diperbarui.` });
    onOpenChange(false);
  };

  if (!riskCause || !potentialRisk) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Analisis Penyebab Risiko</DialogTitle>
            <DialogDescription>
              Input KRI, Toleransi, Probabilitas, dan Dampak untuk penyebab: <span className="font-semibold">{riskCause.description}</span>
              <br/> (Potensi Risiko: {potentialRisk.description})
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="keyRiskIndicator">Key Risk Indicator (KRI)</Label>
              <Textarea
                id="keyRiskIndicator"
                {...register("keyRiskIndicator")}
                rows={2}
                placeholder="Contoh: Jumlah keluhan pelanggan melebihi X per bulan"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="riskTolerance">Toleransi Risiko</Label>
              <Textarea
                id="riskTolerance"
                {...register("riskTolerance")}
                rows={2}
                placeholder="Contoh: Maksimal 5 keluhan pelanggan per bulan"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="likelihood" className="text-sm font-medium">Probabilitas</Label>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => setIsLikelihoodCriteriaModalOpen(true)} aria-label="Lihat Kriteria Kemungkinan" type="button"><Info className="h-4 w-4" /></Button>
              </div>
              <Controller
                name="likelihood"
                control={control}
                render={({ field }) => (
                  <Select value={field.value || ""} onValueChange={field.onChange}>
                    <SelectTrigger id="likelihood"><SelectValue placeholder="Pilih probabilitas" /></SelectTrigger>
                    <SelectContent>
                      {LIKELIHOOD_IMPACT_LEVELS.map(level => (<SelectItem key={`lh-${level}`} value={level}>{level}</SelectItem>))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="impact" className="text-sm font-medium">Dampak</Label>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => setIsImpactCriteriaModalOpen(true)} aria-label="Lihat Kriteria Dampak" type="button"><Info className="h-4 w-4" /></Button>
              </div>
              <Controller
                name="impact"
                control={control}
                render={({ field }) => (
                  <Select value={field.value || ""} onValueChange={field.onChange}>
                    <SelectTrigger id="impact"><SelectValue placeholder="Pilih dampak" /></SelectTrigger>
                    <SelectContent>
                      {LIKELIHOOD_IMPACT_LEVELS.map(level => (<SelectItem key={`im-${level}`} value={level}>{level}</SelectItem>))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2 rounded-md border p-3 bg-muted/30">
                <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Tingkat Risiko (Penyebab)</Label>
                     <Badge className={`${getRiskLevelColor(calculatedRiskLevel)} text-xs`}>
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Simpan Analisis Penyebab
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <LikelihoodCriteriaModal isOpen={isLikelihoodCriteriaModalOpen} onOpenChange={setIsLikelihoodCriteriaModalOpen} />
      <ImpactCriteriaModal isOpen={isImpactCriteriaModalOpen} onOpenChange={setIsImpactCriteriaModalOpen} />
      <RiskMatrixModal isOpen={isRiskMatrixModalOpen} onOpenChange={setIsRiskMatrixModalOpen} />
    </>
  );
}
