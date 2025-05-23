
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { RiskIdentificationCard } from '@/components/risks/risk-identification-card';
import { RiskListItem } from '@/components/risks/risk-list-item';
import { RiskAnalysisModal } from '@/components/risks/risk-analysis-modal';
import { RiskControlModal } from '@/components/risks/risk-control-modal';
import type { Goal, Risk, Control, LikelihoodImpactLevel } from '@/lib/types';
import { ArrowLeft, ShieldAlert, Loader2, LayoutGrid, List, Settings2, BarChart3, PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";

// Mock goals - in a real app, fetch this based on goalId or a global store
const INITIAL_GOALS: Goal[] = [
  { id: 'g1', name: 'Launch New Product X', description: 'Successfully develop and launch Product X by Q4 2024 to capture 5% market share within the first year.', createdAt: '2023-10-15T10:00:00Z' },
  { id: 'g2', name: 'Improve Customer Satisfaction', description: 'Increase overall customer satisfaction (CSAT) score from 80% to 90% by end of 2024 through improved support and product usability.', createdAt: '2023-11-01T14:30:00Z' },
  { id: 'g3', name: 'Expand to European Market', description: 'Establish a market presence in at least 3 key European countries by mid-2025, achieving initial sales targets.', createdAt: '2024-01-20T09:15:00Z' },
];

// Helper functions for risk level and color (moved from RiskListItem)
const getRiskLevel = (likelihood: LikelihoodImpactLevel | null, impact: LikelihoodImpactLevel | null): string => {
  if (!likelihood || !impact) return 'N/A';
  const L = { 'Very Low': 1, 'Low': 2, 'Medium': 3, 'High': 4, 'Very High': 5 };
  const I = { 'Very Low': 1, 'Low': 2, 'Medium': 3, 'High': 4, 'Very High': 5 };
  const score = L[likelihood] * I[impact];

  if (score >= 20) return 'Critical'; // e.g. Very High * Very High
  if (score >= 12) return 'High';   // e.g. High * High / Very High * Medium
  if (score >= 6) return 'Medium';  // e.g. Medium * Medium / High * Low
  if (score >= 3) return 'Low';     // e.g. Low * Low / Medium * Very Low
  return 'Very Low';
};

const getRiskLevelColor = (level: string) => {
  switch (level.toLowerCase()) {
    case 'critical': return 'bg-red-600 hover:bg-red-700';
    case 'high': return 'bg-orange-500 hover:bg-orange-600';
    case 'medium': return 'bg-yellow-400 hover:bg-yellow-500 text-black';
    case 'low': return 'bg-green-500 hover:bg-green-600';
    case 'very low': return 'bg-sky-500 hover:bg-sky-600';
    default: return 'bg-gray-400 hover:bg-gray-500 text-white'; // Ensure N/A has white text
  }
};


export default function GoalRisksPage() {
  const router = useRouter();
  const params = useParams();
  const goalId = params.goalId as string;

  const [goal, setGoal] = useState<Goal | null>(null);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [controls, setControls] = useState<Control[]>([]);
  const [pageIsLoading, setPageIsLoading] = useState(true); // Renamed to avoid conflict
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  
  const [selectedRiskForAnalysis, setSelectedRiskForAnalysis] = useState<Risk | null>(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  
  const [selectedRiskForControl, setSelectedRiskForControl] = useState<Risk | null>(null);
  const [selectedControlForEdit, setSelectedControlForEdit] = useState<Control | null>(null);
  const [isControlModalOpen, setIsControlModalOpen] = useState(false);

  const { toast } = useToast();

  const loadData = useCallback(() => {
    if (typeof window !== 'undefined' && goalId) {
      const storedGoalsData = localStorage.getItem('riskwise-goals');
      const allGoals: Goal[] = storedGoalsData ? JSON.parse(storedGoalsData) : INITIAL_GOALS;
      const currentGoal = allGoals.find(g => g.id === goalId);
      setGoal(currentGoal || null);

      if (currentGoal) {
        const storedRisksData = localStorage.getItem(`riskwise-risks-${goalId}`);
        const currentRisks: Risk[] = storedRisksData ? JSON.parse(storedRisksData) : [];
        setRisks(currentRisks);

        let allRiskControls: Control[] = [];
        currentRisks.forEach(risk => {
          const storedControlsData = localStorage.getItem(`riskwise-controls-${risk.id}`);
          if (storedControlsData) {
            allRiskControls = [...allRiskControls, ...JSON.parse(storedControlsData)];
          }
        });
        setControls(allRiskControls);
      }
       setPageIsLoading(false);
    } else if (!goalId) {
        setGoal(null);
        setRisks([]);
        setControls([]);
        setPageIsLoading(false);
    }
    // If window is undefined (SSR), keep pageIsLoading true until client-side useEffect runs
  }, [goalId]);

  useEffect(() => {
     // Only run loadData on client-side
    if (typeof window !== 'undefined') {
      loadData();
    }
  }, [loadData]);
  
  // Additional useEffect to set pageIsLoading to false on client if it was true from SSR.
  useEffect(() => {
    if (typeof window !== 'undefined' && pageIsLoading) {
      setPageIsLoading(false);
    }
  }, [pageIsLoading]);


  const updateRisksInStorage = (updatedRisks: Risk[]) => {
    if (typeof window !== 'undefined' && goalId) {
      localStorage.setItem(`riskwise-risks-${goalId}`, JSON.stringify(updatedRisks));
    }
  };

  const updateControlsInStorage = (riskId: string, updatedControlsForRisk: Control[]) => {
     if (typeof window !== 'undefined') {
        localStorage.setItem(`riskwise-controls-${riskId}`, JSON.stringify(updatedControlsForRisk));
     }
  };

  const handleRisksIdentified = (newRisks: Risk[]) => {
    const updatedRisksState = [...risks, ...newRisks];
    setRisks(updatedRisksState);
    if (typeof window !== 'undefined' && goalId) {
      localStorage.setItem(`riskwise-risks-${goalId}`, JSON.stringify(updatedRisksState));
    }
  };
  
  const handleOpenAnalysisModal = (riskToAnalyze: Risk) => {
    setSelectedRiskForAnalysis(riskToAnalyze);
    setIsAnalysisModalOpen(true);
  };

  const handleSaveRiskAnalysis = (updatedRisk: Risk) => {
    const newRisksState = risks.map(r => r.id === updatedRisk.id ? updatedRisk : r);
    setRisks(newRisksState);
    updateRisksInStorage(newRisksState);
    toast({ title: "Risk Analyzed", description: `Analysis saved for risk: "${updatedRisk.description}"`});
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
    let updatedRiskControlsList: Control[];

    if (existingIndex > -1) {
      updatedRiskControlsList = riskSpecificControls.map(c => c.id === control.id ? control : c);
    } else {
      updatedRiskControlsList = [...riskSpecificControls, control];
    }
    
    updateControlsInStorage(control.riskId, updatedRiskControlsList);
    const updatedOverallControls = controls.filter(c => c.riskId !== control.riskId).concat(updatedRiskControlsList);
    setControls(updatedOverallControls);
    
    if (existingIndex > -1) {
        toast({ title: "Control Updated", description: `Control "${control.description}" updated.` });
    } else {
        toast({ title: "Control Added", description: `Control "${control.description}" added.` });
    }
    
    setIsControlModalOpen(false);
    setSelectedRiskForControl(null);
    setSelectedControlForEdit(null);
  };

  const handleDeleteRisk = (riskIdToDelete: string) => {
    const riskToDelete = risks.find(r => r.id === riskIdToDelete);
    const updatedRisksState = risks.filter(r => r.id !== riskIdToDelete);
    
    setRisks(updatedRisksState);
    updateRisksInStorage(updatedRisksState);
      
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`riskwise-controls-${riskIdToDelete}`);
    }
    setControls(currentControls => currentControls.filter(c => c.riskId !== riskIdToDelete));
    if(riskToDelete) {
      toast({ title: "Risk Deleted", description: `Risk "${riskToDelete.description}" deleted.`, variant: "destructive" });
    }
  };

  const handleDeleteControl = (controlIdToDelete: string) => {
    const controlToDelete = controls.find(c => c.id === controlIdToDelete);
    if (!controlToDelete) return;

    const riskIdOfControl = controlToDelete.riskId;
    const updatedRiskControlsList = controls
        .filter(c => c.riskId === riskIdOfControl && c.id !== controlIdToDelete);
    
    updateControlsInStorage(riskIdOfControl, updatedRiskControlsList);
    const updatedOverallControls = controls.filter(c => c.id !== controlIdToDelete);
    setControls(updatedOverallControls);

    toast({ title: "Control Deleted", description: `Control "${controlToDelete.description}" deleted.`, variant: "destructive" });
  };

  if (pageIsLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-10">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Loading goal data...</p>
      </div>
    );
  }
  
  if (!goal && !pageIsLoading) { 
    return (
      <div className="flex flex-col items-center justify-center h-full py-10">
        <ShieldAlert className="w-16 h-16 text-muted-foreground mb-4" />
        <p className="text-xl text-muted-foreground">Goal not found.</p>
        <Button onClick={() => router.push('/goals')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Goals
        </Button>
      </div>
    );
  }

  if (!goal) { 
    return (
        <div className="flex flex-col items-center justify-center h-full py-10">
         <ShieldAlert className="w-16 h-16 text-muted-foreground mb-4" />
         <p className="text-xl text-muted-foreground">Goal not found or still loading.</p>
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
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Identified Risks ({risks.length})</h2>
            <div className="flex items-center space-x-2">
                <Button 
                    variant={viewMode === 'card' ? 'default' : 'outline'} 
                    size="icon" 
                    onClick={() => setViewMode('card')}
                    aria-label="Card View"
                >
                    <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button 
                    variant={viewMode === 'table' ? 'default' : 'outline'} 
                    size="icon" 
                    onClick={() => setViewMode('table')}
                    aria-label="Table View"
                >
                    <List className="h-4 w-4" />
                </Button>
            </div>
        </div>

        {risks.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
            <ShieldAlert className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-lg font-medium">No risks identified yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Use the AI tool above to brainstorm risks or add them manually (feature to be added).
            </p>
          </div>
        ) : viewMode === 'card' ? (
          <div className="space-y-4">
            {risks.map((risk) => (
              <RiskListItem
                key={risk.id}
                risk={risk}
                controls={controls.filter(c => c.riskId === risk.id)}
                onAnalyze={handleOpenAnalysisModal}
                onAddControl={(r) => handleOpenControlModal(r)}
                onEditControl={(c) => {
                    const parentRisk = risks.find(r => r.id === c.riskId);
                    if (parentRisk) handleOpenControlModal(parentRisk, c);
                }}
                onDeleteRisk={handleDeleteRisk}
                onDeleteControl={handleDeleteControl}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Description</TableHead>
                    <TableHead>Likelihood</TableHead>
                    <TableHead>Impact</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Controls</TableHead>
                    <TableHead className="text-right w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {risks.map((risk) => {
                    const riskLevelValue = getRiskLevel(risk.likelihood, risk.impact);
                    const riskControlsList = controls.filter(c => c.riskId === risk.id);
                    return (
                      <TableRow key={risk.id}>
                        <TableCell className="font-medium max-w-xs truncate" title={risk.description}>
                            {risk.description}
                        </TableCell>
                        <TableCell>
                          <Badge variant={risk.likelihood ? "secondary" : "outline"}>
                            {risk.likelihood || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={risk.impact ? "secondary" : "outline"}>
                            {risk.impact || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getRiskLevelColor(riskLevelValue)} text-white`}>
                            {riskLevelValue}
                          </Badge>
                        </TableCell>
                        <TableCell>{riskControlsList.length}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Settings2 className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenAnalysisModal(risk)}>
                                <BarChart3 className="mr-2 h-4 w-4" /> Analyze
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenControlModal(risk)}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Control
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDeleteRisk(risk.id)} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Risk
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
