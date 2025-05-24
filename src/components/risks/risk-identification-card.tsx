
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
  goal: Goal; // Goal already contains uprId and period
  onPotentialRisksIdentified: (newPotentialRisks: PotentialRisk[]) => void;
}

export function RiskIdentificationCard({ goal, onPotentialRisksIdentified }: RiskIdentificationCardProps) {
  const [goalDescriptionForAI, setGoalDescriptionForAI] = useState(
    `${goal.description} (Context for this goal: UPR ${goal.uprId}, Period ${goal.period})`
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleBrainstormPotentialRisks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await brainstormPotentialRisksAction({ goalDescription: goalDescriptionForAI });
      if (result.success && result.data && result.data.potentialRisks) {
        const newPotentialRisks: PotentialRisk[] = result.data.potentialRisks.map(desc => ({
          id: `prisk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          goalId: goal.id,
          description: desc,
          category: null,
          owner: null,
          likelihood: null,
          impact: null,
          identifiedAt: new Date().toISOString(),
        }));
        onPotentialRisksIdentified(newPotentialRisks);
      } else {
        setError(result.error || "An unknown error occurred during AI brainstorming.");
        toast({
          title: "AI Brainstorming Error",
          description: result.error || "Failed to brainstorm potential risks using AI.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Brainstorming error:", err);
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(errorMessage);
      toast({
        title: "Error",
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
        <CardTitle>AI-Powered Potential Risk Identification</CardTitle>
        <CardDescription>
          Use AI to brainstorm potential risks for goal: <span className="font-semibold">{goal.name}</span>.
          Refine the description below for better AI results.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="goalDescriptionAI">Goal Context for AI</Label>
          <Textarea
            id="goalDescriptionAI"
            value={goalDescriptionForAI}
            onChange={(e) => setGoalDescriptionForAI(e.target.value)}
            placeholder="E.g., Successfully launch a new mobile application for iOS and Android platforms by Q3, targeting 10,000 active users within 6 months."
            rows={4}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Provide a clear, detailed description including the UPR ({goal.uprId}) and Period ({goal.period}) context for the AI.
          </p>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Brainstorming Failed</AlertTitle>
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
          Brainstorm Potential Risks
        </Button>
      </CardFooter>
    </Card>
  );
}
