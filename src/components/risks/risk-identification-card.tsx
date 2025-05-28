
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wand2, Loader2 } from 'lucide-react';
import type { Goal, PotentialRisk, RiskCategory } from '@/lib/types'; 
import { useToast } from "@/hooks/use-toast";
import { BrainstormContextModal } from './brainstorm-context-modal';
import { BrainstormSuggestionsModal } from './brainstorm-suggestions-modal';
import { useAuth } from '@/contexts/auth-context';
import { useAppStore } from '@/stores/useAppStore'; // Import useAppStore

interface RiskIdentificationCardProps {
  goal: Goal;
  // onPotentialRisksIdentified is no longer a prop, will use store action directly
  existingPotentialRisksCount: number; // Still needed for sequencing new PRs
}

interface AISuggestionItem { // Changed from AISuggestion
  description: string;
  category: RiskCategory | null;
}

export function RiskIdentificationCard({ goal, existingPotentialRisksCount }: RiskIdentificationCardProps) {
  const { toast } = useToast();
  const { currentUser, appUser } = useAuth(); // Get appUser for period
  const addPotentialRiskToStore = useAppStore(state => state.addPotentialRisk); // Get store action

  const [isContextModalOpen, setIsContextModalOpen] = useState(false);
  const [isSuggestionsModalOpen, setIsSuggestionsModalOpen] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestionItem[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false); // For AI brainstorming process

  const initialAIContext = `Nama Sasaran: ${goal.name}\nDeskripsi Sasaran: ${goal.description}`;

  const handleSuggestionsReady = (suggestions: AISuggestionItem[]) => {
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

  const handleSaveSelectedRisksFromAI = async (selectedSuggestions: AISuggestionItem[]) => {
    if (!currentUser || !currentUser.uid || !appUser || !appUser.activePeriod) {
      toast({
        title: "Konteks Pengguna/Periode Hilang",
        description: "Tidak dapat menyimpan saran AI. Informasi pengguna atau periode tidak tersedia.",
        variant: "destructive"
      });
      return;
    }
    if (selectedSuggestions.length === 0) return;

    setIsLoadingAI(true); // Start loading state for this specific save operation
    let currentSequence = existingPotentialRisksCount;
    const createdRisksPromises: Promise<PotentialRisk | null>[] = [];

    for (const suggestion of selectedSuggestions) {
      currentSequence++;
      const newRiskData: Omit<PotentialRisk, 'id' | 'identifiedAt' | 'userId' | 'period' | 'goalId' | 'sequenceNumber'> = {
        description: suggestion.description,
        category: suggestion.category,
        owner: null, // Default owner, can be edited later
      };
      // Call the store action to add the potential risk
      createdRisksPromises.push(
        addPotentialRiskToStore(newRiskData, goal.id, currentUser.uid, appUser.activePeriod, currentSequence)
      );
    }

    try {
      const results = await Promise.all(createdRisksPromises);
      const successfullyCreatedRisks = results.filter(Boolean) as PotentialRisk[];
      
      if (successfullyCreatedRisks.length > 0) {
        toast({
          title: "Potensi Risiko Disimpan",
          description: `${successfullyCreatedRisks.length} potensi risiko baru dari AI telah ditambahkan.`,
        });
      }
      if (results.length !== successfullyCreatedRisks.length) {
        toast({
          title: "Sebagian Gagal Disimpan",
          description: "Beberapa potensi risiko dari AI gagal disimpan.",
          variant: "warning"
        });
      }
    } catch (error: any) {
      console.error("Error saving AI suggested risks via store:", error);
      toast({ title: "Gagal Menyimpan Risiko", description: `Terjadi kesalahan: ${error.message || String(error)}`, variant: "destructive" });
    } finally {
      setIsLoadingAI(false);
      setIsSuggestionsModalOpen(false); 
      // The store update will trigger re-render on pages using the store, no need for onPotentialRisksIdentified prop
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
          <Button onClick={() => setIsContextModalOpen(true)} disabled={isLoadingAI || !currentUser}>
            {isLoadingAI ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            Brainstorm Potensi Risiko dengan AI
          </Button>
        </CardFooter>
      </Card>

      {isContextModalOpen && currentUser && appUser && appUser.activePeriod && (
        <BrainstormContextModal
          isOpen={isContextModalOpen}
          onOpenChange={setIsContextModalOpen}
          initialContext={initialAIContext}
          onSuggestionsReady={handleSuggestionsReady}
          goalUprId={appUser.displayName || ''} // Use appUser.displayName as UPR ID/Name
          goalPeriod={appUser.activePeriod}
        />
      )}

      {isSuggestionsModalOpen && currentUser && appUser && appUser.activePeriod && (
        <BrainstormSuggestionsModal
          isOpen={isSuggestionsModalOpen}
          onOpenChange={setIsSuggestionsModalOpen}
          suggestions={aiSuggestions}
          onSaveSelectedCauses={handleSaveSelectedRisksFromAI} // Changed prop name for clarity
        />
      )}
    </>
  );
}

    