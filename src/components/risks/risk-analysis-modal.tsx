
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
import { Info, BarChartHorizontalBig } from 'lucide-react';
import { LikelihoodCriteriaModal } from './likelihood-criteria-modal';
import { ImpactCriteriaModal } from './impact-criteria-modal';
import { RiskMatrixModal } from './risk-matrix-modal';

interface RiskAnalysisModalProps {
  potentialRisk: PotentialRisk | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedPotentialRisk: PotentialRisk) => void;
}

export function RiskAnalysisModal({ potentialRisk, isOpen, onOpenChange, onSave }: RiskAnalysisModalProps) {
  const [likelihood, setLikelihood] = useState<LikelihoodImpactLevel | null>(null);
  const [impact, setImpact] = useState<LikelihoodImpactLevel | null>(null);
  const [isLikelihoodCriteriaModalOpen, setIsLikelihoodCriteriaModalOpen] = useState(false);
  const [isImpactCriteriaModalOpen, setIsImpactCriteriaModalOpen] = useState(false);
  const [isRiskMatrixModalOpen, setIsRiskMatrixModalOpen] = useState(false);

  useEffect(() => {
    if (potentialRisk && isOpen) {
      setLikelihood(potentialRisk.likelihood);
      setImpact(potentialRisk.impact);
    } else if (!isOpen) {
      setLikelihood(null);
      setImpact(null);
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

  if (!potentialRisk) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Analisis Potensi Risiko</DialogTitle>
            <DialogDescription>
              Nilai probabilitas dan dampak untuk potensi risiko: <span className="font-semibold">{potentialRisk.description}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="likelihood" className="text-sm font-medium">
                  Probabilitas
                </Label>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-primary"
                  onClick={() => setIsLikelihoodCriteriaModalOpen(true)}
                  aria-label="Lihat Kriteria Kemungkinan"
                  type="button"
                >
                  <Info className="h-4 w-4" />
                </Button>
              </div>
              <Select
                value={likelihood || ""}
                onValueChange={(value) => setLikelihood(value as LikelihoodImpactLevel)}
              >
                <SelectTrigger className="w-full" id="likelihood">
                  <SelectValue placeholder="Pilih probabilitas" />
                </SelectTrigger>
                <SelectContent>
                  {LIKELIHOOD_IMPACT_LEVELS.map(level => (
                    <SelectItem key={`lh-${level}`} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="impact" className="text-sm font-medium">
                  Dampak
                </Label>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-primary"
                  onClick={() => setIsImpactCriteriaModalOpen(true)}
                  aria-label="Lihat Kriteria Dampak"
                  type="button"
                >
                  <Info className="h-4 w-4" />
                </Button>
              </div>
              <Select
                value={impact || ""}
                onValueChange={(value) => setImpact(value as LikelihoodImpactLevel)}
              >
                <SelectTrigger className="w-full" id="impact">
                  <SelectValue placeholder="Pilih dampak" />
                </SelectTrigger>
                <SelectContent>
                  {LIKELIHOOD_IMPACT_LEVELS.map(level => (
                    <SelectItem key={`im-${level}`} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="pt-2">
               <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRiskMatrixModalOpen(true)}
                  type="button"
                  className="w-full"
                >
                  <BarChartHorizontalBig className="mr-2 h-4 w-4" />
                  Lihat Matriks Profil Risiko
                </Button>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="button" onClick={handleSave}>Simpan Analisis</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LikelihoodCriteriaModal
        isOpen={isLikelihoodCriteriaModalOpen}
        onOpenChange={setIsLikelihoodCriteriaModalOpen}
      />
      <ImpactCriteriaModal
        isOpen={isImpactCriteriaModalOpen}
        onOpenChange={setIsImpactCriteriaModalOpen}
      />
      <RiskMatrixModal
        isOpen={isRiskMatrixModalOpen}
        onOpenChange={setIsRiskMatrixModalOpen}
      />
    </>
  );
}
