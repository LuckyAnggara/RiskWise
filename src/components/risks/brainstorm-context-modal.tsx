
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
import { brainstormPotentialRisksAction } from '@/app/actions';
import type { RiskCategory } from '@/lib/types';

interface BrainstormContextModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialContext: string;
  onSuggestionsReady: (suggestions: Array<{ description: string; category: RiskCategory | null }>) => void;
  goalUprId: string;
  goalPeriod: string;
}

export function BrainstormContextModal({
  isOpen,
  onOpenChange,
  initialContext,
  onSuggestionsReady,
  goalUprId,
  goalPeriod,
}: BrainstormContextModalProps) {
  const [context, setContext] = useState(initialContext);
  const [desiredCount, setDesiredCount] = useState<number | undefined>(5);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleBrainstorm = async () => {
    if (!context.trim()) {
      toast({ title: "Konteks Kosong", description: "Mohon isi konteks sasaran untuk AI.", variant: "destructive" });
      return;
    }
    if (desiredCount !== undefined && (desiredCount <= 0 || desiredCount > 10)) {
      toast({ title: "Jumlah Tidak Valid", description: "Jumlah potensi risiko harus antara 1 dan 10.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const result = await brainstormPotentialRisksAction({ 
        goalDescription: context, 
        desiredCount: desiredCount 
      });
      if (result.success && result.data && result.data.potentialRisks) {
        onSuggestionsReady(result.data.potentialRisks);
        onOpenChange(false); // Close this modal
      } else {
        toast({
          title: "Brainstorming AI Gagal",
          description: result.error || "Terjadi kesalahan saat AI melakukan brainstorming.",
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
          <DialogTitle>Konteks Brainstorming Potensi Risiko</DialogTitle>
          <DialogDescription>
            Sempurnakan konteks sasaran dan tentukan jumlah potensi risiko yang ingin Anda hasilkan.
            Konteks saat ini: UPR {goalUprId}, Periode {goalPeriod}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="aiContext">Konteks Sasaran untuk AI</Label>
            <Textarea
              id="aiContext"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={5}
              placeholder="Jelaskan sasaran secara detail untuk hasil AI yang lebih baik..."
              disabled={isLoading}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desiredCount">Jumlah Potensi Risiko yang Diinginkan (1-10)</Label>
            <Input
              id="desiredCount"
              type="number"
              value={desiredCount === undefined ? '' : desiredCount}
              onChange={(e) => {
                const val = e.target.value;
                setDesiredCount(val === '' ? undefined : parseInt(val, 10));
              }}
              min="1"
              max="10"
              placeholder="Contoh: 5"
              disabled={isLoading}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Batal
          </Button>
          <Button type="button" onClick={handleBrainstorm} disabled={isLoading || !context.trim()}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            Lanjutkan ke Brainstorm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
