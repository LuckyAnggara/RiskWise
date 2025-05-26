
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wand2 } from 'lucide-react';
import type { Goal, PotentialRisk, RiskCategory } from '@/lib/types'; 
import { useToast } from "@/hooks/use-toast";
import { BrainstormContextModal } from './brainstorm-context-modal';
import { BrainstormSuggestionsModal } from './brainstorm-suggestions-modal';
import { addPotentialRisk } from '@/services/potentialRiskService'; // Import Firestore service
import { useAuth } from '@/contexts/auth-context';

interface RiskIdentificationCardProps {
  goal: Goal;
  onPotentialRisksIdentified: (newPotentialRisks: PotentialRisk[]) => void; // This prop might change to just trigger a reload
  existingPotentialRisksCount: number;
}

interface AISuggestion {
  description: string;
  category: RiskCategory | null;
}

export function RiskIdentificationCard({ goal, onPotentialRisksIdentified, existingPotentialRisksCount }: RiskIdentificationCardProps) {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);
  const [isSuggestionsModalOpen, setIsSuggestionsModalOpen] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const initialAIContext = `Nama Sasaran: ${goal.name}\nDeskripsi Sasaran: ${goal.description}`;

  const handleSuggestionsReady = (suggestions: AISuggestion[]) => {
    if (suggestions.length === 0) {
        toast({
            title: "Tidak Ada Saran dari AI",
            description: "AI tidak menghasilkan potensi risiko untuk konteks yang diberikan.",
            variant: "default"
        });
        setIsContextModalOpen(false); 
        return;
    }
    setAiSuggestions(suggestions);
    setIsContextModalOpen(false); 
    setIsSuggestionsModalOpen(true); 
  };

  const handleSaveSelectedRisks = async (selectedSuggestions: AISuggestion[]) => {
    if (!currentUser) {
      toast({ title: "Otentikasi Diperlukan", description: "Anda harus login untuk menyimpan potensi risiko.", variant: "destructive" });
      return;
    }
    if (selectedSuggestions.length === 0) return;

    setIsLoading(true);
    let currentSequence = existingPotentialRisksCount;
    const newPotentialRisksPromises = selectedSuggestions.map(suggestion => {
      currentSequence++;
      const newRiskData: Omit<PotentialRisk, 'id' | 'identifiedAt' | 'uprId' | 'period' | 'userId' | 'sequenceNumber'> = {
        goalId: goal.id,
        description: suggestion.description,
        category: suggestion.category,
        owner: null, // Default owner, can be edited later
      };
      return addPotentialRisk(newRiskData, goal.id, goal.uprId, goal.period, currentUser.uid, currentSequence);
    });

    try {
      const createdRisks = await Promise.all(newPotentialRisksPromises);
      onPotentialRisksIdentified(createdRisks); 
      toast({
        title: "Potensi Risiko Disimpan",
        description: `${createdRisks.length} potensi risiko baru telah ditambahkan dari saran AI ke Firestore.`,
      });
    } catch (error) {
      console.error("Error saving AI suggested risks:", error);
      toast({ title: "Gagal Menyimpan Risiko", description: "Terjadi kesalahan saat menyimpan saran risiko dari AI.", variant: "destructive" });
    } finally {
      setIsLoading(false);
      setIsSuggestionsModalOpen(false); 
    }
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
          <Button onClick={() => setIsContextModalOpen(true)} disabled={isLoading || !currentUser}>
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
          onSaveSelectedCauses={handleSaveSelectedRisks} // Renamed prop in modal to be generic
        />
      )}
    </>
  );
}
