
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Wand2 } from 'lucide-react';
import type { Goal, Risk } from '@/lib/types';
import { brainstormRisksAction } from '@/app/actions';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface RiskIdentificationCardProps {
  goal: Goal; // Goal already contains uprId and period
  onRisksIdentified: (newRisks: Risk[]) => void;
}

export function RiskIdentificationCard({ goal, onRisksIdentified }: RiskIdentificationCardProps) {
  const [goalDescriptionForAI, setGoalDescriptionForAI] = useState(goal.description);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleBrainstormRisks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // The goalDescription is the primary input for the AI; UPR/Period context is implicit via the goal.
      const result = await brainstormRisksAction({ goalDescription: `${goalDescriptionForAI} (Context: UPR ${goal.uprId}, Period ${goal.period})` });
      if (result.success && result.data) {
        const newRisks: Risk[] = result.data.risks.map(desc => ({
          id: `risk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          goalId: goal.id, // This links it to the goal with its UPR and Period
          description: desc,
          likelihood: null,
          impact: null,
          identifiedAt: new Date().toISOString(),
        }));
        onRisksIdentified(newRisks);
        toast({
          title: "Risks Identified!",
          description: `${newRisks.length} potential risks have been brainstormed for your goal.`,
        });
      } else {
        setError(result.error || "An unknown error occurred.");
        toast({
          title: "Error",
          description: result.error || "Failed to brainstorm risks.",
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
        <CardTitle>AI-Powered Risk Identification</CardTitle>
        <CardDescription>
          Use our AI assistant to brainstorm potential risks associated with your goal: <span className="font-semibold">{goal.name}</span>.
          {` (UPR: ${goal.uprId}, Period: ${goal.period})`}
          You can refine the goal description below for better results.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="goalDescriptionAI">Goal Description for AI</Label>
          <Textarea
            id="goalDescriptionAI"
            value={goalDescriptionForAI}
            onChange={(e) => setGoalDescriptionForAI(e.target.value)}
            placeholder="E.g., Successfully launch a new mobile application for iOS and Android platforms by Q3, targeting 10,000 active users within 6 months."
            rows={4}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Provide a clear and detailed description for the AI to analyze.
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
        <Button onClick={handleBrainstormRisks} disabled={isLoading || !goalDescriptionForAI.trim()}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="mr-2 h-4 w-4" />
          )}
          Brainstorm Risks
        </Button>
      </CardFooter>
    </Card>
  );
}
