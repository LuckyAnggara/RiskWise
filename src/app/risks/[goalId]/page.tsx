
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { RiskIdentificationCard } from '@/components/risks/risk-identification-card';
import { RiskListItem } from '@/components/risks/risk-list-item';
import { RiskAnalysisModal } from '@/components/risks/risk-analysis-modal';
import { RiskControlModal } from '@/components/risks/risk-control-modal';
import type { Goal, Risk, Control } from '@/lib/types';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

// Mock goals - in a real app, fetch this based on goalId
const INITIAL_GOALS: Goal[] = [
  { id: 'g1', name: 'Launch New Product X', description: 'Successfully develop and launch Product X by Q4 2024 to capture 5% market share within the first year.', createdAt: '2023-10-15T10:00:00Z' },
  { id: 'g2', name: 'Improve Customer Satisfaction', description: 'Increase overall customer satisfaction (CSAT) score from 80% to 90% by end of 2024 through improved support and product usability.', createdAt: '2023-11-01T14:30:00Z' },
  { id: 'g3', name: 'Expand to European Market', description: 'Establish a market presence in at least 3 key European countries by mid-2025, achieving initial sales targets.', createdAt: '2024-01-20T09:15:00Z' },
];


export default function GoalRisksPage() {
  const router = useRouter();
  const params = useParams();
  const goalId = params.goalId as string;

  const [goal, setGoal] = useState<Goal | null>(null);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [controls, setControls] = useState<Control[]>([]);
  
  const [selectedRiskForAnalysis, setSelectedRiskForAnalysis] = useState<Risk | null>(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  
  const [selectedRiskForControl, setSelectedRiskForControl] = useState<Risk | null>(null);
  const [selectedControlForEdit, setSelectedControlForEdit] = useState<Control | null>(null);
  const [isControlModalOpen, setIsControlModalOpen] = useState(false);

  const { toast } = useToast();

  const loadData = useCallback(() => {
    const storedGoals = localStorage.getItem('riskwise-goals');
    const allGoals: Goal[] = storedGoals ? JSON.parse(storedGoals) : INITIAL_GOALS;
    const currentGoal = allGoals.find(g => g.id === goalId);
    setGoal(currentGoal || null);

    if (currentGoal) {
      const storedRisks = localStorage.getItem(`riskwise-risks-${goalId}`);
      const currentRisks: Risk[] = storedRisks ? JSON.parse(storedRisks) : [];
      setRisks(currentRisks);

      let allRiskControls: Control[] = [];
      currentRisks.forEach(risk => {
        const storedControls = localStorage.getItem(`riskwise-controls-${risk.id}`);
        if (storedControls) {
          allRiskControls = [...allRiskControls, ...JSON.parse(storedControls)];
        }
      });
      setControls(allRiskControls);
    }
  }, [goalId]);

  useEffect(() => {
    if (goalId) {
      loadData();
    }
  }, [goalId, loadData]);

  const updateRisksInStorage = (updatedRisks: Risk[]) => {
    localStorage.setItem(`riskwise-risks-${goalId}`, JSON.stringify(updatedRisks));
  };

  const updateControlsInStorage = (riskId: string, updatedControlsForRisk: Control[]) => {
    const otherControls = controls.filter(c => c.riskId !== riskId);
    const allUpdatedControls = [...otherControls, ...updatedControlsForRisk];
    setControls(allUpdatedControls); // Update overall controls state

    // This is tricky, as controls are stored per risk. We need to update the specific risk's controls.
    // For simplicity here, we'll just update the overall controls state.
    // A better approach for localStorage would be to store all controls in one key, or refetch/reconstruct.
    // This current localstorage strategy is simplified.
    // The most straightforward for this structure would be:
    localStorage.setItem(`riskwise-controls-${riskId}`, JSON.stringify(updatedControlsForRisk));
  };


  const handleRisksIdentified = (newRisks: Risk[]) => {
    setRisks(prev => {
      const updated = [...prev, ...newRisks];
      updateRisksInStorage(updated);
      return updated;
    });
  };

  const handleOpenAnalysisModal = (riskToAnalyze: Risk) => {
    setSelectedRiskForAnalysis(riskToAnalyze);
    setIsAnalysisModalOpen(true);
  };

  const handleSaveRiskAnalysis = (updatedRisk: Risk) => {
    setRisks(prev => {
      const updated = prev.map(r => r.id === updatedRisk.id ? updatedRisk : r);
      updateRisksInStorage(updated);
      toast({ title: "Risk Analyzed", description: `Analysis saved for risk: "${updatedRisk.description}"`});
      return updated;
    });
    setIsAnalysisModalOpen(false);
    setSelectedRiskForAnalysis(null);
  };

  const handleOpenControlModal = (riskForControl: Risk, controlToEdit?: Control) => {
    setSelectedRiskForControl(riskForControl);
    setSelectedControlForEdit(controlToEdit || null);
    setIsControlModalOpen(true);
  };

  const handleSaveControl = (control: Control) => {
    const riskSpecificControls = controls.filter(c => c.riskId === control.riskId);
    const existingIndex = riskSpecificControls.findIndex(c => c.id === control.id);
    let updatedRiskControls;

    if (existingIndex > -1) {
      updatedRiskControls = [...riskSpecificControls];
      updatedRiskControls[existingIndex] = control;
      toast({ title: "Control Updated", description: `Control "${control.description}" updated.` });
    } else {
      updatedRiskControls = [...riskSpecificControls, control];
      toast({ title: "Control Added", description: `Control "${control.description}" added.` });
    }
    updateControlsInStorage(control.riskId, updatedRiskControls);
    // also update the main controls state for immediate UI update
    setControls(prevControls => {
        const otherControls = prevControls.filter(c => c.riskId !== control.riskId);
        return [...otherControls, ...updatedRiskControls];
    });
    setIsControlModalOpen(false);
    setSelectedRiskForControl(null);
    setSelectedControlForEdit(null);
  };

  const handleDeleteRisk = (riskIdToDelete: string) => {
    setRisks(prev => {
      const riskToDelete = prev.find(r => r.id === riskIdToDelete);
      const updated = prev.filter(r => r.id !== riskIdToDelete);
      updateRisksInStorage(updated);
      if(riskToDelete) toast({ title: "Risk Deleted", description: `Risk "${riskToDelete.description}" deleted.`, variant: "destructive" });
      
      // Delete associated controls
      localStorage.removeItem(`riskwise-controls-${riskIdToDelete}`);
      setControls(currentControls => currentControls.filter(c => c.riskId !== riskIdToDelete));
      return updated;
    });
  };

  const handleDeleteControl = (controlIdToDelete: string) => {
    const controlToDelete = controls.find(c => c.id === controlIdToDelete);
    if (!controlToDelete) return;

    const riskIdOfControl = controlToDelete.riskId;
    const updatedRiskControls = controls.filter(c => c.id !== controlIdToDelete && c.riskId === riskIdOfControl);
    
    updateControlsInStorage(riskIdOfControl, updatedRiskControls);
    setControls(prevControls => prevControls.filter(c => c.id !== controlIdToDelete)); // update main state

    toast({ title: "Control Deleted", description: `Control "${controlToDelete.description}" deleted.`, variant: "destructive" });
  };

  if (!goal) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <ShieldAlert className="w-16 h-16 text-muted-foreground mb-4" />
        <p className="text-xl text-muted-foreground">Goal not found.</p>
        <Button onClick={() => router.push('/goals')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Goals
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Risks for: ${goal.name}`}
        description={goal.description}
        actions={
          <Button onClick={() => router.push('/goals')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Goals
          </Button>
        }
      />

      <RiskIdentificationCard goal={goal} onRisksIdentified={handleRisksIdentified} />
      
      <Separator />

      <div>
        <h2 className="text-2xl font-semibold mb-4">Identified Risks ({risks.length})</h2>
        {risks.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
            <ShieldAlert className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-lg font-medium">No risks identified yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Use the AI tool above to brainstorm risks or add them manually (feature to be added).
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {risks.map((risk) => (
              <RiskListItem
                key={risk.id}
                risk={risk}
                controls={controls} // Pass all controls, filtering happens inside
                onAnalyze={handleOpenAnalysisModal}
                onAddControl={(r) => handleOpenControlModal(r)}
                onEditControl={(c) => handleOpenControlModal(risks.find(r => r.id === c.riskId)!, c)}
                onDeleteRisk={handleDeleteRisk}
                onDeleteControl={handleDeleteControl}
              />
            ))}
          </div>
        )}
      </div>

      <RiskAnalysisModal
        risk={selectedRiskForAnalysis}
        isOpen={isAnalysisModalOpen}
        onOpenChange={setIsAnalysisModalOpen}
        onSave={handleSaveRiskAnalysis}
      />

      <RiskControlModal
        risk={selectedRiskForControl}
        existingControl={selectedControlForEdit}
        isOpen={isControlModalOpen}
        onOpenChange={setIsControlModalOpen}
        onSave={handleSaveControl}
      />
    </div>
  );
}
