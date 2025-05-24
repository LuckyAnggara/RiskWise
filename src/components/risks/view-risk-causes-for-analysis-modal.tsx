
"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from '@/components/ui/scroll-area';
import type { PotentialRisk, RiskCause, LikelihoodImpactLevel } from '@/lib/types';
import { RiskCauseAnalysisModal } from './risk-cause-analysis-modal'; // Import the new modal
import { BarChart3 } from 'lucide-react';

interface ViewRiskCausesForAnalysisModalProps {
  potentialRisk: PotentialRisk | null;
  riskCauses: RiskCause[];
  goalUprId: string;
  goalPeriod: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onRiskCauseUpdated: (updatedRiskCause: RiskCause) => void; // Callback to update parent state
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

export function ViewRiskCausesForAnalysisModal({
  potentialRisk,
  riskCauses,
  goalUprId,
  goalPeriod,
  isOpen,
  onOpenChange,
  onRiskCauseUpdated,
}: ViewRiskCausesForAnalysisModalProps) {
  const [selectedCauseForAnalysis, setSelectedCauseForAnalysis] = useState<RiskCause | null>(null);
  const [isCauseAnalysisModalOpen, setIsCauseAnalysisModalOpen] = useState(false);

  const handleOpenCauseAnalysis = (cause: RiskCause) => {
    setSelectedCauseForAnalysis(cause);
    setIsCauseAnalysisModalOpen(true);
  };

  const handleSaveCauseAnalysis = (updatedCause: RiskCause) => {
    onRiskCauseUpdated(updatedCause); // Notify parent to update its state and localStorage
    setIsCauseAnalysisModalOpen(false);
    setSelectedCauseForAnalysis(null);
  };

  if (!potentialRisk) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl"> {/* Increased width */}
          <DialogHeader>
            <DialogTitle>Analisis Penyebab Risiko untuk: {potentialRisk.description}</DialogTitle>
            <DialogDescription>
              Pilih penyebab risiko di bawah ini untuk melakukan analisis KRI, Toleransi, Probabilitas, dan Dampak.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {riskCauses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center">Belum ada penyebab yang teridentifikasi untuk potensi risiko ini.</p>
            ) : (
              <ScrollArea className="h-[60vh] border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[25%]">Deskripsi Penyebab</TableHead>
                      <TableHead>Sumber</TableHead>
                      <TableHead>KRI</TableHead>
                      <TableHead>Toleransi</TableHead>
                      <TableHead>Probabilitas</TableHead>
                      <TableHead>Dampak</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {riskCauses.map(cause => {
                      const causeRiskLevel = getRiskLevel(cause.likelihood, cause.impact);
                      return (
                        <TableRow key={cause.id}>
                          <TableCell className="font-medium text-xs max-w-[200px] truncate" title={cause.description}>{cause.description}</TableCell>
                          <TableCell className="text-xs"><Badge variant="outline">{cause.source}</Badge></TableCell>
                          <TableCell className="text-xs max-w-[150px] truncate" title={cause.keyRiskIndicator || ''}>{cause.keyRiskIndicator || 'N/A'}</TableCell>
                          <TableCell className="text-xs max-w-[150px] truncate" title={cause.riskTolerance || ''}>{cause.riskTolerance || 'N/A'}</TableCell>
                          <TableCell className="text-xs">
                            <Badge variant={cause.likelihood ? "outline" : "ghost"} className={!cause.likelihood ? "text-muted-foreground" : ""}>
                                {cause.likelihood || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge variant={cause.impact ? "outline" : "ghost"} className={!cause.impact ? "text-muted-foreground" : ""}>
                                {cause.impact || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge className={`${getRiskLevelColor(causeRiskLevel)}`}>
                                {causeRiskLevel}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="xs" onClick={() => handleOpenCauseAnalysis(cause)}>
                              <BarChart3 className="mr-1 h-3 w-3" /> Analisis
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </div>
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Tutup</Button>
          </div>
        </DialogContent>
      </Dialog>

      {selectedCauseForAnalysis && potentialRisk && (
        <RiskCauseAnalysisModal
          riskCause={selectedCauseForAnalysis}
          potentialRisk={potentialRisk}
          goalUprId={goalUprId}
          goalPeriod={goalPeriod}
          isOpen={isCauseAnalysisModalOpen}
          onOpenChange={(open) => {
            setIsCauseAnalysisModalOpen(open);
            if (!open) setSelectedCauseForAnalysis(null);
          }}
          onSave={handleSaveCauseAnalysis}
        />
      )}
    </>
  );
}
