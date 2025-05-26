
"use client";

import type { PotentialRisk, RiskCause } from '@/lib/types';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Edit, Trash2, Settings2, PlusCircle, Zap, ListChecks, Copy, BarChart3 } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from 'next/navigation'; // Import useRouter

interface RiskListItemProps {
  potentialRisk: PotentialRisk;
  goalCode: string | undefined;
  riskCausesCount: number; 
  onEditDetails: (potentialRiskId: string) => void;
  onDeletePotentialRisk: (potentialRisk: PotentialRisk) => void;
  isSelected: boolean;
  onSelectRisk: (checked: boolean) => void;
  onDuplicateRisk: () => void;
  canDelete: boolean; // Added
}

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
  goalCode,
  riskCausesCount,
  onEditDetails, 
  onDeletePotentialRisk, 
  isSelected,
  onSelectRisk,
  onDuplicateRisk,
  canDelete
}: RiskListItemProps) {
  const router = useRouter();
  const displayGoalCode = goalCode || 'S?'; 
  const potentialRiskCodeDisplay = `${displayGoalCode}.PR${potentialRisk.sequenceNumber || '?'}`;

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between"> 
          <div className="flex items-center flex-grow min-w-0 mr-2 space-x-2"> 
             <Checkbox
              id={`select-risk-item-${potentialRisk.id}`}
              checked={isSelected}
              onCheckedChange={onSelectRisk}
              aria-label={`Pilih potensi risiko ${potentialRisk.description}`}
              disabled={!canDelete} // Disable if cannot delete (e.g., not logged in)
            />
            <CardTitle className="text-base font-semibold leading-tight truncate" title={potentialRisk.description}>
              {potentialRiskCodeDisplay} - {potentialRisk.description}
            </CardTitle>
          </div>

          <div className="flex-shrink-0"> 
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Opsi potensi risiko" className="h-8 w-8">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEditDetails(potentialRisk.id)}> 
                  <Edit className="mr-2 h-4 w-4" /> Edit Detail & Penyebab
                </DropdownMenuItem>
                 <DropdownMenuItem onClick={() => router.push(`/risk-analysis?potentialRiskId=${potentialRisk.id}`)}>
                    <BarChart3 className="mr-2 h-4 w-4" /> Analisis Semua Penyebab
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDuplicateRisk} disabled={!canDelete}>
                  <Copy className="mr-2 h-4 w-4" /> Duplikat Risiko
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDeletePotentialRisk(potentialRisk)} className="text-destructive focus:text-destructive focus:bg-destructive/10" disabled={!canDelete}>
                  <Trash2 className="mr-2 h-4 w-4" /> Hapus Potensi Risiko
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <CardDescription className="pt-1">
          <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
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
      <CardContent className="space-y-3 pt-2 pb-3 flex-grow">
        
        <div>
            <h4 className="text-sm font-semibold mb-1 flex items-center">
                <ListChecks className="h-4 w-4 mr-2 text-primary" />
                Potensi Penyebab: <Badge variant="outline" className="ml-1">{riskCausesCount}</Badge>
            </h4>
            {riskCausesCount > 0 ? (
                 <Button variant="link" size="sm" className="p-0 h-auto mt-1.5 text-primary hover:underline text-xs" onClick={() => onEditDetails(potentialRisk.id)}>
                    Lihat/Kelola Semua Penyebab
                </Button>
            ) : (
                <p className="text-xs text-muted-foreground italic">Belum ada penyebab teridentifikasi.</p>
            )}
        </div>
      </CardContent>
      <CardFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={() => onEditDetails(potentialRisk.id)} className="w-full text-xs">
            <Zap className="mr-2 h-3 w-3" /> Kelola Detail & Penyebab
          </Button>
      </CardFooter>
    </Card>
  );
}
