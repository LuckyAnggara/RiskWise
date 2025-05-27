
"use client";

import type { PotentialRisk } from '@/lib/types'; // Removed RiskCause as it's not directly used for display here
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Trash2, Settings2, PlusCircle, Zap, Copy, BarChart3, Loader2 } from 'lucide-react'; // Added Loader2
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from 'next/navigation';

interface RiskListItemProps {
  potentialRisk: PotentialRisk;
  goalCode: string | undefined;
  riskCausesCount: number; 
  onEditDetails: (potentialRiskId: string) => void;
  onDeletePotentialRisk: (potentialRisk: PotentialRisk) => void;
  isSelected: boolean;
  onSelectRisk: (checked: boolean) => void;
  onDuplicateRisk: () => void; // Changed to not take ID, as it's known from potentialRisk prop
  canDelete: boolean;
  isDeleting?: boolean; // New prop to indicate if this specific card is being deleted
}

export function RiskListItem({ 
  potentialRisk, 
  goalCode,
  riskCausesCount,
  onEditDetails, 
  onDeletePotentialRisk, 
  isSelected,
  onSelectRisk,
  onDuplicateRisk,
  canDelete,
  isDeleting
}: RiskListItemProps) {
  const router = useRouter();
  const displayGoalCode = goalCode || 'S?'; 
  const potentialRiskCodeDisplay = `${displayGoalCode}.PR${potentialRisk.sequenceNumber || '?'}`;
  const returnPath = `/risks/${potentialRisk.goalId}`;


  return (
    <Card className={`flex flex-col h-full relative ${isDeleting ? "opacity-50 pointer-events-none" : ""}`}>
      {isDeleting && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10 rounded-lg">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between"> 
          <div className="flex items-center flex-grow min-w-0 mr-2 space-x-2"> 
             <Checkbox
              id={`select-risk-item-${potentialRisk.id}`}
              checked={isSelected}
              onCheckedChange={onSelectRisk}
              aria-label={`Pilih potensi risiko ${potentialRisk.description}`}
              disabled={!canDelete || isDeleting}
            />
            <CardTitle className="text-base font-semibold leading-tight truncate" title={potentialRisk.description}>
              {potentialRiskCodeDisplay} - {potentialRisk.description}
            </CardTitle>
          </div>

          <div className="flex-shrink-0"> 
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Opsi potensi risiko" className="h-8 w-8" disabled={!canDelete || isDeleting}>
                  <Settings2 className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEditDetails(potentialRisk.id)} disabled={isDeleting}> 
                  <Edit className="mr-2 h-4 w-4" /> Edit Detail & Penyebab
                </DropdownMenuItem>
                 <DropdownMenuItem onClick={() => router.push(`/risk-analysis?potentialRiskId=${potentialRisk.id}&from=${encodeURIComponent(returnPath)}`)} disabled={isDeleting}>
                    <BarChart3 className="mr-2 h-4 w-4" /> Analisis Semua Penyebab
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDuplicateRisk} disabled={!canDelete || isDeleting}>
                  <Copy className="mr-2 h-4 w-4" /> Duplikat Risiko
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDeletePotentialRisk(potentialRisk)} className="text-destructive focus:text-destructive focus:bg-destructive/10" disabled={!canDelete || isDeleting}>
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
                <Zap className="h-4 w-4 mr-2 text-primary" />
                Penyebab Risiko: <Badge variant="outline" className="ml-1">{riskCausesCount}</Badge>
            </h4>
            {riskCausesCount > 0 ? (
                 <Button variant="link" size="sm" className="p-0 h-auto mt-1.5 text-primary hover:underline text-xs" onClick={() => onEditDetails(potentialRisk.id)} disabled={isDeleting}>
                    Lihat/Kelola Semua Penyebab
                </Button>
            ) : (
                <p className="text-xs text-muted-foreground italic">Belum ada penyebab teridentifikasi.</p>
            )}
        </div>
      </CardContent>
      <CardFooter className="pt-2 pb-3">
          <Button variant="outline" size="sm" onClick={() => onEditDetails(potentialRisk.id)} className="w-full text-xs" disabled={isDeleting}>
            <Edit className="mr-2 h-3 w-3" /> Kelola Detail & Penyebab
          </Button>
      </CardFooter>
    </Card>
  );
}


    