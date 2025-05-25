
"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Wand2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { brainstormRiskCausesAction } from '@/app/actions';
import type { PotentialRisk, RiskSource, RiskCategory } from '@/lib/types';

interface SuggestedCause {
  description: string;
  source: RiskSource | null;
}

interface BrainstormCausesContextModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  potentialRisk: PotentialRisk;
  goalDescription: string; // Parent goal's description
  onSuggestionsReady: (suggestions: SuggestedCause[]) => void;
}

export function BrainstormCausesContextModal({
  isOpen,
  onOpenChange,
  potentialRisk,
  goalDescription,
  onSuggestionsReady,
}: BrainstormCausesContextModalProps) {
  const [contextualPotentialRiskDescription, setContextualPotentialRiskDescription] = useState(potentialRisk.description);
  const [desiredCount, setDesiredCount] = useState<number | undefined>(3); // Default to 3-5 causes
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleBrainstorm = async () => {
    if (!contextualPotentialRiskDescription.trim()) {
      toast({ title: "Deskripsi Potensi Risiko Kosong", description: "Mohon isi deskripsi potensi risiko untuk AI.", variant: "destructive" });
      return;
    }
    if (desiredCount !== undefined && (desiredCount <= 0 || desiredCount > 7)) { // Limit to a reasonable number
      toast({ title: "Jumlah Tidak Valid", description: "Jumlah saran penyebab risiko harus antara 1 dan 7.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const result = await brainstormRiskCausesAction({ 
        potentialRiskDescription: contextualPotentialRiskDescription,
        potentialRiskCategory: potentialRisk.category,
        goalDescription: goalDescription,
        desiredCount: desiredCount 
      });
      if (result.success && result.data && result.data.suggestedCauses) {
        onSuggestionsReady(result.data.suggestedCauses);
        onOpenChange(false); // Close this modal
      } else {
        toast({
          title: "Brainstorming Penyebab Gagal",
          description: result.error || "Terjadi kesalahan saat AI melakukan brainstorming penyebab.",
          variant: "destructive",
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga.";
      toast({
        title: "Kesalahan",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Brainstorm Penyebab Risiko dengan AI (Fishbone)</DialogTitle>
          <DialogDescription>
            Sempurnakan konteks potensi risiko dan tentukan jumlah saran penyebab yang diinginkan.
            <br/>
            Potensi Risiko: <span className="font-semibold">{potentialRisk.description}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="aiCauseContextPotentialRisk">Konteks Potensi Risiko untuk AI</Label>
            <Textarea
              id="aiCauseContextPotentialRisk"
              value={contextualPotentialRiskDescription}
              onChange={(e) => setContextualPotentialRiskDescription(e.target.value)}
              rows={3}
              placeholder="Deskripsi potensi risiko yang akan dianalisis penyebabnya..."
              disabled={isLoading}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desiredCauseCount">Jumlah Saran Penyebab yang Diinginkan (1-7)</Label>
            <Input
              id="desiredCauseCount"
              type="number"
              value={desiredCount === undefined ? '' : desiredCount}
              onChange={(e) => {
                const val = e.target.value;
                setDesiredCount(val === '' ? undefined : parseInt(val, 10));
              }}
              min="1"
              max="7"
              placeholder="Contoh: 3"
              disabled={isLoading}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Batal
          </Button>
          <Button type="button" onClick={handleBrainstorm} disabled={isLoading || !contextualPotentialRiskDescription.trim()}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            Lanjutkan Brainstorm Penyebab
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
