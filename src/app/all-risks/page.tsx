
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { RiskAnalysisModal } from '@/components/risks/risk-analysis-modal';
import { RiskControlModal } from '@/components/risks/risk-control-modal';
import { AddEditRiskDialog } from '@/components/risks/add-edit-risk-dialog';
import type { Goal, Risk, Control, LikelihoodImpactLevel } from '@/lib/types';
import { PlusCircle, Loader2, ShieldAlert, Settings2, BarChart3, Trash2, Edit, ListChecks } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Helper functions for risk level and color (consistent with risks/[goalId]/page.tsx)
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
      // Load Goals
      const storedGoalsData = localStorage.getItem('riskwise-goals');
      const loadedGoals: Goal[] = storedGoalsData ? JSON.parse(storedGoalsData) : [];
      setGoals(loadedGoals);

      // Load All Risks and Controls
      let collectedRisks: Risk[] = [];
      let collectedControls: Control[] = [];

      loadedGoals.forEach(goal => {
        const storedRisksData = localStorage.getItem(`riskwise-risks-${goal.id}`);
        if (storedRisksData) {
          const goalRisks: Risk[] = JSON.parse(storedRisksData);
          collectedRisks = [...collectedRisks, ...goalRisks];
          goalRisks.forEach(risk => {
            const storedControlsData = localStorage.getItem(`riskwise-controls-${risk.id}`);
            if (storedControlsData) {
              collectedControls = [...collectedControls, ...JSON.parse(storedControlsData)];
            }
          });
        }
      });
      // Also check for risks potentially stored under a general key if we adapt to that later
      // For now, this relies on risks being under a goal.

      setAllRisks(collectedRisks);
      setAllControls(collectedControls);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);


  const updateRisksInStorage = (goalId: string, updatedRisksForGoal: Risk[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`riskwise-risks-${goalId}`, JSON.stringify(updatedRisksForGoal));
    }
  };
  
  const updateControlsInStorage = (riskId: string, updatedControlsForRisk: Control[]) => {
     if (typeof window !== 'undefined') {
        localStorage.setItem(`riskwise-controls-${riskId}`, JSON.stringify(updatedControlsForRisk));
     }
  };

  const handleRiskSave = (risk: Risk, isEditing: boolean) => {
    let newAllRisksState;
    const goalSpecificRisks = allRisks.filter(r => r.goalId === risk.goalId && r.id !== risk.id);
    
    if (isEditing) {
      newAllRisksState = allRisks.map(r => r.id === risk.id ? risk : r);
      updateRisksInStorage(risk.goalId, [...goalSpecificRisks, risk]);
      toast({ title: "Risk Updated", description: `Risk "${risk.description}" has been updated.` });
    } else {
      newAllRisksState = [...allRisks, risk];
      updateRisksInStorage(risk.goalId, [...goalSpecificRisks, risk]);
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
    setRiskToEdit(null);
    setIsAddEditRiskModalOpen(true);
  };
  
  const handleOpenAnalysisModal = (riskToAnalyze: Risk) => {
    setSelectedRiskForAnalysis(riskToAnalyze);
    setIsAnalysisModalOpen(true);
  };

  const handleSaveRiskAnalysis = (updatedRisk: Risk) => {
    const newRisksState = allRisks.map(r => r.id === updatedRisk.id ? updatedRisk : r);
    setAllRisks(newRisksState);
    
    // Update localStorage for the specific goal
    const goalRisks = newRisksState.filter(r => r.goalId === updatedRisk.goalId);
    updateRisksInStorage(updatedRisk.goalId, goalRisks);

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
    const riskSpecificControls = allControls.filter(c => c.riskId === control.riskId);
    const existingIndex = riskSpecificControls.findIndex(c => c.id === control.id);
    let updatedRiskControlsList: Control[];

    if (existingIndex > -1) {
      updatedRiskControlsList = riskSpecificControls.map(c => c.id === control.id ? control : c);
    } else {
      updatedRiskControlsList = [...riskSpecificControls, control];
    }
    
    updateControlsInStorage(control.riskId, updatedRiskControlsList);
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

    const updatedRisksState = allRisks.filter(r => r.id !== riskIdToDelete);
    setAllRisks(updatedRisksState);

    const goalRisks = updatedRisksState.filter(r => r.goalId === riskToDelete.goalId);
    updateRisksInStorage(riskToDelete.goalId, goalRisks);
      
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`riskwise-controls-${riskIdToDelete}`);
    }
    setAllControls(currentControls => currentControls.filter(c => c.riskId !== riskIdToDelete));
    toast({ title: "Risk Deleted", description: `Risk "${riskToDelete.description}" deleted.`, variant: "destructive" });
  };

  const handleDeleteControl = (controlIdToDelete: string) => {
    const controlToDelete = allControls.find(c => c.id === controlIdToDelete);
    if (!controlToDelete) return;

    const riskIdOfControl = controlToDelete.riskId;
    const updatedRiskControlsList = allControls
        .filter(c => c.riskId === riskIdOfControl && c.id !== controlIdToDelete);
    
    updateControlsInStorage(riskIdOfControl, updatedRiskControlsList); // Save only controls for this risk
    
    const updatedOverallControls = allControls.filter(c => c.id !== controlIdToDelete);
    setAllControls(updatedOverallControls);

    toast({ title: "Control Deleted", description: `Control "${controlToDelete.description}" deleted.`, variant: "destructive" });
  };


  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-10">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Loading all risks...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="All Risks"
        description="Manage all identified risks across all your goals."
        actions={
          <Button onClick={handleOpenAddRiskModal} disabled={goals.length === 0}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Risk
            {goals.length === 0 && <span className="ml-2 text-xs">(Create a goal first)</span>}
          </Button>
        }
      />

      {allRisks.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
          <ListChecks className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-lg font-medium">No risks identified yet</h3>
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

      <AddEditRiskDialog
        goals={goals}
        isOpen={isAddEditRiskModalOpen}
        onOpenChange={setIsAddEditRiskModalOpen}
        onRiskSave={handleRiskSave}
        existingRisk={riskToEdit}
      />

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
        onOpenChange={(isOpen) => {
            setIsControlModalOpen(isOpen);
            if (!isOpen) {
                setSelectedRiskForControl(null);
                setSelectedControlForEdit(null);
            }
        }}
        onSave={handleSaveControl}
      />
    </div>
  );
}
