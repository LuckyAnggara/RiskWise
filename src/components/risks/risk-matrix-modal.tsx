
"use client";

import React from 'react';
import {
  Dialog,
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
  5: "Hampir Pasti Terjadi (5)",
  4: "Sering Terjadi (4)",
  3: "Kadang Terjadi (3)",
  2: "Jarang Terjadi (2)",
  1: "Hampir Tidak Terjadi (1)",
};

const impactLabels: { [key: number]: string } = {
  1: "Tidak Signifikan (1)",
  2: "Minor (2)",
  3: "Moderat (3)",
  4: "Signifikan (4)",
  5: "Sangat Signifikan (5)",
};

const matrixData = [
  // Likelihood 5 (Hampir Pasti Terjadi)
  { likelihood: 5, impact: 1, score: 9, level: "Rendah" },
  { likelihood: 5, impact: 2, score: 15, level: "Sedang" },
  { likelihood: 5, impact: 3, score: 18, level: "Tinggi" },
  { likelihood: 5, impact: 4, score: 23, level: "Sangat Tinggi" },
  { likelihood: 5, impact: 5, score: 25, level: "Sangat Tinggi" },
  // Likelihood 4 (Sering Terjadi)
  { likelihood: 4, impact: 1, score: 6, level: "Rendah" },
  { likelihood: 4, impact: 2, score: 12, level: "Sedang" },
  { likelihood: 4, impact: 3, score: 16, level: "Tinggi" },
  { likelihood: 4, impact: 4, score: 19, level: "Tinggi" },
  { likelihood: 4, impact: 5, score: 24, level: "Sangat Tinggi" },
  // Likelihood 3 (Kadang Terjadi)
  { likelihood: 3, impact: 1, score: 4, level: "Sangat Rendah" },
  { likelihood: 3, impact: 2, score: 10, level: "Rendah" },
  { likelihood: 3, impact: 3, score: 14, level: "Sedang" },
  { likelihood: 3, impact: 4, score: 17, level: "Tinggi" },
  { likelihood: 3, impact: 5, score: 22, level: "Sangat Tinggi" },
  // Likelihood 2 (Jarang Terjadi)
  { likelihood: 2, impact: 1, score: 2, level: "Sangat Rendah" },
  { likelihood: 2, impact: 2, score: 7, level: "Rendah" },
  { likelihood: 2, impact: 3, score: 11, level: "Rendah" },
  { likelihood: 2, impact: 4, score: 13, level: "Sedang" },
  { likelihood: 2, impact: 5, score: 21, level: "Sangat Tinggi" },
  // Likelihood 1 (Hampir Tidak Terjadi)
  { likelihood: 1, impact: 1, score: 1, level: "Sangat Rendah" },
  { likelihood: 1, impact: 2, score: 3, level: "Sangat Rendah" },
  { likelihood: 1, impact: 3, score: 5, level: "Sangat Rendah" },
  { likelihood: 1, impact: 4, score: 8, level: "Rendah" },
  { likelihood: 1, impact: 5, score: 20, level: "Sangat Tinggi" },
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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Matriks Profil Risiko (Heatmap)</DialogTitle>
          <DialogDescription>
            Panduan visual untuk menentukan level risiko berdasarkan probabilitas dan dampak.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="flex">
              <div className="w-32 text-sm font-medium text-center self-end pb-2 pr-1 transform -rotate-90 origin-bottom-left -translate-x-full ml-8">Kemungkinan Risiko</div>
              <div className="flex-1">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="p-1 border border-muted w-32"></th> {/* Corner cell */}
                      {Object.values(impactLabels).map(label => (
                        <th key={label} className="p-1 border border-muted text-xs font-medium h-16 break-words w-1/5">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(likelihoodLabels).reverse().map(lkKeyStr => {
                      const lkKey = parseInt(lkKeyStr);
                      return (
                        <tr key={lkKey}>
                          <td className="p-1 border border-muted text-xs font-medium w-32 h-12">{likelihoodLabels[lkKey]}</td>
                          {Array.from({ length: 5 }, (_, i) => i + 1).map(imKey => {
                            const cell = matrixData.find(d => d.likelihood === lkKey && d.impact === imKey);
                            return (
                              <td key={`${lkKey}-${imKey}`} className={`p-1 border border-muted text-center text-xs font-semibold h-12 ${cell ? getRiskLevelColorClass(cell.level) : 'bg-gray-100'}`}>
                                {cell ? cell.score : ''}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                     <tr>
                        <td className="p-1 border-muted text-center font-medium text-sm h-16" colSpan={6}>Dampak Risiko</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="md:col-span-1 space-y-2">
            <h3 className="font-semibold">Keterangan:</h3>
            <div className="flex items-center space-x-2">
              <Badge className={`${getRiskLevelColorClass("Sangat Tinggi")} w-24 justify-center`}>Sangat Tinggi</Badge>
              <span className="text-xs text-muted-foreground">(20-25)</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={`${getRiskLevelColorClass("Tinggi")} w-24 justify-center`}>Tinggi</Badge>
              <span className="text-xs text-muted-foreground">(16-19)</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={`${getRiskLevelColorClass("Sedang")} w-24 justify-center`}>Sedang</Badge>
              <span className="text-xs text-muted-foreground">(12-15)</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={`${getRiskLevelColorClass("Rendah")} w-24 justify-center`}>Rendah</Badge>
              <span className="text-xs text-muted-foreground">(6-11)</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={`${getRiskLevelColorClass("Sangat Rendah")} w-24 justify-center`}>Sangat Rendah</Badge>
              <span className="text-xs text-muted-foreground">(1-5)</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

