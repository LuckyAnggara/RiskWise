
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

// Simulated current UPR and Period context - ideally this comes from a global context
const CURRENT_UPR_ID = 'UPR001';
const CURRENT_PERIOD = '2024';

const getGoalsStorageKey = (uprId: string, period: string) => `riskwise-upr${uprId}-period${period}-goals`;
const getRisksStorageKey = (uprId: string, period: string, goalId: string) => `riskwise-upr${uprId}-period${period}-goal${goalId}-risks`;
const getControlsStorageKey = (uprId: string, period: string, riskId: string) => `riskwise-upr${uprId}-period${period}-risk${riskId}-controls`;


// Helper functions for risk level and color
const getRiskLevel = (likelihood: LikelihoodImpactLevel | null, impact: LikelihoodImpactLevel | null): string => {
  if (!likelihood || !impact) return 'N/A';
  const L = { 'Very Low': 1, 'Low': 2, 'Medium': 3, 'High': 4, 'Very High': 5 };
  const I = { 'Very Low': 1, 'Low': 2, 'Medium': 3, 'High': 4, 'Very High': 5 };
  const score = L[likelihood] * I[impact];

  if (score >= 20) return 'Critical';
  if (score >= 12) return 'High';
  if (score >= 6) return 'Medium';
  if (score >= 3) return 'Low';
  return 'Very Low';
};

const getRiskLevelColor = (level: string) => {
  switch (level.toLowerCase()) {
    case 'critical': return 'bg-red-600 hover:bg-red-700';
    case 'high': return 'bg-orange-500 hover:bg-orange-600';
    case 'medium': return 'bg-yellow-400 hover:bg-yellow-500 text-black';
    case 'low': return 'bg-green-500 hover:bg-green-600';
    case 'very low': return 'bg-sky-500 hover:bg-sky-600';
    default: return 'bg-gray-400 hover:bg-gray-500 text-white';
  }
};


export default function GoalRisksPage() {
  const router = useRouter();
  const params = useParams();
  const goalId = params.goalId as string;

  const [goal, setGoal] = useState<Goal | null>(null);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [controls, setControls] = useState<Control[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  
  const [selectedRiskForAnalysis, setSelectedRiskForAnalysis] = useState<Risk | null>(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  
  const [selectedRiskForControl, setSelectedRiskForControl] = useState<Risk | null>(null);
  const [selectedControlForEdit, setSelectedControlForEdit] = useState<Control | null>(null);
  const [isControlModalOpen, setIsControlModalOpen] = useState(false);

  const { toast } = useToast();

  const loadData = useCallback(() => {
    if (typeof window !== 'undefined' && goalId) {
      setIsLoading(true);
      const goalsStorageKey = getGoalsStorageKey(CURRENT_UPR_ID, CURRENT_PERIOD);
      const storedGoalsData = localStorage.getItem(goalsStorageKey);
      const allGoals: Goal[] = storedGoalsData ? JSON.parse(storedGoalsData) : [];
      const currentGoal = allGoals.find(g => g.id === goalId && g.uprId === CURRENT_UPR_ID && g.period === CURRENT_PERIOD);
      
      setGoal(currentGoal || null);

      if (currentGoal) {
        const risksStorageKey = getRisksStorageKey(currentGoal.uprId, currentGoal.period, goalId);
        const storedRisksData = localStorage.getItem(risksStorageKey);
        const currentRisks: Risk[] = storedRisksData ? JSON.parse(storedRisksData) : [];
        setRisks(currentRisks);

        let allRiskControls: Control[] = [];
        currentRisks.forEach(risk => {
          const controlsStorageKey = getControlsStorageKey(currentGoal.uprId, currentGoal.period, risk.id);
          const storedControlsData = localStorage.getItem(controlsStorageKey);
          if (storedControlsData) {
            allRiskControls = [...allRiskControls, ...JSON.parse(storedControlsData)];
          }
        });
        setControls(allRiskControls);
      }
      setIsLoading(false);
    } else if (!goalId && typeof window !== 'undefined') {
        setGoal(null);
        setRisks([]);
        setControls([]);
        setIsLoading(false);
    }
  }, [goalId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      loadData();
    }
  }, [loadData]);
  
  useEffect(() => {
    if (typeof window !== 'undefined' && isLoading) {
       // This handles the case where SSR might have isLoading=true, then client sets it.
      // If loadData already set it to false, this won't run.
      const tm = setTimeout(() => setIsLoading(false), 0); // Ensure it runs after initial hydration attempts
      return () => clearTimeout(tm);
    }
  }, [isLoading]);


  const updateRisksInStorage = (goalForRisks: Goal, updatedRisks: Risk[]) => {
    if (typeof window !== 'undefined' && goalForRisks) {
      const key = getRisksStorageKey(goalForRisks.uprId, goalForRisks.period, goalForRisks.id);
      localStorage.setItem(key, JSON.stringify(updatedRisks));
    }
  };

  const updateControlsInStorage = (goalForControls: Goal, riskId: string, updatedControlsForRisk: Control[]) => {
     if (typeof window !== 'undefined' && goalForControls) {
        const key = getControlsStorageKey(goalForControls.uprId, goalForControls.period, riskId);
        localStorage.setItem(key, JSON.stringify(updatedControlsForRisk));
     }
  };

  const handleRisksIdentified = (newRisks: Risk[]) => {
    if (!goal) return;
    const updatedRisksState = [...risks, ...newRisks];
    setRisks(updatedRisksState);
    updateRisksInStorage(goal, updatedRisksState);
  };
  
  const handleOpenAnalysisModal = (riskToAnalyze: Risk) => {
    setSelectedRiskForAnalysis(riskToAnalyze);
    setIsAnalysisModalOpen(true);
  };

  const handleSaveRiskAnalysis = (updatedRisk: Risk) => {
    if (!goal) return;
    const newRisksState = risks.map(r => r.id === updatedRisk.id ? updatedRisk : r);
    setRisks(newRisksState);
    updateRisksInStorage(goal, newRisksState);
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
    if (!goal) return;
    const riskSpecificControls = controls.filter(c => c.riskId === control.riskId);
    const existingIndex = riskSpecificControls.findIndex(c => c.id === control.id);
    let updatedRiskControlsList: Control[];

    if (existingIndex > -1) {
      updatedRiskControlsList = riskSpecificControls.map(c => c.id === control.id ? control : c);
    } else {
      updatedRiskControlsList = [...riskSpecificControls, control];
    }
    
    updateControlsInStorage(goal, control.riskId, updatedRiskControlsList);
    const updatedOverallControls = controls.filter(c => c.riskId !== control.riskId).concat(updatedRiskControlsList);
    setControls(updatedOverallControls);
    
    toast({ 
        title: existingIndex > -1 ? "Control Updated" : "Control Added", 
        description: `Control "${control.description}" ${existingIndex > -1 ? 'updated' : 'added'}.` 
    });
    
    setIsControlModalOpen(false);
    setSelectedRiskForControl(null);
    setSelectedControlForEdit(null);
  };

  const handleDeleteRisk = (riskIdToDelete: string) => {
    if (!goal) return;
    const riskToDelete = risks.find(r => r.id === riskIdToDelete);
    if (!riskToDelete) return;

    const updatedRisksState = risks.filter(r => r.id !== riskIdToDelete);
    setRisks(updatedRisksState);
    updateRisksInStorage(goal, updatedRisksState);
      
    if (typeof window !== 'undefined') {
      const controlsKey = getControlsStorageKey(goal.uprId, goal.period, riskIdToDelete);
      localStorage.removeItem(controlsKey);
    }
    setControls(currentControls => currentControls.filter(c => c.riskId !== riskIdToDelete));
    toast({ title: "Risk Deleted", description: `Risk "${riskToDelete.description}" deleted.`, variant: "destructive" });
  };

  const handleDeleteControl = (controlIdToDelete: string) => {
    if (!goal) return;
    const controlToDelete = controls.find(c => c.id === controlIdToDelete);
    if (!controlToDelete) return;

    const riskIdOfControl = controlToDelete.riskId;
    const updatedRiskControlsList = controls
        .filter(c => c.riskId === riskIdOfControl && c.id !== controlIdToDelete);
    
    updateControlsInStorage(goal, riskIdOfControl, updatedRiskControlsList);
    const updatedOverallControls = controls.filter(c => c.id !== controlIdToDelete);
    setControls(updatedOverallControls);

    toast({ title: "Control Deleted", description: `Control "${controlToDelete.description}" deleted.`, variant: "destructive" });
  };


  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Loading goal data...</p>
      </div>
    );
  }
  
  if (!goal) { 
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <ShieldAlert className="w-16 h-16 text-muted-foreground mb-4" />
        <p className="text-xl text-muted-foreground">Goal not found for UPR: {CURRENT_UPR_ID}, Period: {CURRENT_PERIOD}.</p>
        <Button onClick={() => router.push('/goals')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Goals
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Risks for Goal: ${goal.name}`}
        description={`${goal.description} (UPR: ${goal.uprId}, Period: ${goal.period})`}
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
              Use the AI tool above to brainstorm risks.
            </p>
          </div>
        ) : viewMode === 'card' ? (
          <div className="space-y-4">
            {risks.map((risk) => (
              <RiskListItem
                key={risk.id}
                risk={risk}
                controls={controls.filter(c => c.riskId === risk.id)}
                onAnalyze={() => handleOpenAnalysisModal(risk)}
                onAddControl={() => handleOpenControlModal(risk)}
                onEditControl={(controlToEdit) => {
                    const parentRisk = risks.find(r => r.id === controlToEdit.riskId);
                    if (parentRisk) handleOpenControlModal(parentRisk, controlToEdit);
                }}
                onDeleteRisk={() => handleDeleteRisk(risk.id)}
                onDeleteControl={(controlId) => handleDeleteControl(controlId)}
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

      {selectedRiskForAnalysis && <RiskAnalysisModal
        risk={selectedRiskForAnalysis}
        isOpen={isAnalysisModalOpen}
        onOpenChange={setIsAnalysisModalOpen}
        onSave={handleSaveRiskAnalysis}
      />}

      {selectedRiskForControl && <RiskControlModal
        risk={selectedRiskForControl}
        existingControl={selectedControlForEdit}
        isOpen={isControlModalOpen}
        onOpenChange={(isOpen) => {
            setIsControlModalOpen(isOpen);
            if (!isOpen) {
                setSelectedRiskForControl(null);
                setSelectedControlForEdit(null);
            }
        }}
        onSave={handleSaveControl}
      />}
    </div>
  );
}
