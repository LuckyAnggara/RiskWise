
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
import type { PotentialRisk } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";

interface BrainstormSuggestionsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  suggestions: string[];
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
    // Pre-select all suggestions when modal opens or suggestions change
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
      return {
        id: `prisk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, // Longer random part
        goalId: goalId,
        description: suggestions[index],
        category: null,
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
        // Reset selections if modal is closed without saving, or keep them if preferred
        // setSelectedIndices([]); 
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
                  <div key={index} className="flex items-center space-x-3 rounded-md p-2 hover:bg-muted/50 transition-colors">
                    <Checkbox
                      id={`suggestion-${index}`}
                      checked={selectedIndices.includes(index)}
                      onCheckedChange={() => handleToggleSelection(index)}
                    />
                    <Label htmlFor={`suggestion-${index}`} className="flex-1 text-sm font-normal cursor-pointer">
                      {suggestion}
                    </Label>
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
