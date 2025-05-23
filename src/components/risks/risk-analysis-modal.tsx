
"use client";

import React, { useState, useEffect } from 'react';
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
import type { Risk, LikelihoodImpactLevel } from '@/lib/types';
import { LIKELIHOOD_IMPACT_LEVELS } from '@/lib/types';

interface RiskAnalysisModalProps {
  risk: Risk | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedRisk: Risk) => void;
}

export function RiskAnalysisModal({ risk, isOpen, onOpenChange, onSave }: RiskAnalysisModalProps) {
  const [likelihood, setLikelihood] = useState<LikelihoodImpactLevel | null>(null);
  const [impact, setImpact] = useState<LikelihoodImpactLevel | null>(null);

  useEffect(() => {
    if (risk) {
      setLikelihood(risk.likelihood);
      setImpact(risk.impact);
    }
  }, [risk]);

  const handleSave = () => {
    if (risk) {
      onSave({
        ...risk,
        likelihood,
        impact,
        analysisCompletedAt: new Date().toISOString(),
      });
      onOpenChange(false);
    }
  };

  if (!risk) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Analyze Risk</DialogTitle>
          <DialogDescription>
            Assess the likelihood and impact for the risk: <span className="font-semibold">{risk.description}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="likelihood" className="text-right">
              Likelihood
            </Label>
            <Select
              value={likelihood || ""}
              onValueChange={(value) => setLikelihood(value as LikelihoodImpactLevel)}
            >
              <SelectTrigger className="col-span-3" id="likelihood">
                <SelectValue placeholder="Select likelihood" />
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
              Impact
            </Label>
            <Select
              value={impact || ""}
              onValueChange={(value) => setImpact(value as LikelihoodImpactLevel)}
            >
              <SelectTrigger className="col-span-3" id="impact">
                <SelectValue placeholder="Select impact" />
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
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={handleSave}>Save Analysis</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
