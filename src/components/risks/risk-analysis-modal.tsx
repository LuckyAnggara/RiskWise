
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

interface RiskAnalysisModalProps {
  potentialRisk: PotentialRisk | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedPotentialRisk: PotentialRisk) => void;
}

export function RiskAnalysisModal({ potentialRisk, isOpen, onOpenChange, onSave }: RiskAnalysisModalProps) {
  const [likelihood, setLikelihood] = useState<LikelihoodImpactLevel | null>(null);
  const [impact, setImpact] = useState<LikelihoodImpactLevel | null>(null);

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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Analisis Potensi Risiko</DialogTitle>
          <DialogDescription>
            Nilai probabilitas dan dampak untuk potensi risiko: <span className="font-semibold">{potentialRisk.description}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="likelihood" className="text-right">
              Probabilitas
            </Label>
            <Select
              value={likelihood || ""}
              onValueChange={(value) => setLikelihood(value as LikelihoodImpactLevel)}
            >
              <SelectTrigger className="col-span-3" id="likelihood">
                <SelectValue placeholder="Pilih probabilitas" />
              </SelectTrigger>
              <SelectContent>
                {LIKELIHOOD_IMPACT_LEVELS.map(level => (
                  <SelectItem key={level} value={level}>{level}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="impact" className="text-right">
              Dampak
            </Label>
            <Select
              value={impact || ""}
              onValueChange={(value) => setImpact(value as LikelihoodImpactLevel)}
            >
              <SelectTrigger className="col-span-3" id="impact">
                <SelectValue placeholder="Pilih dampak" />
              </SelectTrigger>
              <SelectContent>
                {LIKELIHOOD_IMPACT_LEVELS.map(level => (
                  <SelectItem key={level} value={level}>{level}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button type="button" onClick={handleSave}>Simpan Analisis</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
