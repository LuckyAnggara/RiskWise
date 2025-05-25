
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
import type { PotentialRisk, RiskCategory } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { Badge } from '@/components/ui/badge';

interface SuggestionItem {
  description: string;
  category: RiskCategory | null;
}

interface BrainstormSuggestionsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  suggestions: SuggestionItem[];
  goalId: string;
  existingPotentialRisksCount: number;
  onSaveSelectedRisks: (newRisks: PotentialRisk[]) => void;
}

export function BrainstormSuggestionsModal({
  isOpen,
  onOpenChange,
  suggestions,
  goalId,
  existingPotentialRisksCount,
  onSaveSelectedRisks,
}: BrainstormSuggestionsModalProps) {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
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
      toast({ title: "Tidak Ada Pilihan", description: "Mohon pilih setidaknya satu potensi risiko untuk disimpan.", variant: "destructive" });
      return;
    }

    let currentSequence = existingPotentialRisksCount;
    const newPotentialRisks: PotentialRisk[] = selectedIndices.map(index => {
      currentSequence++;
      const suggestion = suggestions[index];
      return {
        id: `prisk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        goalId: goalId,
        description: suggestion.description,
        category: suggestion.category, // Use category from AI suggestion
        owner: null,
        likelihood: null,
        impact: null,
        identifiedAt: new Date().toISOString(),
        sequenceNumber: currentSequence,
      };
    });
    
    onSaveSelectedRisks(newPotentialRisks);
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
          <DialogTitle>Saran Potensi Risiko dari AI</DialogTitle>
          <DialogDescription>
            Pilih potensi risiko yang ingin Anda simpan dari daftar saran AI di bawah ini.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {suggestions.length === 0 ? (
            <p className="text-center text-muted-foreground">AI tidak memberikan saran potensi risiko.</p>
          ) : (
            <ScrollArea className="h-[300px] w-full rounded-md border p-4">
              <div className="space-y-3">
                {suggestions.map((suggestion, index) => (
                  <div key={index} className="flex items-start space-x-3 rounded-md p-2 hover:bg-muted/50 transition-colors">
                    <Checkbox
                      id={`suggestion-${index}`}
                      checked={selectedIndices.includes(index)}
                      onCheckedChange={() => handleToggleSelection(index)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <Label htmlFor={`suggestion-${index}`} className="text-sm font-normal cursor-pointer">
                        {suggestion.description}
                      </Label>
                      {suggestion.category && (
                        <Badge variant="outline" className="ml-2 text-xs mt-0.5">{suggestion.category}</Badge>
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
            Simpan Risiko Terpilih ({selectedIndices.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
