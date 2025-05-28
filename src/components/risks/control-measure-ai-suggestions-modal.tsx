
"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Wand2, Check } from 'lucide-react';
import type { ControlMeasureTypeKey } from '@/lib/types';
import { getControlTypeName } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

export interface AISuggestedControlMeasure {
  description: string;
  suggestedControlType: ControlMeasureTypeKey;
  justification: string;
}

interface ControlMeasureAISuggestionsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  suggestions: AISuggestedControlMeasure[] | null;
  onApplySuggestion: (suggestion: AISuggestedControlMeasure) => void;
}

export function ControlMeasureAISuggestionsModal({
  isOpen,
  onOpenChange,
  suggestions,
  onApplySuggestion,
}: ControlMeasureAISuggestionsModalProps) {

  if (!suggestions) {
    return null;
  }

  const handleApply = (suggestion: AISuggestedControlMeasure) => {
    onApplySuggestion(suggestion);
    onOpenChange(false); // Close modal after applying
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Saran AI untuk Tindakan Pengendalian Risiko</DialogTitle>
          <DialogDescription>
            Berikut adalah saran dari AI. Pilih salah satu untuk diterapkan pada formulir.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] p-1">
          <div className="space-y-4 py-4">
            {suggestions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center">AI tidak memberikan saran pengendalian untuk konteks ini.</p>
            )}
            {suggestions.map((suggestion, index) => (
              <Alert key={index} className="flex flex-col">
                <div className="flex items-start">
                    <Wand2 className="h-4 w-4 mr-2 mt-0.5 shrink-0" />
                    <div className="flex-grow">
                        <AlertTitle className="font-semibold text-sm mb-0.5">
                            Saran Pengendalian #{index + 1} <Badge variant="outline" className="ml-1 text-xs">{getControlTypeName(suggestion.suggestedControlType)} ({suggestion.suggestedControlType})</Badge>
                        </AlertTitle>
                        <AlertDescription className="text-sm mb-1">
                            <p className="font-medium">{suggestion.description}</p>
                        </AlertDescription>
                        <AlertDescription className="text-xs text-muted-foreground">
                            <strong>Justifikasi:</strong> {suggestion.justification}
                        </AlertDescription>
                    </div>
                </div>
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2 text-xs self-end" 
                    onClick={() => handleApply(suggestion)}
                >
                  <Check className="mr-1.5 h-3.5 w-3.5" /> Terapkan Saran Ini
                </Button>
              </Alert>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter className="sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
