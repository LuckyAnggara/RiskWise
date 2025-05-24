
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { RiskAnalysisModal } from '@/components/risks/risk-analysis-modal';
import { RiskControlModal } from '@/components/risks/risk-control-modal';
import { AddEditRiskDialog } from '@/components/risks/add-edit-risk-dialog';
import type { Goal, Risk, Control, LikelihoodImpactLevel } from '@/lib/types';
import { PlusCircle, Loader2, Settings2, BarChart3, Trash2, Edit, ListChecks } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Simulated current UPR and Period context
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

export default function AllRisksPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [allRisks, setAllRisks] = useState<Risk[]>([]);
  const [allControls, setAllControls] = useState<Control[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedRiskForAnalysis, setSelectedRiskForAnalysis] = useState<Risk | null>(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  
  const [selectedRiskForControl, setSelectedRiskForControl] = useState<Risk | null>(null);
  const [selectedControlForEdit, setSelectedControlForEdit] = useState<Control | null>(null);
  const [isControlModalOpen, setIsControlModalOpen] = useState(false);

  const [riskToEdit, setRiskToEdit] = useState<Risk | null>(null);
  const [isAddEditRiskModalOpen, setIsAddEditRiskModalOpen] = useState(false);

  const { toast } = useToast();

  const loadData = useCallback(() => {
    setIsLoading(true);
    if (typeof window !== 'undefined') {
      const goalsStorageKey = getGoalsStorageKey(CURRENT_UPR_ID, CURRENT_PERIOD);
      const storedGoalsData = localStorage.getItem(goalsStorageKey);
      const loadedGoals: Goal[] = storedGoalsData ? JSON.parse(storedGoalsData) : [];
      setGoals(loadedGoals);

      let collectedRisks: Risk[] = [];
      let collectedControls: Control[] = [];

      loadedGoals.forEach(goal => {
        // Ensure we only process goals matching current UPR/Period, though loadedGoals should already be filtered
        if (goal.uprId === CURRENT_UPR_ID && goal.period === CURRENT_PERIOD) {
          const risksStorageKey = getRisksStorageKey(goal.uprId, goal.period, goal.id);
          const storedRisksData = localStorage.getItem(risksStorageKey);
          if (storedRisksData) {
            const goalRisks: Risk[] = JSON.parse(storedRisksData);
            collectedRisks = [...collectedRisks, ...goalRisks];
            goalRisks.forEach(risk => {
              const controlsStorageKey = getControlsStorageKey(goal.uprId, goal.period, risk.id);
              const storedControlsData = localStorage.getItem(controlsStorageKey);
              if (storedControlsData) {
                collectedControls = [...collectedControls, ...JSON.parse(storedControlsData)];
              }
            });
          }
        }
      });
      setAllRisks(collectedRisks);
      setAllControls(collectedControls);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateRisksInStorageForGoal = (uprId: string, period: string, goalId: string, updatedRisksForGoal: Risk[]) => {
    if (typeof window !== 'undefined') {
      const key = getRisksStorageKey(uprId, period, goalId);
      localStorage.setItem(key, JSON.stringify(updatedRisksForGoal));
    }
  };
  
  const updateControlsInStorageForRisk = (uprId: string, period: string, riskId: string, updatedControlsForRisk: Control[]) => {
     if (typeof window !== 'undefined') {
        const key = getControlsStorageKey(uprId, period, riskId);
        localStorage.setItem(key, JSON.stringify(updatedControlsForRisk));
     }
  };

  const handleRiskSave = (risk: Risk, isEditing: boolean) => {
    const parentGoal = goals.find(g => g.id === risk.goalId);
    if (!parentGoal) {
        toast({ title: "Error", description: "Parent goal not found for the risk.", variant: "destructive"});
        return;
    }
    if (parentGoal.uprId !== CURRENT_UPR_ID || parentGoal.period !== CURRENT_PERIOD) {
        toast({ title: "Error", description: "Risk cannot be saved to a goal outside the current UPR/Period.", variant: "destructive"});
        return;
    }

    let newAllRisksState;
    const goalSpecificRisks = allRisks.filter(r => r.goalId === risk.goalId && r.id !== risk.id);
    
    if (isEditing) {
      newAllRisksState = allRisks.map(r => r.id === risk.id ? risk : r);
      updateRisksInStorageForGoal(parentGoal.uprId, parentGoal.period, risk.goalId, [...goalSpecificRisks, risk]);
      toast({ title: "Risk Updated", description: `Risk "${risk.description}" has been updated.` });
    } else {
      newAllRisksState = [...allRisks, risk];
      updateRisksInStorageForGoal(parentGoal.uprId, parentGoal.period, risk.goalId, [...goalSpecificRisks, risk]);
      toast({ title: "Risk Added", description: `New risk "${risk.description}" added.` });
    }
    setAllRisks(newAllRisksState);
    setIsAddEditRiskModalOpen(false);
    setRiskToEdit(null);
  };
  
  const handleOpenEditRiskModal = (risk: Risk) => {
    setRiskToEdit(risk);
    setIsAddEditRiskModalOpen(true);
  };

  const handleOpenAddRiskModal = () => {
    setRiskToEdit(null); // Ensure it's an "add" operation
    setIsAddEditRiskModalOpen(true);
  };
  
  const handleOpenAnalysisModal = (riskToAnalyze: Risk) => {
    setSelectedRiskForAnalysis(riskToAnalyze);
    setIsAnalysisModalOpen(true);
  };

  const handleSaveRiskAnalysis = (updatedRisk: Risk) => {
    const parentGoal = goals.find(g => g.id === updatedRisk.goalId);
    if (!parentGoal) return;

    const newRisksState = allRisks.map(r => r.id === updatedRisk.id ? updatedRisk : r);
    setAllRisks(newRisksState);
    
    const goalRisks = newRisksState.filter(r => r.goalId === updatedRisk.goalId);
    updateRisksInStorageForGoal(parentGoal.uprId, parentGoal.period, updatedRisk.goalId, goalRisks);

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
    const parentRisk = allRisks.find(r => r.id === control.riskId);
    if (!parentRisk) return;
    const parentGoal = goals.find(g => g.id === parentRisk.goalId);
    if (!parentGoal) return;

    const riskSpecificControls = allControls.filter(c => c.riskId === control.riskId);
    const existingIndex = riskSpecificControls.findIndex(c => c.id === control.id);
    let updatedRiskControlsList: Control[];

    if (existingIndex > -1) {
      updatedRiskControlsList = riskSpecificControls.map(c => c.id === control.id ? control : c);
    } else {
      updatedRiskControlsList = [...riskSpecificControls, control];
    }
    
    updateControlsInStorageForRisk(parentGoal.uprId, parentGoal.period, control.riskId, updatedRiskControlsList);
    const updatedOverallControls = allControls.filter(c => c.riskId !== control.riskId).concat(updatedRiskControlsList);
    setAllControls(updatedOverallControls);
    
    toast({ title: existingIndex > -1 ? "Control Updated" : "Control Added", description: `Control "${control.description}" ${existingIndex > -1 ? 'updated' : 'added'}.` });
    
    setIsControlModalOpen(false);
    setSelectedRiskForControl(null);
    setSelectedControlForEdit(null);
  };

  const handleDeleteRisk = (riskIdToDelete: string) => {
    const riskToDelete = allRisks.find(r => r.id === riskIdToDelete);
    if (!riskToDelete) return;
    const parentGoal = goals.find(g => g.id === riskToDelete.goalId);
    if (!parentGoal) return;

    const updatedRisksState = allRisks.filter(r => r.id !== riskIdToDelete);
    setAllRisks(updatedRisksState);

    const goalRisks = updatedRisksState.filter(r => r.goalId === riskToDelete.goalId);
    updateRisksInStorageForGoal(parentGoal.uprId, parentGoal.period, riskToDelete.goalId, goalRisks);
      
    if (typeof window !== 'undefined') {
      const controlsKey = getControlsStorageKey(parentGoal.uprId, parentGoal.period, riskIdToDelete);
      localStorage.removeItem(controlsKey);
    }
    setAllControls(currentControls => currentControls.filter(c => c.riskId !== riskIdToDelete));
    toast({ title: "Risk Deleted", description: `Risk "${riskToDelete.description}" deleted.`, variant: "destructive" });
  };

  const handleDeleteControl = (controlIdToDelete: string) => {
    const controlToDelete = allControls.find(c => c.id === controlIdToDelete);
    if (!controlToDelete) return;
    const parentRisk = allRisks.find(r => r.id === controlToDelete.riskId);
    if(!parentRisk) return;
    const parentGoal = goals.find(g => g.id === parentRisk.goalId);
    if (!parentGoal) return;


    const riskIdOfControl = controlToDelete.riskId;
    const updatedRiskControlsList = allControls
        .filter(c => c.riskId === riskIdOfControl && c.id !== controlIdToDelete);
    
    updateControlsInStorageForRisk(parentGoal.uprId, parentGoal.period, riskIdOfControl, updatedRiskControlsList); 
    
    const updatedOverallControls = allControls.filter(c => c.id !== controlIdToDelete);
    setAllControls(updatedOverallControls);

    toast({ title: "Control Deleted", description: `Control "${controlToDelete.description}" deleted.`, variant: "destructive" });
  };


  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Loading all risks for UPR: {CURRENT_UPR_ID}, Period: {CURRENT_PERIOD}...</p>
      </div>
    );
  }

  // Filter goals for the AddEditRiskDialog to only show goals from the current UPR/Period
  const relevantGoals = goals.filter(g => g.uprId === CURRENT_UPR_ID && g.period === CURRENT_PERIOD);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`All Risks for UPR: ${CURRENT_UPR_ID} (Period: ${CURRENT_PERIOD})`}
        description="Manage all identified risks across all your goals for the current unit and period."
        actions={
          <Button onClick={handleOpenAddRiskModal} disabled={relevantGoals.length === 0}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Risk
            {relevantGoals.length === 0 && <span className="ml-2 text-xs">(Create a goal in this UPR/Period first)</span>}
          </Button>
        }
      />

      {allRisks.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
          <ListChecks className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-lg font-medium">No risks identified yet for this UPR/Period</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Click "Add New Risk" to start populating your risk register.
          </p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%]">Description</TableHead>
                  <TableHead>Associated Goal</TableHead>
                  <TableHead>Likelihood</TableHead>
                  <TableHead>Impact</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Controls</TableHead>
                  <TableHead className="text-right w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allRisks.map((risk) => {
                  const riskLevelValue = getRiskLevel(risk.likelihood, risk.impact);
                  const riskControlsList = allControls.filter(c => c.riskId === risk.id);
                  const associatedGoal = goals.find(g => g.id === risk.goalId);
                  return (
                    <TableRow key={risk.id}>
                      <TableCell className="font-medium max-w-xs truncate" title={risk.description}>
                          {risk.description}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate" title={associatedGoal?.name}>
                        {associatedGoal?.name || 'N/A'}
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
                            <DropdownMenuItem onClick={() => handleOpenEditRiskModal(risk)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit Risk
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenAnalysisModal(risk)}>
                              <BarChart3 className="mr-2 h-4 w-4" /> Analyze / Set Level
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenControlModal(risk)}>
                              <PlusCircle className="mr-2 h-4 w-4" /> Manage Controls
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

      {isAddEditRiskModalOpen && <AddEditRiskDialog
        goals={relevantGoals} // Pass only relevant goals
        isOpen={isAddEditRiskModalOpen}
        onOpenChange={setIsAddEditRiskModalOpen}
        onRiskSave={handleRiskSave}
        existingRisk={riskToEdit}
        currentUprId={CURRENT_UPR_ID}
        currentPeriod={CURRENT_PERIOD}
      />}

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
