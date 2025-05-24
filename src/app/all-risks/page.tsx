
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { RiskAnalysisModal } from '@/components/risks/risk-analysis-modal';
import { RiskControlModal } from '@/components/risks/risk-control-modal';
import { AddEditPotentialRiskDialog } from '@/components/risks/add-edit-potential-risk-dialog';
import { ManageRiskCausesDialog } from '@/components/risks/manage-risk-causes-dialog';
import type { Goal, PotentialRisk, Control, RiskCause, LikelihoodImpactLevel } from '@/lib/types';
import { PlusCircle, Loader2, Settings2, BarChart3, Trash2, Edit, ListChecks, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getCurrentUprId, getCurrentPeriod, initializeAppContext } from '@/lib/upr-period-context';

const getGoalsStorageKey = (uprId: string, period: string) => `riskwise-upr${uprId}-period${period}-goals`;
const getPotentialRisksStorageKey = (uprId: string, period: string, goalId: string) => `riskwise-upr${uprId}-period${period}-goal${goalId}-potentialRisks`;
const getControlsStorageKey = (uprId: string, period: string, potentialRiskId: string) => `riskwise-upr${uprId}-period${period}-potentialRisk${potentialRiskId}-controls`;
const getRiskCausesStorageKey = (uprId: string, period: string, potentialRiskId: string) => `riskwise-upr${uprId}-period${period}-potentialRisk${potentialRiskId}-causes`;


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
    case 'medium': return 'bg-yellow-400 hover:bg-yellow-500 text-black dark:bg-yellow-500 dark:text-black';
    case 'low': return 'bg-green-500 hover:bg-green-600';
    case 'very low': return 'bg-sky-500 hover:bg-sky-600';
    default: return 'bg-gray-400 hover:bg-gray-500 text-white';
  }
};

export default function AllRisksPage() {
  const [currentUprId, setCurrentUprId] = useState('');
  const [currentPeriod, setCurrentPeriod] = useState('');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [allPotentialRisks, setAllPotentialRisks] = useState<PotentialRisk[]>([]);
  const [allControls, setAllControls] = useState<Control[]>([]);
  const [allRiskCauses, setAllRiskCauses] = useState<RiskCause[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedPotentialRiskForAnalysis, setSelectedPotentialRiskForAnalysis] = useState<PotentialRisk | null>(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  
  const [selectedPotentialRiskForControl, setSelectedPotentialRiskForControl] = useState<PotentialRisk | null>(null);
  const [selectedControlForEdit, setSelectedControlForEdit] = useState<Control | null>(null);
  const [isControlModalOpen, setIsControlModalOpen] = useState(false);

  const [potentialRiskToEdit, setPotentialRiskToEdit] = useState<PotentialRisk | null>(null);
  const [isAddEditPotentialRiskModalOpen, setIsAddEditPotentialRiskModalOpen] = useState(false);

  const [selectedPotentialRiskForCauses, setSelectedPotentialRiskForCauses] = useState<PotentialRisk | null>(null);
  const [isManageCausesModalOpen, setIsManageCausesModalOpen] = useState(false);

  const { toast } = useToast();

  const loadData = useCallback(() => {
    if (typeof window !== 'undefined' && currentUprId && currentPeriod) {
      setIsLoading(true);
      const goalsStorageKey = getGoalsStorageKey(currentUprId, currentPeriod);
      const storedGoalsData = localStorage.getItem(goalsStorageKey);
      const loadedGoals: Goal[] = storedGoalsData ? JSON.parse(storedGoalsData) : [];
      setGoals(loadedGoals);

      let collectedPotentialRisks: PotentialRisk[] = [];
      let collectedControls: Control[] = [];
      let collectedRiskCauses: RiskCause[] = [];

      loadedGoals.forEach(goal => {
        const potentialRisksStorageKey = getPotentialRisksStorageKey(goal.uprId, goal.period, goal.id);
        const storedPotentialRisksData = localStorage.getItem(potentialRisksStorageKey);
        if (storedPotentialRisksData) {
          const goalPotentialRisks: PotentialRisk[] = JSON.parse(storedPotentialRisksData);
          collectedPotentialRisks = [...collectedPotentialRisks, ...goalPotentialRisks];
          goalPotentialRisks.forEach(pRisk => {
            const controlsStorageKey = getControlsStorageKey(goal.uprId, goal.period, pRisk.id);
            const storedControlsData = localStorage.getItem(controlsStorageKey);
            if (storedControlsData) {
              collectedControls = [...collectedControls, ...JSON.parse(storedControlsData)];
            }
            const causesStorageKey = getRiskCausesStorageKey(goal.uprId, goal.period, pRisk.id);
            const storedCausesData = localStorage.getItem(causesStorageKey);
            if (storedCausesData) {
              collectedRiskCauses = [...collectedRiskCauses, ...JSON.parse(storedCausesData)];
            }
          });
        }
      });
      setAllPotentialRisks(collectedPotentialRisks.sort((a,b) => a.description.localeCompare(b.description)));
      setAllControls(collectedControls);
      setAllRiskCauses(collectedRiskCauses);
      setIsLoading(false);
    }
  }, [currentUprId, currentPeriod]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const context = initializeAppContext();
      setCurrentUprId(context.uprId);
      setCurrentPeriod(context.period);
    }
  }, []);

  useEffect(() => {
    if (currentUprId && currentPeriod) {
      loadData();
    }
  }, [loadData, currentUprId, currentPeriod]);

  const updatePotentialRisksInStorageForGoal = (uprId: string, period: string, goalId: string, updatedPotentialRisksForGoal: PotentialRisk[]) => {
    if (typeof window !== 'undefined') {
      const key = getPotentialRisksStorageKey(uprId, period, goalId);
      localStorage.setItem(key, JSON.stringify(updatedPotentialRisksForGoal));
    }
  };
  
  const updateControlsInStorageForPotentialRisk = (uprId: string, period: string, potentialRiskId: string, updatedControlsForPotentialRisk: Control[]) => {
     if (typeof window !== 'undefined') {
        const key = getControlsStorageKey(uprId, period, potentialRiskId);
        localStorage.setItem(key, JSON.stringify(updatedControlsForPotentialRisk));
     }
  };

  const handlePotentialRiskSave = (potentialRisk: PotentialRisk, isNew: boolean) => {
    const parentGoal = goals.find(g => g.id === potentialRisk.goalId);
    if (!parentGoal) {
        toast({ title: "Error", description: "Parent goal not found for the potential risk.", variant: "destructive"});
        return;
    }
    if (parentGoal.uprId !== currentUprId || parentGoal.period !== currentPeriod) {
        toast({ title: "Context Mismatch", description: "Cannot save potential risk for a goal outside the current UPR/Period context.", variant: "destructive" });
        return;
    }
    
    let newAllPotentialRisksState;
    const goalSpecificPotentialRisks = allPotentialRisks.filter(pr => pr.goalId === potentialRisk.goalId && pr.id !== potentialRisk.id);
    
    if (!isNew) { 
      newAllPotentialRisksState = allPotentialRisks.map(pr => pr.id === potentialRisk.id ? potentialRisk : pr);
      updatePotentialRisksInStorageForGoal(parentGoal.uprId, parentGoal.period, potentialRisk.goalId, [...goalSpecificPotentialRisks, potentialRisk].sort((a,b) => a.description.localeCompare(b.description)));
      toast({ title: "Potential Risk Updated", description: `Potential risk "${potentialRisk.description}" has been updated.` });
    } else { 
      newAllPotentialRisksState = [...allPotentialRisks, potentialRisk];
      updatePotentialRisksInStorageForGoal(parentGoal.uprId, parentGoal.period, potentialRisk.goalId, [...goalSpecificPotentialRisks, potentialRisk].sort((a,b) => a.description.localeCompare(b.description)));
      toast({ title: "Potential Risk Added", description: `New potential risk "${potentialRisk.description}" added.` });
    }
    setAllPotentialRisks(newAllPotentialRisksState.sort((a,b) => a.description.localeCompare(b.description)));
    setIsAddEditPotentialRiskModalOpen(false);
    setPotentialRiskToEdit(null);
  };
  
  const handleOpenEditPotentialRiskModal = (pRisk: PotentialRisk) => {
    setPotentialRiskToEdit(pRisk);
    setIsAddEditPotentialRiskModalOpen(true);
  };

  const handleOpenAddPotentialRiskModal = () => {
    setPotentialRiskToEdit(null); 
    setIsAddEditPotentialRiskModalOpen(true);
  };
  
  const handleOpenAnalysisModal = (pRiskToAnalyze: PotentialRisk) => {
    setSelectedPotentialRiskForAnalysis(pRiskToAnalyze);
    setIsAnalysisModalOpen(true);
  };

  const handleSaveRiskAnalysis = (updatedPotentialRisk: PotentialRisk) => {
    const parentGoal = goals.find(g => g.id === updatedPotentialRisk.goalId);
    if (!parentGoal) return;

    const newPotentialRisksState = allPotentialRisks.map(pr => pr.id === updatedPotentialRisk.id ? updatedPotentialRisk : pr);
    setAllPotentialRisks(newPotentialRisksState);
    
    const goalPotentialRisks = newPotentialRisksState.filter(pr => pr.goalId === updatedPotentialRisk.goalId);
    updatePotentialRisksInStorageForGoal(parentGoal.uprId, parentGoal.period, updatedPotentialRisk.goalId, goalPotentialRisks);

    toast({ title: "Potential Risk Analyzed", description: `Analysis saved for: "${updatedPotentialRisk.description}"`});
    setIsAnalysisModalOpen(false);
    setSelectedPotentialRiskForAnalysis(null);
  };

  const handleOpenControlModal = (pRiskForControl: PotentialRisk, controlToEdit?: Control) => {
    setSelectedPotentialRiskForControl(pRiskForControl);
    setSelectedControlForEdit(controlToEdit || null);
    setIsControlModalOpen(true);
  };

  const handleSaveControl = (control: Control) => {
    const parentPotentialRisk = allPotentialRisks.find(pr => pr.id === control.potentialRiskId);
    if (!parentPotentialRisk) return;
    const parentGoal = goals.find(g => g.id === parentPotentialRisk.goalId);
    if (!parentGoal) return;

    const riskSpecificControls = allControls.filter(c => c.potentialRiskId === control.potentialRiskId);
    const existingIndex = riskSpecificControls.findIndex(c => c.id === control.id);
    let updatedRiskControlsList: Control[];

    if (existingIndex > -1) {
      updatedRiskControlsList = riskSpecificControls.map(c => c.id === control.id ? control : c);
    } else {
      updatedRiskControlsList = [...riskSpecificControls, control];
    }
    
    updateControlsInStorageForPotentialRisk(parentGoal.uprId, parentGoal.period, control.potentialRiskId, updatedRiskControlsList);
    const updatedOverallControls = allControls.filter(c => c.potentialRiskId !== control.potentialRiskId).concat(updatedRiskControlsList);
    setAllControls(updatedOverallControls);
    
    toast({ title: existingIndex > -1 ? "Control Updated" : "Control Added", description: `Control "${control.description}" ${existingIndex > -1 ? 'updated' : 'added'}.` });
    
    setIsControlModalOpen(false);
    setSelectedPotentialRiskForControl(null);
    setSelectedControlForEdit(null);
  };

  const handleDeletePotentialRisk = (pRiskIdToDelete: string) => {
    const pRiskToDelete = allPotentialRisks.find(pr => pr.id === pRiskIdToDelete);
    if (!pRiskToDelete) return;
    const parentGoal = goals.find(g => g.id === pRiskToDelete.goalId);
    if (!parentGoal) return;

    const updatedPotentialRisksState = allPotentialRisks.filter(pr => pr.id !== pRiskIdToDelete);
    setAllPotentialRisks(updatedPotentialRisksState);

    const goalPotentialRisks = updatedPotentialRisksState.filter(pr => pr.goalId === pRiskToDelete.goalId);
    updatePotentialRisksInStorageForGoal(parentGoal.uprId, parentGoal.period, pRiskToDelete.goalId, goalPotentialRisks);
      
    if (typeof window !== 'undefined') {
      localStorage.removeItem(getControlsStorageKey(parentGoal.uprId, parentGoal.period, pRiskIdToDelete));
      localStorage.removeItem(getRiskCausesStorageKey(parentGoal.uprId, parentGoal.period, pRiskIdToDelete));
    }
    setAllControls(currentControls => currentControls.filter(c => c.potentialRiskId !== pRiskIdToDelete));
    setAllRiskCauses(currentCauses => currentCauses.filter(rc => rc.potentialRiskId !== pRiskIdToDelete));
    toast({ title: "Potential Risk Deleted", description: `Potential risk "${pRiskToDelete.description}" deleted.`, variant: "destructive" });
  };

  const handleDeleteControl = (controlIdToDelete: string) => {
    const controlToDelete = allControls.find(c => c.id === controlIdToDelete);
    if (!controlToDelete) return;
    const parentPotentialRisk = allPotentialRisks.find(pr => pr.id === controlToDelete.potentialRiskId);
    if(!parentPotentialRisk) return;
    const parentGoal = goals.find(g => g.id === parentPotentialRisk.goalId);
    if (!parentGoal) return;

    const pRiskIdOfControl = controlToDelete.potentialRiskId;
    const updatedRiskControlsList = allControls
        .filter(c => c.potentialRiskId === pRiskIdOfControl && c.id !== controlIdToDelete);
    
    updateControlsInStorageForPotentialRisk(parentGoal.uprId, parentGoal.period, pRiskIdOfControl, updatedRiskControlsList); 
    
    const updatedOverallControls = allControls.filter(c => c.id !== controlIdToDelete);
    setAllControls(updatedOverallControls);

    toast({ title: "Control Deleted", description: `Control "${controlToDelete.description}" deleted.`, variant: "destructive" });
  };

  const handleOpenManageCausesModal = (pRisk: PotentialRisk) => {
    setSelectedPotentialRiskForCauses(pRisk);
    setIsManageCausesModalOpen(true);
  };

  const handleCausesUpdate = (potentialRiskId: string, updatedCauses: RiskCause[]) => {
    const remainingCauses = allRiskCauses.filter(rc => rc.potentialRiskId !== potentialRiskId);
    setAllRiskCauses([...remainingCauses, ...updatedCauses]);
    // Parent already updated localStorage, this just syncs the main state
  };


  if (isLoading || !currentUprId || !currentPeriod) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Loading all potential risks data...</p>
      </div>
    );
  }

  const relevantGoals = goals.filter(g => g.uprId === currentUprId && g.period === currentPeriod);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`All Potential Risks`}
        description={`Manage all identified potential risks across all goals for UPR: ${currentUprId}, Period: ${currentPeriod}.`}
        actions={
          <Button onClick={handleOpenAddPotentialRiskModal} disabled={relevantGoals.length === 0}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Potential Risk
            {relevantGoals.length === 0 && <span className="ml-2 text-xs">(Create a goal first)</span>}
          </Button>
        }
      />

      {allPotentialRisks.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
          <ListChecks className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-lg font-medium">No potential risks identified yet for this UPR/Period</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Click "Add New Potential Risk" to start populating your risk register, or identify risks from specific goals.
          </p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[25%]">Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Associated Goal</TableHead>
                  <TableHead>Likelihood</TableHead>
                  <TableHead>Impact</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Causes</TableHead>
                  <TableHead>Controls</TableHead>
                  <TableHead className="text-right w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allPotentialRisks.map((pRisk) => {
                  const riskLevelValue = getRiskLevel(pRisk.likelihood, pRisk.impact);
                  const riskControlsList = allControls.filter(c => c.potentialRiskId === pRisk.id);
                  const riskCausesList = allRiskCauses.filter(rc => rc.potentialRiskId === pRisk.id);
                  const associatedGoal = goals.find(g => g.id === pRisk.goalId);
                  return (
                    <TableRow key={pRisk.id}>
                      <TableCell className="font-medium max-w-[200px] truncate" title={pRisk.description}>
                          {pRisk.description}
                      </TableCell>
                       <TableCell className="text-xs max-w-[100px] truncate" title={pRisk.category || ''}>
                        <Badge variant={pRisk.category ? "secondary" : "outline"}>{pRisk.category || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-[100px] truncate" title={pRisk.owner || ''}>{pRisk.owner || 'N/A'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate" title={associatedGoal?.name}>
                        {associatedGoal?.name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={pRisk.likelihood ? "secondary" : "outline"}>
                          {pRisk.likelihood || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={pRisk.impact ? "secondary" : "outline"}>
                          {pRisk.impact || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getRiskLevelColor(riskLevelValue)} text-white`}>
                          {riskLevelValue}
                        </Badge>
                      </TableCell>
                      <TableCell>{riskCausesList.length}</TableCell>
                      <TableCell>{riskControlsList.length}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Settings2 className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenEditPotentialRiskModal(pRisk)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenManageCausesModal(pRisk)}>
                              <Zap className="mr-2 h-4 w-4" /> Manage Causes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenAnalysisModal(pRisk)}>
                              <BarChart3 className="mr-2 h-4 w-4" /> Analyze Level
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenControlModal(pRisk)}>
                              <PlusCircle className="mr-2 h-4 w-4" /> Manage Controls
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDeletePotentialRisk(pRisk.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Potential Risk
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

      {isAddEditPotentialRiskModalOpen && <AddEditPotentialRiskDialog
        goals={relevantGoals} 
        isOpen={isAddEditPotentialRiskModalOpen}
        onOpenChange={setIsAddEditPotentialRiskModalOpen}
        onPotentialRiskSave={handlePotentialRiskSave}
        existingPotentialRisk={potentialRiskToEdit}
        currentUprId={currentUprId} 
        currentPeriod={currentPeriod}
      />}

      {selectedPotentialRiskForAnalysis && <RiskAnalysisModal
        potentialRisk={selectedPotentialRiskForAnalysis}
        isOpen={isAnalysisModalOpen}
        onOpenChange={setIsAnalysisModalOpen}
        onSave={handleSaveRiskAnalysis}
      />}

      {selectedPotentialRiskForControl && <RiskControlModal
        potentialRisk={selectedPotentialRiskForControl}
        existingControl={selectedControlForEdit}
        isOpen={isControlModalOpen}
        onOpenChange={(isOpen) => {
            setIsControlModalOpen(isOpen);
            if (!isOpen) {
                setSelectedPotentialRiskForControl(null);
                setSelectedControlForEdit(null);
            }
        }}
        onSave={handleSaveControl}
      />}

      {selectedPotentialRiskForCauses && (
        <ManageRiskCausesDialog
            potentialRisk={selectedPotentialRiskForCauses}
            goalUprId={goals.find(g => g.id === selectedPotentialRiskForCauses.goalId)?.uprId || currentUprId}
            goalPeriod={goals.find(g => g.id === selectedPotentialRiskForCauses.goalId)?.period || currentPeriod}
            isOpen={isManageCausesModalOpen}
            onOpenChange={(isOpen) => {
                setIsManageCausesModalOpen(isOpen);
                if (!isOpen) setSelectedPotentialRiskForCauses(null);
            }}
            onCausesUpdate={handleCausesUpdate}
            initialCauses={allRiskCauses.filter(rc => rc.potentialRiskId === selectedPotentialRiskForCauses.id)}
        />
      )}
    </div>
  );
}
