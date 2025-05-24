
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
  5: "Sangat Tinggi (5)", // Updated from "Hampir Pasti Terjadi"
  4: "Tinggi (4)",      // Updated from "Sering Terjadi"
  3: "Sedang (3)",        // Updated from "Kadang Terjadi"
  2: "Rendah (2)",        // Updated from "Jarang Terjadi"
  1: "Sangat Rendah (1)", // Updated from "Hampir Tidak Terjadi"
};

const impactLabels: { [key: number]: string } = {
  1: "Sangat Rendah (1)", // Updated from "Tidak Signifikan"
  2: "Rendah (2)",        // Updated from "Minor"
  3: "Sedang (3)",        // Updated from "Moderat"
  4: "Signifikan (4)",    // Kept as "Signifikan" - assuming this is a specific term
  5: "Sangat Signifikan (5)",
};

// Matrix data based on the provided image (Likelihood x Impact = Score -> Level)
// Assuming standard 5x5 matrix multiplication for score, then mapping to levels.
// Levels: Sangat Rendah (1-5), Rendah (6-11), Sedang (12-15), Tinggi (16-19), Sangat Tinggi (20-25)
const matrixData = [
  // Likelihood 5 (Sangat Tinggi)
  { likelihood: 5, impact: 1, score: 5, level: "Sangat Rendah" }, // ST * SR = 5*1=5
  { likelihood: 5, impact: 2, score: 10, level: "Rendah" },        // ST * R  = 5*2=10
  { likelihood: 5, impact: 3, score: 15, level: "Sedang" },       // ST * S  = 5*3=15
  { likelihood: 5, impact: 4, score: 20, level: "Sangat Tinggi" },// ST * T  = 5*4=20
  { likelihood: 5, impact: 5, score: 25, level: "Sangat Tinggi" },// ST * ST = 5*5=25
  // Likelihood 4 (Tinggi)
  { likelihood: 4, impact: 1, score: 4, level: "Sangat Rendah" }, // T * SR = 4*1=4
  { likelihood: 4, impact: 2, score: 8, level: "Rendah" },        // T * R  = 4*2=8
  { likelihood: 4, impact: 3, score: 12, level: "Sedang" },       // T * S  = 4*3=12
  { likelihood: 4, impact: 4, score: 16, level: "Tinggi" },       // T * T  = 4*4=16
  { likelihood: 4, impact: 5, score: 20, level: "Sangat Tinggi" },// T * ST = 4*5=20
  // Likelihood 3 (Sedang)
  { likelihood: 3, impact: 1, score: 3, level: "Sangat Rendah" }, // S * SR = 3*1=3
  { likelihood: 3, impact: 2, score: 6, level: "Rendah" },        // S * R  = 3*2=6
  { likelihood: 3, impact: 3, score: 9, level: "Rendah" },       // S * S  = 3*3=9
  { likelihood: 3, impact: 4, score: 12, level: "Sedang" },       // S * T  = 3*4=12
  { likelihood: 3, impact: 5, score: 15, level: "Sedang" },    // S * ST = 3*5=15
  // Likelihood 2 (Rendah)
  { likelihood: 2, impact: 1, score: 2, level: "Sangat Rendah" }, // R * SR = 2*1=2
  { likelihood: 2, impact: 2, score: 4, level: "Sangat Rendah" }, // R * R  = 2*2=4
  { likelihood: 2, impact: 3, score: 6, level: "Rendah" },        // R * S  = 2*3=6
  { likelihood: 2, impact: 4, score: 8, level: "Rendah" },       // R * T  = 2*4=8
  { likelihood: 2, impact: 5, score: 10, level: "Rendah" },    // R * ST = 2*5=10
  // Likelihood 1 (Sangat Rendah)
  { likelihood: 1, impact: 1, score: 1, level: "Sangat Rendah" }, // SR * SR = 1*1=1
  { likelihood: 1, impact: 2, score: 2, level: "Sangat Rendah" }, // SR * R  = 1*2=2
  { likelihood: 1, impact: 3, score: 3, level: "Sangat Rendah" }, // SR * S  = 1*3=3
  { likelihood: 1, impact: 4, score: 4, level: "Sangat Rendah" }, // SR * T  = 1*4=4
  { likelihood: 1, impact: 5, score: 5, level: "Sangat Rendah" }, // SR * ST = 1*5=5
];


const getRiskLevelColorClass = (level: string): string => {
  switch (level.toLowerCase()) {
    case "sangat tinggi": return "bg-red-600 text-white";
    case "tinggi": return "bg-orange-500 text-white";
    case "sedang": return "bg-yellow-400 text-black";
    case "rendah": return "bg-blue-500 text-white"; // Using blue for 'Rendah' as per common matrices
    case "sangat rendah": return "bg-green-500 text-white";
    default: return "bg-gray-200 text-gray-800";
  }
};

export function RiskMatrixModal({ isOpen, onOpenChange }: RiskMatrixModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl"> {/* Max width can be adjusted if needed */}
        <DialogHeader>
          <DialogTitle>Matriks Profil Risiko (Heatmap)</DialogTitle>
          <DialogDescription>
            Panduan visual untuk menentukan level risiko berdasarkan probabilitas dan dampak.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 overflow-x-auto"> {/* Added overflow-x-auto for smaller screens */}
            <div className="flex items-start"> {/* Changed to items-start for better alignment of rotated label */}
              <div className="w-28 shrink-0 text-xs font-medium text-center self-center transform -rotate-90 origin-center whitespace-nowrap -ml-8 mr-1"> {/* Adjusted width, margin, origin for better fit */}
                Probabilitas Risiko 
              </div>
              <div className="flex-1 min-w-[400px]"> {/* Added min-width to encourage scrolling */}
                <table className="w-full border-collapse table-fixed"> {/* Added table-fixed for more predictable column widths */}
                  <thead>
                    <tr>
                      <th className="px-0.5 py-1 border border-muted w-[60px]"></th> {/* Corner cell, reduced padding */}
                      {Object.values(impactLabels).map(label => (
                        <th key={label} className="px-0.5 py-1 border border-muted text-xs font-medium h-12 break-words w-1/5 leading-tight">{label}</th> // Reduced padding, height, added leading-tight
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(likelihoodLabels).reverse().map(lkKeyStr => {
                      const lkKey = parseInt(lkKeyStr);
                      return (
                        <tr key={lkKey}>
                          <td className="px-0.5 py-1 border border-muted text-xs font-medium h-10 w-[60px] leading-tight">{likelihoodLabels[lkKey]}</td> {/* Reduced padding, height, added leading-tight */}
                          {Array.from({ length: 5 }, (_, i) => i + 1).map(imKey => {
                            const cell = matrixData.find(d => d.likelihood === lkKey && d.impact === imKey);
                            return (
                              <td key={`${lkKey}-${imKey}`} className={`p-0.5 border border-muted text-center text-xs font-semibold h-10 ${cell ? getRiskLevelColorClass(cell.level) : 'bg-gray-100'}`}> {/* Reduced padding & height */}
                                {cell ? cell.score : ''}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                     <tr>
                        <td className="px-0.5 py-1 border-t border-muted text-center font-medium text-sm h-12" colSpan={6}>Dampak Risiko</td> {/* Reduced padding, height */}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="md:col-span-1 space-y-1.5"> {/* Reduced space-y */}
            <h3 className="font-semibold text-sm">Keterangan Level Risiko:</h3>
            <div className="flex items-center space-x-2">
              <Badge className={`${getRiskLevelColorClass("Sangat Tinggi")} w-28 justify-center text-xs px-1 py-0.5`}>Sangat Tinggi</Badge> {/* Adjusted badge class for size */}
              <span className="text-xs text-muted-foreground">(20-25)</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={`${getRiskLevelColorClass("Tinggi")} w-28 justify-center text-xs px-1 py-0.5`}>Tinggi</Badge>
              <span className="text-xs text-muted-foreground">(16-19)</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={`${getRiskLevelColorClass("Sedang")} w-28 justify-center text-xs px-1 py-0.5`}>Sedang</Badge>
              <span className="text-xs text-muted-foreground">(12-15)</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={`${getRiskLevelColorClass("Rendah")} w-28 justify-center text-xs px-1 py-0.5`}>Rendah</Badge>
              <span className="text-xs text-muted-foreground">(6-11)</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={`${getRiskLevelColorClass("Sangat Rendah")} w-28 justify-center text-xs px-1 py-0.5`}>Sangat Rendah</Badge>
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

