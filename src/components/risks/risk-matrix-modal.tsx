
"use client";

import React from 'react';
import {
  Dialog as ShadCnDialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CalculatedRiskLevelCategory } from '@/lib/types'; // Import this

interface RiskMatrixModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const likelihoodLabels: { [key: number]: string } = {
  5: "Hampir pasti terjadi (5)",
  4: "Sering terjadi (4)",
  3: "Kadang terjadi (3)",
  2: "Jarang terjadi (2)",
  1: "Hampir tidak terjadi (1)",
};

const impactLabels: { [key: number]: string } = {
  1: "Tidak Signifikan (1)",
  2: "Minor (2)",
  3: "Moderat (3)",
  4: "Signifikan (4)",
  5: "Sangat Signifikan (5)",
};

const matrixData: Array<{ likelihood: number; impact: number; score: number; level: CalculatedRiskLevelCategory }> = [
  // Likelihood 5
  { likelihood: 5, impact: 1, score: 5, level: "Sangat Rendah" },
  { likelihood: 5, impact: 2, score: 10, level: "Rendah" },
  { likelihood: 5, impact: 3, score: 15, level: "Sedang" },
  { likelihood: 5, impact: 4, score: 20, level: "Sangat Tinggi" },
  { likelihood: 5, impact: 5, score: 25, level: "Sangat Tinggi" },
  // Likelihood 4
  { likelihood: 4, impact: 1, score: 4, level: "Sangat Rendah" },
  { likelihood: 4, impact: 2, score: 8, level: "Rendah" },
  { likelihood: 4, impact: 3, score: 12, level: "Sedang" },
  { likelihood: 4, impact: 4, score: 16, level: "Tinggi" },
  { likelihood: 4, impact: 5, score: 20, level: "Sangat Tinggi" },
  // Likelihood 3
  { likelihood: 3, impact: 1, score: 3, level: "Sangat Rendah" },
  { likelihood: 3, impact: 2, score: 6, level: "Rendah" },
  { likelihood: 3, impact: 3, score: 9, level: "Rendah" },
  { likelihood: 3, impact: 4, score: 12, level: "Sedang" },
  { likelihood: 3, impact: 5, score: 15, level: "Sedang" },
  // Likelihood 2
  { likelihood: 2, impact: 1, score: 2, level: "Sangat Rendah" },
  { likelihood: 2, impact: 2, score: 4, level: "Sangat Rendah" },
  { likelihood: 2, impact: 3, score: 6, level: "Rendah" },
  { likelihood: 2, impact: 4, score: 8, level: "Rendah" },
  { likelihood: 2, impact: 5, score: 10, level: "Rendah" },
  // Likelihood 1
  { likelihood: 1, impact: 1, score: 1, level: "Sangat Rendah" },
  { likelihood: 1, impact: 2, score: 2, level: "Sangat Rendah" },
  { likelihood: 1, impact: 3, score: 3, level: "Sangat Rendah" },
  { likelihood: 1, impact: 4, score: 4, level: "Sangat Rendah" },
  { likelihood: 1, impact: 5, score: 5, level: "Sangat Rendah" },
];


const getRiskLevelColorClass = (level: CalculatedRiskLevelCategory): string => {
  switch (level.toLowerCase()) {
    case "sangat tinggi": return "bg-red-600 text-white";
    case "tinggi": return "bg-orange-500 text-white";
    case "sedang": return "bg-yellow-400 text-black";
    case "rendah": return "bg-blue-500 text-white"; 
    case "sangat rendah": return "bg-green-500 text-white";
    default: return "bg-gray-200 text-gray-800";
  }
};

export function RiskMatrixModal({ isOpen, onOpenChange }: RiskMatrixModalProps) {
  return (
    <ShadCnDialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-3 sm:p-4"> 
        <DialogHeader>
          <DialogTitle>Matriks Profil Risiko (Heatmap)</DialogTitle>
          <DialogDescription className="text-[10px] sm:text-xs">
            Panduan visual untuk menentukan level risiko.
          </DialogDescription>
        </DialogHeader>
        <div className="py-1 grid grid-cols-1 md:grid-cols-[auto,1fr] gap-1 sm:gap-2 items-start">
          <div 
            className="md:w-10 shrink-0 text-[8px] sm:text-[9px] font-medium text-center self-stretch flex items-center justify-center transform md:-rotate-90 md:origin-center whitespace-nowrap md:-ml-2 md:mr-0.5">
            Kemungkinan
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full border-collapse table-fixed text-[10px] sm:text-xs">
              <thead>
                <tr>
                  <th className="p-0.5 sm:p-1 border border-muted w-10 h-8 sm:h-10"></th> {/* Adjusted padding and height */}
                  {Object.values(impactLabels).map(label => (
                    <th key={label} className="p-0.5 sm:p-1 border border-muted font-semibold h-8 sm:h-10 break-words leading-tight align-bottom w-[18%] text-[8px] sm:text-[10px]">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.keys(likelihoodLabels).map(lkKeyStr => parseInt(lkKeyStr)).reverse().map(lkKey => {
                  return (
                    <tr key={lkKey} className="h-8 sm:h-10">
                      <td className="p-0.5 sm:p-1 border border-muted font-semibold w-10 leading-tight align-middle text-[8px] sm:text-[10px]">{likelihoodLabels[lkKey]}</td>
                      {Array.from({ length: 5 }, (_, i) => i + 1).map(imKey => {
                        const cell = matrixData.find(d => d.likelihood === lkKey && d.impact === imKey);
                        return (
                          <td key={`${lkKey}-${imKey}`} className={`p-0.5 sm:p-1 border border-muted text-center font-bold h-8 sm:h-10 ${cell ? getRiskLevelColorClass(cell.level) : 'bg-gray-100'}`}>
                            {cell ? cell.score : ''}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                  <tr>
                    <td/>
                    <td className="p-0.5 sm:p-1 pt-1 sm:pt-2 border-t border-muted text-center font-medium h-8 sm:h-10 leading-tight text-[8px] sm:text-[10px]" colSpan={5}>Dampak Risiko</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
         <div className="mt-1 sm:mt-2 pl-10 md:pl-12">
            <h3 className="font-semibold text-[9px] sm:text-[10px] mb-0.5">Keterangan Level Risiko (Skor):</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-1 gap-y-0.5 text-[8px] sm:text-[9px]">
              {[
                {level: "Sangat Tinggi" as CalculatedRiskLevelCategory, range: "(20-25)"},
                {level: "Tinggi" as CalculatedRiskLevelCategory, range: "(16-19)"},
                {level: "Sedang" as CalculatedRiskLevelCategory, range: "(12-15)"},
                {level: "Rendah" as CalculatedRiskLevelCategory, range: "(6-11)"},
                {level: "Sangat Rendah" as CalculatedRiskLevelCategory, range: "(1-5)"},
              ].map(item => (
                <div key={item.level} className="flex items-center space-x-1">
                  <Badge className={`${getRiskLevelColorClass(item.level)} min-w-[80px] justify-center text-[8px] px-1 py-0 h-4 leading-none`}>{item.level}</Badge>
                  <span className="text-muted-foreground">{item.range}</span>
                </div>
              ))}
            </div>
        </div>
        <DialogFooter className="mt-2 sm:mt-3">
          <Button onClick={() => onOpenChange(false)} size="sm">Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </ShadCnDialog>
  );
}
