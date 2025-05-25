
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PotentialRisk, LikelihoodImpactLevel } from '@/lib/types';
import { LIKELIHOOD_IMPACT_LEVELS } from '@/lib/types';
import { Info, BarChartHorizontalBig, Wand2, Loader2 } from 'lucide-react';
import { LikelihoodCriteriaModal } from './likelihood-criteria-modal';
import { ImpactCriteriaModal } from './impact-criteria-modal';
import { RiskMatrixModal } from './risk-matrix-modal';
import { suggestRiskParametersAction } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface RiskAnalysisModalProps {
  potentialRisk: PotentialRisk | null;
  goalDescription?: string; // Optional: Pass goal description for better AI context
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedPotentialRisk: PotentialRisk) => void;
}

export function RiskAnalysisModal({ potentialRisk, goalDescription, isOpen, onOpenChange, onSave }: RiskAnalysisModalProps) {
  const [likelihood, setLikelihood] = useState<LikelihoodImpactLevel | null>(null);
  const [impact, setImpact] = useState<LikelihoodImpactLevel | null>(null);
  const [isLikelihoodCriteriaModalOpen, setIsLikelihoodCriteriaModalOpen] = useState(false);
  const [isImpactCriteriaModalOpen, setIsImpactCriteriaModalOpen] = useState(false);
  const [isRiskMatrixModalOpen, setIsRiskMatrixModalOpen] = useState(false);

  const [aiSuggestion, setAiSuggestion] = useState<{
    likelihood: LikelihoodImpactLevel | null;
    likelihoodJustification: string;
    impact: LikelihoodImpactLevel | null;
    impactJustification: string;
  } | null>(null);
  const [isAISuggestionLoading, setIsAISuggestionLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (potentialRisk && isOpen) {
      setLikelihood(potentialRisk.likelihood);
      setImpact(potentialRisk.impact);
      setAiSuggestion(null); // Reset AI suggestion when modal opens or risk changes
    } else if (!isOpen) {
      setLikelihood(null);
      setImpact(null);
      setAiSuggestion(null);
    }
  }, [potentialRisk, isOpen]);

  const handleSave = () => {
    if (potentialRisk) {
      onSave({
        ...potentialRisk,
        likelihood,
        impact,
        analysisCompletedAt: new Date().toISOString(),
      });
      onOpenChange(false);
    }
  };

  const handleGetAISuggestion = async () => {
    if (!potentialRisk) return;
    setIsAISuggestionLoading(true);
    setAiSuggestion(null);
    try {
      const result = await suggestRiskParametersAction({
        potentialRiskDescription: potentialRisk.description,
        riskCategory: potentialRisk.category,
        goalDescription: goalDescription || "Tujuan terkait tidak disediakan secara spesifik.",
        // riskCauseDescription: null, // Not applicable for PotentialRisk inheren analysis
      });
      if (result.success && result.data) {
        setAiSuggestion({
          likelihood: result.data.suggestedLikelihood as LikelihoodImpactLevel | null,
          likelihoodJustification: result.data.likelihoodJustification,
          impact: result.data.suggestedImpact as LikelihoodImpactLevel | null,
          impactJustification: result.data.impactJustification,
        });
        // Optionally auto-apply suggestions, or let user click
        // if (result.data.suggestedLikelihood) setLikelihood(result.data.suggestedLikelihood as LikelihoodImpactLevel);
        // if (result.data.suggestedImpact) setImpact(result.data.suggestedImpact as LikelihoodImpactLevel);
      } else {
        toast({ title: "Kesalahan Saran AI", description: result.error || "Gagal mendapatkan saran dari AI.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Kesalahan", description: "Terjadi kesalahan saat meminta saran AI.", variant: "destructive" });
      console.error("AI suggestion error:", error);
    } finally {
      setIsAISuggestionLoading(false);
    }
  };


  if (!potentialRisk) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Analisis Potensi Risiko (Inheren)</DialogTitle>
            <DialogDescription>
              Nilai kemungkinan dan dampak inheren untuk potensi risiko: <span className="font-semibold">{potentialRisk.description}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="likelihoodPR" className="text-sm font-medium">
                  Kemungkinan (Inheren)
                </Label>
                <div className="flex items-center space-x-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={handleGetAISuggestion} disabled={isAISuggestionLoading} aria-label="Dapatkan Saran AI untuk Kemungkinan" type="button">
                    {isAISuggestionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => setIsLikelihoodCriteriaModalOpen(true)} aria-label="Lihat Kriteria Kemungkinan" type="button">
                    <Info className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Select
                value={likelihood || ""}
                onValueChange={(value) => setLikelihood(value as LikelihoodImpactLevel)}
              >
                <SelectTrigger className="w-full" id="likelihoodPR">
                  <SelectValue placeholder="Pilih kemungkinan" />
                </SelectTrigger>
                <SelectContent>
                  {LIKELIHOOD_IMPACT_LEVELS.map(level => (
                    <SelectItem key={`lh-pr-${level}`} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {aiSuggestion?.likelihoodJustification && (
                <Alert variant="default" className="mt-2 text-xs">
                  <Wand2 className="h-4 w-4" />
                  <AlertTitle className="font-semibold">Saran AI (Kemungkinan): {aiSuggestion.likelihood || "Tidak ada"}</AlertTitle>
                  <AlertDescription>{aiSuggestion.likelihoodJustification}</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="impactPR" className="text-sm font-medium">
                  Dampak (Inheren)
                </Label>
                 <div className="flex items-center space-x-1">
                   <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={handleGetAISuggestion} disabled={isAISuggestionLoading} aria-label="Dapatkan Saran AI untuk Dampak" type="button">
                    {isAISuggestionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => setIsImpactCriteriaModalOpen(true)} aria-label="Lihat Kriteria Dampak" type="button">
                    <Info className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Select
                value={impact || ""}
                onValueChange={(value) => setImpact(value as LikelihoodImpactLevel)}
              >
                <SelectTrigger className="w-full" id="impactPR">
                  <SelectValue placeholder="Pilih dampak" />
                </SelectTrigger>
                <SelectContent>
                  {LIKELIHOOD_IMPACT_LEVELS.map(level => (
                    <SelectItem key={`im-pr-${level}`} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
               {aiSuggestion?.impactJustification && (
                <Alert variant="default" className="mt-2 text-xs">
                  <Wand2 className="h-4 w-4" />
                  <AlertTitle className="font-semibold">Saran AI (Dampak): {aiSuggestion.impact || "Tidak ada"}</AlertTitle>
                  <AlertDescription>{aiSuggestion.impactJustification}</AlertDescription>
                </Alert>
              )}
            </div>
            
            <div className="pt-2">
               <Button variant="outline" size="sm" onClick={() => setIsRiskMatrixModalOpen(true)} type="button" className="w-full">
                  <BarChartHorizontalBig className="mr-2 h-4 w-4" /> Lihat Matriks Profil Risiko
                </Button>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="button" onClick={handleSave}>Simpan Analisis</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LikelihoodCriteriaModal isOpen={isLikelihoodCriteriaModalOpen} onOpenChange={setIsLikelihoodCriteriaModalOpen} />
      <ImpactCriteriaModal isOpen={isImpactCriteriaModalOpen} onOpenChange={setIsImpactCriteriaModalOpen} />
      <RiskMatrixModal isOpen={isRiskMatrixModalOpen} onOpenChange={setIsRiskMatrixModalOpen} />
    </>
  );
}
