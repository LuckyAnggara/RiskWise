
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
import type { PotentialRisk, RiskCategory, RiskSource } from '@/lib/types'; // Updated to include RiskSource
import { useToast } from "@/hooks/use-toast";
import { Badge } from '@/components/ui/badge';

// Unified suggestion type
interface AISuggestionItem {
  description: string;
  category?: RiskCategory | null; // Optional for cause suggestions
  source?: RiskSource | null; // Optional for potential risk suggestions
}

interface BrainstormSuggestionsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  suggestions: AISuggestionItem[];
  // This callback will now pass back the selected suggestion items directly
  onSaveSelectedCauses: (selectedItems: AISuggestionItem[]) => void; 
}

export function BrainstormSuggestionsModal({
  isOpen,
  onOpenChange,
  suggestions,
  onSaveSelectedCauses, // Renamed for clarity, as it now handles generic items
}: BrainstormSuggestionsModalProps) {
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
      toast({ title: "Tidak Ada Pilihan", description: "Mohon pilih setidaknya satu saran untuk disimpan.", variant: "destructive" });
      return;
    }

    const selectedItems = selectedIndices.map(index => suggestions[index]);
    onSaveSelectedCauses(selectedItems); // Pass back the raw selected suggestion items
    onOpenChange(false);
  };

  const titleText = suggestions.some(s => s.category !== undefined) 
    ? "Saran Potensi Risiko dari AI" 
    : "Saran Penyebab Risiko dari AI";
  const descriptionText = suggestions.some(s => s.category !== undefined)
    ? "Pilih potensi risiko yang ingin Anda simpan dari daftar saran AI di bawah ini."
    : "Pilih saran penyebab risiko yang ingin Anda simpan dari daftar AI di bawah ini.";
  const saveButtonText = suggestions.some(s => s.category !== undefined)
    ? "Simpan Risiko Terpilih ({count})"
    : "Simpan Penyebab Terpilih ({count})";


  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        // setSelectedIndices([]); // Optionally reset selections if modal is closed without saving
      }
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{titleText}</DialogTitle>
          <DialogDescription>{descriptionText}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {suggestions.length === 0 ? (
            <p className="text-center text-muted-foreground">AI tidak memberikan saran.</p>
          ) : (
            <ScrollArea className="h-[300px] w-full rounded-md border p-4">
              <div className="space-y-3">
                {suggestions.map((suggestion, index) => (
                  <div key={index} className="flex items-start space-x-3 rounded-md p-2 hover:bg-muted/50 transition-colors">
                    <Checkbox
                      id={`suggestion-item-${index}`}
                      checked={selectedIndices.includes(index)}
                      onCheckedChange={() => handleToggleSelection(index)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <Label htmlFor={`suggestion-item-${index}`} className="text-sm font-normal cursor-pointer">
                        {suggestion.description}
                      </Label>
                      {suggestion.category && (
                        <Badge variant="outline" className="ml-2 text-xs mt-0.5">{suggestion.category}</Badge>
                      )}
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
            {saveButtonText.replace("{count}", selectedIndices.length.toString())}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
