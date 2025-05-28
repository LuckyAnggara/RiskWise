
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
import { Wand2 } from 'lucide-react';

interface KriToleranceAISuggestion {
  suggestedKRI: string;
  kriJustification: string;
  suggestedTolerance: string;
  toleranceJustification: string;
}

interface KriToleranceAISuggestionsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  suggestions: KriToleranceAISuggestion | null;
  onApplyKRI: (kri: string) => void;
  onApplyTolerance: (tolerance: string) => void;
  onApplyBoth: (kri: string, tolerance: string) => void;
}

export function KriToleranceAISuggestionsModal({
  isOpen,
  onOpenChange,
  suggestions,
  onApplyKRI,
  onApplyTolerance,
  onApplyBoth,
}: KriToleranceAISuggestionsModalProps) {

  if (!suggestions) {
    return null; // Atau tampilkan pesan "tidak ada saran" jika isOpen true tapi suggestions null
  }

  const handleApplyKRI = () => {
    onApplyKRI(suggestions.suggestedKRI);
    onOpenChange(false);
  };

  const handleApplyTolerance = () => {
    onApplyTolerance(suggestions.suggestedTolerance);
    onOpenChange(false);
  };

  const handleApplyBoth = () => {
    onApplyBoth(suggestions.suggestedKRI, suggestions.suggestedTolerance);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Saran AI untuk KRI & Toleransi Risiko</DialogTitle>
          <DialogDescription>
            Berikut adalah saran dari AI. Anda dapat memilih untuk menggunakan salah satu atau keduanya.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] p-1">
          <div className="space-y-4 py-4">
            <Alert>
              <Wand2 className="h-4 w-4" />
              <AlertTitle className="font-semibold">Saran Key Risk Indicator (KRI)</AlertTitle>
              <AlertDescription className="text-sm">
                <p className="font-medium">{suggestions.suggestedKRI}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Justifikasi:</strong> {suggestions.kriJustification}
                </p>
              </AlertDescription>
              <Button variant="outline" size="sm" className="mt-2 text-xs" onClick={handleApplyKRI}>
                Gunakan KRI Ini
              </Button>
            </Alert>

            <Alert>
              <Wand2 className="h-4 w-4" />
              <AlertTitle className="font-semibold">Saran Toleransi Risiko</AlertTitle>
              <AlertDescription className="text-sm">
                <p className="font-medium">{suggestions.suggestedTolerance}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Justifikasi:</strong> {suggestions.toleranceJustification}
                </p>
              </AlertDescription>
              <Button variant="outline" size="sm" className="mt-2 text-xs" onClick={handleApplyTolerance}>
                Gunakan Toleransi Ini
              </Button>
            </Alert>
          </div>
        </ScrollArea>
        <DialogFooter className="sm:justify-between items-center">
          <Button type="button" variant="default" onClick={handleApplyBoth}>
            Gunakan Keduanya
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
