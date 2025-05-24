
"use client";

import type { PotentialRisk, Control, RiskCause, LikelihoodImpactLevel } from '@/lib/types';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, ShieldCheck, Edit, Trash2, Settings2, PlusCircle, Zap, ListChecks } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RiskListItemProps {
  potentialRisk: PotentialRisk;
  controls: Control[];
  riskCauses: RiskCause[];
  onAnalyze: (potentialRisk: PotentialRisk) => void;
  onAddControl: (potentialRisk: PotentialRisk) => void;
  onEditControl: (control: Control) => void;
  onDeletePotentialRisk: (potentialRiskId: string) => void;
  onDeleteControl: (controlId: string) => void;
  onManageCauses: (potentialRisk: PotentialRisk) => void; 
  onEditDetails: (potentialRiskId: string) => void;
}

const getRiskLevel = (likelihood: LikelihoodImpactLevel | null, impact: LikelihoodImpactLevel | null): string => {
  if (!likelihood || !impact) return 'N/A';
  const L = { 'Very Low': 1, 'Low': 2, 'Medium': 3, 'High': 4, 'Very High': 5 };
  const I = { 'Very Low': 1, 'Low': 2, 'Medium': 3, 'High': 4, 'Very High': 5 };
  const score = L[likelihood] * I[impact];

  if (score >= 20) return 'Kritis';
  if (score >= 12) return 'Tinggi';
  if (score >= 6) return 'Sedang';
  if (score >= 3) return 'Rendah';
  return 'Sangat Rendah';
};

const getRiskLevelColor = (level: string) => {
  switch (level.toLowerCase()) {
    case 'kritis': return 'bg-red-600 hover:bg-red-700';
    case 'tinggi': return 'bg-orange-500 hover:bg-orange-600';
    case 'sedang': return 'bg-yellow-400 hover:bg-yellow-500 text-black dark:bg-yellow-500 dark:text-black';
    case 'rendah': return 'bg-green-500 hover:bg-green-600';
    case 'sangat rendah': return 'bg-sky-500 hover:bg-sky-600';
    default: return 'bg-gray-400 hover:bg-gray-500';
  }
};

const getControlStatusColorClasses = (status: Control['status']) => {
  switch (status) {
    case 'Implemented':
      return "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700";
    case 'In Progress':
      return "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700";
    case 'Planned':
      return "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-700/50 dark:text-slate-300 dark:border-slate-600";
    case 'Ineffective':
      return "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700";
    default:
      return "border-transparent bg-secondary text-secondary-foreground";
  }
};

const getCauseSourceColorClasses = (source: RiskCause['source']) => {
  switch (source) {
    case 'Internal':
      return "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900/50 dark:text-sky-300 dark:border-sky-700";
    case 'Eksternal':
      return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-700";
    default:
      return "border-transparent bg-secondary text-secondary-foreground";
  }
};


export function RiskListItem({ 
  potentialRisk, 
  controls, 
  riskCauses,
  onAnalyze, 
  onAddControl, 
  onEditControl, 
  onDeletePotentialRisk, 
  onDeleteControl,
  onManageCauses,
  onEditDetails
}: RiskListItemProps) {
  const riskLevel = getRiskLevel(potentialRisk.likelihood, potentialRisk.impact);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{potentialRisk.description}</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Opsi risiko">
                <Settings2 className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEditDetails(potentialRisk.id)}> 
                <Edit className="mr-2 h-4 w-4" /> Edit Detail & Penyebab
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onManageCauses(potentialRisk)}>
                <Zap className="mr-2 h-4 w-4" /> Kelola Penyebab (Cepat)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAnalyze(potentialRisk)}>
                <BarChart3 className="mr-2 h-4 w-4" /> Analisis Level
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddControl(potentialRisk)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Tambah Kontrol
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDeletePotentialRisk(potentialRisk.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                <Trash2 className="mr-2 h-4 w-4" /> Hapus Potensi Risiko
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardDescription>
          <div className="text-xs text-muted-foreground space-y-1 mt-1">
            <div>
              <strong>Teridentifikasi:</strong> {new Date(potentialRisk.identifiedAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
            </div>
            <div className="flex flex-wrap gap-x-2 items-center">
              <div>
                <strong>Kategori:</strong> <Badge variant="secondary" className="text-xs font-normal">{potentialRisk.category || 'N/A'}</Badge>
              </div>
              <span className="text-muted-foreground/50">|</span>
              <div>
                <strong>Pemilik:</strong> <Badge variant="secondary" className="text-xs font-normal">{potentialRisk.owner || 'N/A'}</Badge>
              </div>
            </div>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center border p-2 rounded-md">
          <div>
            <span className="text-xs font-medium text-muted-foreground block">Probabilitas</span>
            <Badge variant={potentialRisk.likelihood ? "outline" : "outline"} className={`text-xs mt-1 ${!potentialRisk.likelihood ? "text-muted-foreground" : ""}`}>
              {potentialRisk.likelihood || 'Belum diatur'}
            </Badge>
          </div>
          <div>
            <span className="text-xs font-medium text-muted-foreground block">Dampak</span>
            <Badge variant={potentialRisk.impact ? "outline" : "outline"} className={`text-xs mt-1 ${!potentialRisk.impact ? "text-muted-foreground" : ""}`}>
              {potentialRisk.impact || 'Belum diatur'}
            </Badge>
          </div>
          <div>
            <span className="text-xs font-medium text-muted-foreground block">Level Risiko</span>
             <Badge className={`${getRiskLevelColor(riskLevel)} text-white text-xs mt-1`}>
                {riskLevel}
             </Badge>
          </div>
        </div>
        
        {riskCauses.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-1 flex items-center">
              <ListChecks className="h-4 w-4 mr-2 text-primary" />
              Potensi Penyebab ({riskCauses.length}):
            </h4>
            <div className="pl-1 space-y-1 max-h-24 overflow-y-auto scroll-smooth border-l-2 border-border ml-2">
              {riskCauses.slice(0, 3).map(cause => (
                <div key={cause.id} className="text-sm text-muted-foreground p-1.5 rounded hover:bg-muted/40 ml-2">
                  <span className="font-medium">{cause.description}</span>
                  <Badge className={`ml-2 text-xs font-normal ${getCauseSourceColorClasses(cause.source)}`}>{cause.source}</Badge>
                </div>
              ))}
              {riskCauses.length > 3 && <div className="text-xs text-muted-foreground pl-3 pt-1">...dan {riskCauses.length - 3} lainnya.</div>}
            </div>
             <Button variant="link" size="sm" className="p-0 h-auto mt-1.5 text-primary hover:underline" onClick={() => onManageCauses(potentialRisk)}>
                Lihat/Kelola Semua Penyebab
            </Button>
          </div>
        )}
        {riskCauses.length === 0 && (
             <Button variant="outline" size="sm" onClick={() => onManageCauses(potentialRisk)} className="w-full">
                <Zap className="mr-2 h-4 w-4" /> Tambah & Kelola Penyebab
            </Button>
        )}
        
        {controls.length > 0 && (
          <div className="mt-3">
            <h4 className="text-sm font-semibold mb-1 flex items-center">
                <ShieldCheck className="h-4 w-4 mr-2 text-primary" />
                Kontrol ({controls.length}):
            </h4>
            <div className="pl-1 space-y-1 max-h-24 overflow-y-auto scroll-smooth border-l-2 border-border ml-2">
              {controls.map(control => (
                <div key={control.id} className="text-sm text-muted-foreground p-1.5 rounded hover:bg-muted/40 group ml-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">{control.description}</span>
                      <Badge className={`ml-2 text-xs font-normal ${getControlStatusColorClasses(control.status)}`}>{control.status}</Badge>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <Button variant="ghost" size="icon-sm" onClick={() => onEditControl(control)} aria-label="Edit kontrol">
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                       <Button variant="ghost" size="icon-sm" onClick={() => onDeleteControl(control.id)} aria-label="Hapus kontrol">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        {controls.length === 0 && (
            <Button variant="outline" size="sm" onClick={() => onAddControl(potentialRisk)} className="w-full">
                <PlusCircle className="mr-2 h-4 w-4" /> Tambah Tindakan Kontrol
            </Button>
        )}
      </CardFooter>
    </Card>
  );
}
