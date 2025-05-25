
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wand2 } from 'lucide-react';
import type { Goal, PotentialRisk } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { BrainstormContextModal } from './brainstorm-context-modal';
import { BrainstormSuggestionsModal } from './brainstorm-suggestions-modal';

interface RiskIdentificationCardProps {
  goal: Goal;
  onPotentialRisksIdentified: (newPotentialRisks: PotentialRisk[]) => void;
  existingPotentialRisksCount: number;
}

export function RiskIdentificationCard({ goal, onPotentialRisksIdentified, existingPotentialRisksCount }: RiskIdentificationCardProps) {
  const { toast } = useToast();
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);
  const [isSuggestionsModalOpen, setIsSuggestionsModalOpen] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  const initialAIContext = `Sasaran ${goal.code || '[TANPA KODE]'}: ${goal.name} - ${goal.description} (Konteks untuk sasaran ini: UPR ${goal.uprId}, Periode ${goal.period})`;

  const handleSuggestionsReady = (suggestions: string[]) => {
    if (suggestions.length === 0) {
        toast({
            title: "Tidak Ada Saran dari AI",
            description: "AI tidak menghasilkan potensi risiko untuk konteks yang diberikan.",
            variant: "default"
        });
        setIsContextModalOpen(false); // Close context modal
        return;
    }
    setAiSuggestions(suggestions);
    setIsContextModalOpen(false); // Close context modal
    setIsSuggestionsModalOpen(true); // Open suggestions modal
  };

  const handleSaveSelectedRisks = (newRisks: PotentialRisk[]) => {
    onPotentialRisksIdentified(newRisks); // This function is passed from the parent page
    setIsSuggestionsModalOpen(false); // Close suggestions modal
    toast({
      title: "Potensi Risiko Disimpan",
      description: `${newRisks.length} potensi risiko baru telah ditambahkan dari saran AI.`,
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Identifikasi Potensi Risiko dengan AI</CardTitle>
          <CardDescription>
            Gunakan AI untuk brainstorming potensi risiko untuk sasaran: <span className="font-semibold">{goal.code || '[TANPA KODE]'} - {goal.name}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Klik tombol di bawah untuk membuka dialog di mana Anda dapat menyempurnakan konteks untuk AI dan menentukan jumlah saran yang diinginkan.
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => setIsContextModalOpen(true)}>
            <Wand2 className="mr-2 h-4 w-4" />
            Brainstorm Potensi Risiko dengan AI
          </Button>
        </CardFooter>
      </Card>

      {isContextModalOpen && (
        <BrainstormContextModal
          isOpen={isContextModalOpen}
          onOpenChange={setIsContextModalOpen}
          initialContext={initialAIContext}
          onSuggestionsReady={handleSuggestionsReady}
          goalUprId={goal.uprId}
          goalPeriod={goal.period}
        />
      )}

      {isSuggestionsModalOpen && (
        <BrainstormSuggestionsModal
          isOpen={isSuggestionsModalOpen}
          onOpenChange={setIsSuggestionsModalOpen}
          suggestions={aiSuggestions}
          goalId={goal.id}
          existingPotentialRisksCount={existingPotentialRisksCount}
          onSaveSelectedRisks={handleSaveSelectedRisks}
        />
      )}
    </>
  );
}
