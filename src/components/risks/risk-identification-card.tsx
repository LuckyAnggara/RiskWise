
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Wand2 } from 'lucide-react';
import type { Goal, PotentialRisk } from '@/lib/types';
import { brainstormPotentialRisksAction } from '@/app/actions';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface RiskIdentificationCardProps {
  goal: Goal;
  onPotentialRisksIdentified: (newPotentialRisks: PotentialRisk[]) => void;
  existingPotentialRisksCount: number;
}

export function RiskIdentificationCard({ goal, onPotentialRisksIdentified, existingPotentialRisksCount }: RiskIdentificationCardProps) {
  const [goalDescriptionForAI, setGoalDescriptionForAI] = useState(
    `Sasaran S${goal.sequenceNumber}: ${goal.name} - ${goal.description} (Konteks untuk sasaran ini: UPR ${goal.uprId}, Periode ${goal.period})`
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleBrainstormPotentialRisks = async () => {
    setIsLoading(true);
    setError(null);
    let currentPRSequence = existingPotentialRisksCount;
    try {
      const result = await brainstormPotentialRisksAction({ goalDescription: goalDescriptionForAI });
      if (result.success && result.data && result.data.potentialRisks) {
        const newPotentialRisks: PotentialRisk[] = result.data.potentialRisks.map(desc => {
          currentPRSequence++;
          return {
            id: `prisk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            goalId: goal.id,
            description: desc,
            category: null,
            owner: null,
            likelihood: null,
            impact: null,
            identifiedAt: new Date().toISOString(),
            sequenceNumber: currentPRSequence,
          };
        });
        onPotentialRisksIdentified(newPotentialRisks);
      } else {
        const errorMessage = result.error || "Terjadi kesalahan tidak diketahui saat brainstorming AI.";
        setError(errorMessage);
        toast({
          title: "Kesalahan Brainstorming AI",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Kesalahan brainstorming:", err);
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga.";
      setError(errorMessage);
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
    <Card>
      <CardHeader>
        <CardTitle>Identifikasi Potensi Risiko dengan AI</CardTitle>
        <CardDescription>
          Gunakan AI untuk brainstorming potensi risiko untuk sasaran: <span className="font-semibold">S{goal.sequenceNumber} - {goal.name}</span>.
          Sempurnakan deskripsi di bawah ini untuk hasil AI yang lebih baik.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="goalDescriptionAI">Konteks Sasaran untuk AI</Label>
          <Textarea
            id="goalDescriptionAI"
            value={goalDescriptionForAI}
            onChange={(e) => setGoalDescriptionForAI(e.target.value)}
            placeholder="Contoh: Berhasil meluncurkan aplikasi seluler baru untuk platform iOS dan Android pada Q3, menargetkan 10.000 pengguna aktif dalam 6 bulan."
            rows={4}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Berikan deskripsi yang jelas dan rinci termasuk konteks UPR ({goal.uprId}) dan Periode ({goal.period}) untuk AI.
          </p>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Brainstorming Gagal</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleBrainstormPotentialRisks} disabled={isLoading || !goalDescriptionForAI.trim()}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="mr-2 h-4 w-4" />
          )}
          Brainstorm Potensi Risiko
        </Button>
      </CardFooter>
    </Card>
  );
}
