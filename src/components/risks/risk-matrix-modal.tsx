
"use client";

import React from 'react';
import {
  Dialog as ShadCnDialog, // Aliased import
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface RiskMatrixModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const likelihoodLabels: { [key: number]: string } = {
  5: "Sangat Tinggi (5)",
  4: "Tinggi (4)",
  3: "Sedang (3)",
  2: "Rendah (2)",
  1: "Sangat Rendah (1)",
};

const impactLabels: { [key: number]: string } = {
  1: "Sangat Rendah (1)",
  2: "Rendah (2)",
  3: "Sedang (3)",
  4: "Tinggi (4)",
  5: "Sangat Tinggi (5)",
};

const matrixData = [
  // Likelihood 5 (Sangat Tinggi)
  { likelihood: 5, impact: 1, score: 5, level: "Sangat Rendah" },
  { likelihood: 5, impact: 2, score: 10, level: "Rendah" },
  { likelihood: 5, impact: 3, score: 15, level: "Sedang" },
  { likelihood: 5, impact: 4, score: 20, level: "Sangat Tinggi" },
  { likelihood: 5, impact: 5, score: 25, level: "Sangat Tinggi" },
  // Likelihood 4 (Tinggi)
  { likelihood: 4, impact: 1, score: 4, level: "Sangat Rendah" },
  { likelihood: 4, impact: 2, score: 8, level: "Rendah" },
  { likelihood: 4, impact: 3, score: 12, level: "Sedang" },
  { likelihood: 4, impact: 4, score: 16, level: "Tinggi" },
  { likelihood: 4, impact: 5, score: 20, level: "Sangat Tinggi" },
  // Likelihood 3 (Sedang)
  { likelihood: 3, impact: 1, score: 3, level: "Sangat Rendah" },
  { likelihood: 3, impact: 2, score: 6, level: "Rendah" },
  { likelihood: 3, impact: 3, score: 9, level: "Rendah" },
  { likelihood: 3, impact: 4, score: 12, level: "Sedang" },
  { likelihood: 3, impact: 5, score: 15, level: "Sedang" },
  // Likelihood 2 (Rendah)
  { likelihood: 2, impact: 1, score: 2, level: "Sangat Rendah" },
  { likelihood: 2, impact: 2, score: 4, level: "Sangat Rendah" },
  { likelihood: 2, impact: 3, score: 6, level: "Rendah" },
  { likelihood: 2, impact: 4, score: 8, level: "Rendah" },
  { likelihood: 2, impact: 5, score: 10, level: "Rendah" },
  // Likelihood 1 (Sangat Rendah)
  { likelihood: 1, impact: 1, score: 1, level: "Sangat Rendah" },
  { likelihood: 1, impact: 2, score: 2, level: "Sangat Rendah" },
  { likelihood: 1, impact: 3, score: 3, level: "Sangat Rendah" },
  { likelihood: 1, impact: 4, score: 4, level: "Sangat Rendah" },
  { likelihood: 1, impact: 5, score: 5, level: "Sangat Rendah" },
];


const getRiskLevelColorClass = (level: string): string => {
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
      <DialogContent className="max-w-3xl p-4">
        <DialogHeader>
          <DialogTitle>Matriks Profil Risiko (Heatmap)</DialogTitle>
          <DialogDescription className="text-xs">
            Panduan visual untuk menentukan level risiko.
          </DialogDescription>
        </DialogHeader>
        <div className="py-1 grid grid-cols-1 md:grid-cols-12 gap-2">
          <div className="md:col-span-8"> 
            <div className="flex items-stretch">
              <div 
                className="w-12 shrink-0 text-[9px] font-medium text-center self-stretch flex items-center justify-center transform -rotate-90 origin-center whitespace-nowrap -ml-3 mr-0.5">
                Probabilitas Risiko
              </div>
              <div className="flex-1">
                <table className="w-full border-collapse table-fixed">
                  <thead>
                    <tr>
                      <th className="p-1 border border-muted w-12 h-10"></th>
                      {Object.values(impactLabels).map(label => (
                        <th key={label} className="p-1 border border-muted text-[10px] font-semibold h-10 break-words leading-tight align-bottom w-[18%]">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(likelihoodLabels).reverse().map(lkKeyStr => {
                      const lkKey = parseInt(lkKeyStr);
                      return (
                        <tr key={lkKey} className="h-10">
                          <td className="p-1 border border-muted text-[10px] font-semibold w-12 leading-tight align-middle">{likelihoodLabels[lkKey]}</td>
                          {Array.from({ length: 5 }, (_, i) => i + 1).map(imKey => {
                            const cell = matrixData.find(d => d.likelihood === lkKey && d.impact === imKey);
                            return (
                              <td key={`${lkKey}-${imKey}`} className={`p-1 border border-muted text-center text-[12px] font-bold h-10 ${cell ? getRiskLevelColorClass(cell.level) : 'bg-gray-100'}`}>
                                {cell ? cell.score : ''}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                     <tr>
                        <td className="p-1 pt-2 border-t border-muted text-center font-medium text-[10px] h-10 leading-tight" colSpan={6}>Dampak Risiko</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="md:col-span-4 space-y-0.5 pl-1 md:pl-2">
            <h3 className="font-semibold text-[10px] mb-0.5">Keterangan Level:</h3>
            {[
              {level: "Sangat Tinggi", range: "(20-25)"},
              {level: "Tinggi", range: "(16-19)"},
              {level: "Sedang", range: "(12-15)"},
              {level: "Rendah", range: "(6-11)"},
              {level: "Sangat Rendah", range: "(1-5)"},
            ].map(item => (
              <div key={item.level} className="flex items-center space-x-1">
                <Badge className={`${getRiskLevelColorClass(item.level)} w-20 justify-center text-[8px] px-1 py-0 h-4 leading-none`}>{item.level}</Badge>
                <span className="text-[8px] text-muted-foreground">{item.range}</span>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter className="mt-1 sm:mt-2">
          <Button onClick={() => onOpenChange(false)} size="sm">Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </ShadCnDialog>
  );
}
