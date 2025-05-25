
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { RiskCause, RiskSource } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { Badge } from '@/components/ui/badge';

interface AISuggestedCause {
  description: string;
  source: RiskSource | null;
}

interface BrainstormCausesSuggestionsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  suggestions: AISuggestedCause[];
  potentialRiskId: string;
  existingCausesCount: number;
  onSaveSelectedCauses: (newCauses: RiskCause[]) => void;
}

export function BrainstormCausesSuggestionsModal({
  isOpen,
  onOpenChange,
  suggestions,
  potentialRiskId,
  existingCausesCount,
  onSaveSelectedCauses,
}: BrainstormCausesSuggestionsModalProps) {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      // Automatically select all suggestions by default
      setSelectedIndices(suggestions.map((_, index) => index));
    }
  }, [isOpen, suggestions]);

  const handleToggleSelection = (index: number) => {
    setSelectedIndices(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleSave = () => {
    if (selectedIndices.length === 0) {
      toast({ title: "Tidak Ada Pilihan", description: "Mohon pilih setidaknya satu saran penyebab risiko untuk disimpan.", variant: "destructive" });
      return;
    }

    let currentSequence = existingCausesCount;
    const newRiskCauses: RiskCause[] = selectedIndices.map(index => {
      currentSequence++;
      const suggestion = suggestions[index];
      return {
        id: `rcause_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        potentialRiskId: potentialRiskId,
        description: suggestion.description,
        source: suggestion.source || "Internal", // Default to Internal if AI doesn't specify
        keyRiskIndicator: null,
        riskTolerance: null,
        likelihood: null,
        impact: null,
        createdAt: new Date().toISOString(),
        sequenceNumber: currentSequence,
      };
    });
    
    onSaveSelectedCauses(newRiskCauses);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        // setSelectedIndices([]); // Optionally reset selections if modal is closed without saving
      }
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Saran Penyebab Risiko dari AI</DialogTitle>
          <DialogDescription>
            Pilih saran penyebab risiko yang ingin Anda simpan dari daftar AI di bawah ini.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {suggestions.length === 0 ? (
            <p className="text-center text-muted-foreground">AI tidak memberikan saran penyebab risiko.</p>
          ) : (
            <ScrollArea className="h-[300px] w-full rounded-md border p-4">
              <div className="space-y-3">
                {suggestions.map((suggestion, index) => (
                  <div key={index} className="flex items-start space-x-3 rounded-md p-2 hover:bg-muted/50 transition-colors">
                    <Checkbox
                      id={`cause-suggestion-${index}`}
                      checked={selectedIndices.includes(index)}
                      onCheckedChange={() => handleToggleSelection(index)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <Label htmlFor={`cause-suggestion-${index}`} className="text-sm font-normal cursor-pointer">
                        {suggestion.description}
                      </Label>
                      {suggestion.source && (
                        <Badge variant="outline" className="ml-2 text-xs mt-0.5">{suggestion.source}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button type="button" onClick={handleSave} disabled={suggestions.length === 0 || selectedIndices.length === 0}>
            Simpan Penyebab Terpilih ({selectedIndices.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
