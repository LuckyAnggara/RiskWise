
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { RiskIdentificationCard } from '@/components/risks/risk-identification-card';
import { RiskListItem } from '@/components/risks/risk-list-item';
import { RiskAnalysisModal } from '@/components/risks/risk-analysis-modal';
import { RiskControlModal } from '@/components/risks/risk-control-modal';
import { ManageRiskCausesDialog } from '@/components/risks/manage-risk-causes-dialog'; // Import new dialog
import type { Goal, PotentialRisk, Control, RiskCause, LikelihoodImpactLevel } from '@/lib/types';
import { ArrowLeft, ShieldAlert, Loader2, LayoutGrid, List, Settings2, BarChart3, PlusCircle, Trash2, Zap, Edit } from 'lucide-react'; // Added Edit
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
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


export default function GoalRisksPage() {
  const router = useRouter();
  const params = useParams();
  const goalId = params.goalId as string;

  const [currentUprId, setCurrentUprId] = useState('');
  const [currentPeriod, setCurrentPeriod] = useState('');
  const [goal, setGoal] = useState<Goal | null>(null);
  const [potentialRisks, setPotentialRisks] = useState<PotentialRisk[]>([]);
  const [controls, setControls] = useState<Control[]>([]);
  const [riskCauses, setRiskCauses] = useState<RiskCause[]>([]); // State for risk causes
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  
  const [selectedPotentialRiskForAnalysis, setSelectedPotentialRiskForAnalysis] = useState<PotentialRisk | null>(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  
  const [selectedPotentialRiskForControl, setSelectedPotentialRiskForControl] = useState<PotentialRisk | null>(null);
  const [selectedControlForEdit, setSelectedControlForEdit] = useState<Control | null>(null);
  const [isControlModalOpen, setIsControlModalOpen] = useState(false);

  const [selectedPotentialRiskForCauses, setSelectedPotentialRiskForCauses] = useState<PotentialRisk | null>(null); // For managing causes
  const [isManageCausesModalOpen, setIsManageCausesModalOpen] = useState(false);

  const { toast } = useToast();

  const loadData = useCallback(() => {
    if (typeof window !== 'undefined' && goalId && currentUprId && currentPeriod) {
      setIsLoading(true);
      const goalsStorageKey = getGoalsStorageKey(currentUprId, currentPeriod);
      const storedGoalsData = localStorage.getItem(goalsStorageKey);
      const allGoals: Goal[] = storedGoalsData ? JSON.parse(storedGoalsData) : [];
      const currentGoal = allGoals.find(g => g.id === goalId && g.uprId === currentUprId && g.period === currentPeriod);
      
      setGoal(currentGoal || null);

      if (currentGoal) {
        const potentialRisksStorageKey = getPotentialRisksStorageKey(currentGoal.uprId, currentGoal.period, goalId);
        const storedPotentialRisksData = localStorage.getItem(potentialRisksStorageKey);
        const currentPotentialRisks: PotentialRisk[] = storedPotentialRisksData ? JSON.parse(storedPotentialRisksData) : [];
        setPotentialRisks(currentPotentialRisks.sort((a,b) => a.description.localeCompare(b.description)));

        let allRiskControls: Control[] = [];
        let allRiskCausesForGoal: RiskCause[] = [];
        currentPotentialRisks.forEach(pRisk => {
          const controlsStorageKey = getControlsStorageKey(currentGoal.uprId, currentGoal.period, pRisk.id);
          const storedControlsData = localStorage.getItem(controlsStorageKey);
          if (storedControlsData) {
            allRiskControls = [...allRiskControls, ...JSON.parse(storedControlsData)];
          }
          const causesStorageKey = getRiskCausesStorageKey(currentGoal.uprId, currentGoal.period, pRisk.id);
          const storedCausesData = localStorage.getItem(causesStorageKey);
          if (storedCausesData) {
            allRiskCausesForGoal = [...allRiskCausesForGoal, ...JSON.parse(storedCausesData)];
          }
        });
        setControls(allRiskControls);
        setRiskCauses(allRiskCausesForGoal);
      } else {
        setPotentialRisks([]);
        setControls([]);
        setRiskCauses([]);
      }
      setIsLoading(false);
    } else if (typeof window !== 'undefined' && (!goalId || !currentUprId || !currentPeriod)) {
        setGoal(null);
        setPotentialRisks([]);
        setControls([]);
        setRiskCauses([]);
        setIsLoading(false);
    }
  }, [goalId, currentUprId, currentPeriod]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const context = initializeAppContext();
      setCurrentUprId(context.uprId);
      setCurrentPeriod(context.period);
    }
  }, []);
  
  useEffect(() => {
    if (currentUprId && currentPeriod && goalId) {
      loadData();
    } else if (currentUprId && currentPeriod && !goalId){
        setIsLoading(false);
        setGoal(null);
    }
  }, [loadData, currentUprId, currentPeriod, goalId, router]); // Added router

  const updatePotentialRisksInStorage = (goalForPotentialRisks: Goal, updatedPRisks: PotentialRisk[]) => {
    if (typeof window !== 'undefined' && goalForPotentialRisks) {
      const key = getPotentialRisksStorageKey(goalForPotentialRisks.uprId, goalForPotentialRisks.period, goalForPotentialRisks.id);
      localStorage.setItem(key, JSON.stringify(updatedPRisks));
    }
  };

  const updateControlsInStorage = (goalForControls: Goal, potentialRiskId: string, updatedControlsForPRisk: Control[]) => {
     if (typeof window !== 'undefined' && goalForControls) {
        const key = getControlsStorageKey(goalForControls.uprId, goalForControls.period, potentialRiskId);
        localStorage.setItem(key, JSON.stringify(updatedControlsForPRisk));
     }
  };

  const handlePotentialRisksIdentified = (newPotentialRisks: PotentialRisk[]) => {
    if (!goal) return;
    const updatedPotentialRisksState = [...potentialRisks, ...newPotentialRisks].sort((a,b) => a.description.localeCompare(b.description));
    setPotentialRisks(updatedPotentialRisksState);
    updatePotentialRisksInStorage(goal, updatedPotentialRisksState);
    toast({
        title: "Potential Risks Identified!",
        description: `${newPotentialRisks.length} potential risks brainstormed for "${goal.name}". You can now edit their details and add causes.`
    });
  };
  
  const handleOpenAnalysisModal = (pRiskToAnalyze: PotentialRisk) => {
    setSelectedPotentialRiskForAnalysis(pRiskToAnalyze);
    setIsAnalysisModalOpen(true);
  };

  const handleSaveRiskAnalysis = (updatedPotentialRisk: PotentialRisk) => {
    if (!goal) return;
    const newPotentialRisksState = potentialRisks.map(pr => pr.id === updatedPotentialRisk.id ? updatedPotentialRisk : pr).sort((a,b) => a.description.localeCompare(b.description));
    setPotentialRisks(newPotentialRisksState);
    updatePotentialRisksInStorage(goal, newPotentialRisksState);
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
    if (!goal) return;
    const pRiskSpecificControls = controls.filter(c => c.potentialRiskId === control.potentialRiskId);
    const existingIndex = pRiskSpecificControls.findIndex(c => c.id === control.id);
    let updatedPRiskControlsList: Control[];

    if (existingIndex > -1) {
      updatedPRiskControlsList = pRiskSpecificControls.map(c => c.id === control.id ? control : c);
    } else {
      updatedPRiskControlsList = [...pRiskSpecificControls, control];
    }
    
    updateControlsInStorage(goal, control.potentialRiskId, updatedPRiskControlsList);
    const updatedOverallControls = controls.filter(c => c.potentialRiskId !== control.potentialRiskId).concat(updatedPRiskControlsList);
    setControls(updatedOverallControls);
    
    toast({ 
        title: existingIndex > -1 ? "Control Updated" : "Control Added", 
        description: `Control "${control.description}" ${existingIndex > -1 ? 'updated' : 'added'}.` 
    });
    
    setIsControlModalOpen(false);
    setSelectedPotentialRiskForControl(null);
    setSelectedControlForEdit(null);
  };

  const handleDeletePotentialRisk = (pRiskIdToDelete: string) => {
    if (!goal) return;
    const pRiskToDelete = potentialRisks.find(pr => pr.id === pRiskIdToDelete);
    if (!pRiskToDelete) return;

    const updatedPotentialRisksState = potentialRisks.filter(pr => pr.id !== pRiskIdToDelete).sort((a,b) => a.description.localeCompare(b.description));
    setPotentialRisks(updatedPotentialRisksState);
    updatePotentialRisksInStorage(goal, updatedPotentialRisksState);
      
    if (typeof window !== 'undefined') {
      localStorage.removeItem(getControlsStorageKey(goal.uprId, goal.period, pRiskIdToDelete));
      localStorage.removeItem(getRiskCausesStorageKey(goal.uprId, goal.period, pRiskIdToDelete));
    }
    setControls(currentControls => currentControls.filter(c => c.potentialRiskId !== pRiskIdToDelete));
    setRiskCauses(currentCauses => currentCauses.filter(rc => rc.potentialRiskId !== pRiskIdToDelete));
    toast({ title: "Potential Risk Deleted", description: `Potential risk "${pRiskToDelete.description}" deleted.`, variant: "destructive" });
  };

  const handleDeleteControl = (controlIdToDelete: string) => {
    if (!goal) return;
    const controlToDelete = controls.find(c => c.id === controlIdToDelete);
    if (!controlToDelete) return;

    const pRiskIdOfControl = controlToDelete.potentialRiskId;
    const updatedPRiskControlsList = controls
        .filter(c => c.potentialRiskId === pRiskIdOfControl && c.id !== controlIdToDelete);
    
    updateControlsInStorage(goal, pRiskIdOfControl, updatedPRiskControlsList); 
    const updatedOverallControls = controls.filter(c => c.id !== controlIdToDelete);
    setControls(updatedOverallControls);

    toast({ title: "Control Deleted", description: `Control "${controlToDelete.description}" deleted.`, variant: "destructive" });
  };

  const handleOpenManageCausesModal = (pRisk: PotentialRisk) => {
    setSelectedPotentialRiskForCauses(pRisk);
    setIsManageCausesModalOpen(true);
  };

  const handleCausesUpdate = (potentialRiskId: string, updatedCauses: RiskCause[]) => {
    const otherCauses = riskCauses.filter(rc => rc.potentialRiskId !== potentialRiskId);
    setRiskCauses([...otherCauses, ...updatedCauses]);
  };


  if (isLoading) { // Simplified loading check
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Loading goal and potential risk data...</p>
      </div>
    );
  }
  
  if (!goal && !isLoading) { 
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <ShieldAlert className="w-16 h-16 text-muted-foreground mb-4" />
        <p className="text-xl text-muted-foreground">Goal not found for UPR: {currentUprId}, Period: {currentPeriod}.</p>
        <Button onClick={() => router.push('/goals')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Goals
        </Button>
      </div>
    );
  }
  
  if (!goal) return null; // Should be caught by above, but good for TS

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Potential Risks for Goal: ${goal.name}`}
        description={`${goal.description}`}
        actions={
          <Button onClick={() => router.push('/goals')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Goals
          </Button>
        }
      />

      <RiskIdentificationCard goal={goal} onPotentialRisksIdentified={handlePotentialRisksIdentified} />
      
      <Separator />

      <div>
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Identified Potential Risks ({potentialRisks.length})</h2>
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

        {potentialRisks.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
            <ShieldAlert className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-lg font-medium">No potential risks identified yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Use the AI tool above to brainstorm potential risks for this goal.
            </p>
          </div>
        ) : viewMode === 'card' ? (
          <div className="space-y-4">
            {potentialRisks.map((pRisk) => (
              <RiskListItem
                key={pRisk.id}
                potentialRisk={pRisk}
                controls={controls.filter(c => c.potentialRiskId === pRisk.id)}
                riskCauses={riskCauses.filter(rc => rc.potentialRiskId === pRisk.id)}
                onAnalyze={() => handleOpenAnalysisModal(pRisk)}
                onAddControl={() => handleOpenControlModal(pRisk)}
                onEditControl={(controlToEdit) => {
                    const parentPRisk = potentialRisks.find(pr => pr.id === controlToEdit.potentialRiskId);
                    if (parentPRisk) handleOpenControlModal(parentPRisk, controlToEdit);
                }}
                onDeletePotentialRisk={() => handleDeletePotentialRisk(pRisk.id)}
                onDeleteControl={(controlId) => handleDeleteControl(controlId)}
                onManageCauses={() => handleOpenManageCausesModal(pRisk)} // Can keep this for quick access from card view
                onEditDetails={() => router.push(`/all-risks/manage/${pRisk.id}`)} // New prop
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Likelihood</TableHead>
                    <TableHead>Impact</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Causes</TableHead>
                    <TableHead>Controls</TableHead>
                    <TableHead className="text-right w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {potentialRisks.map((pRisk) => {
                    const riskLevelValue = getRiskLevel(pRisk.likelihood, pRisk.impact);
                    const riskControlsList = controls.filter(c => c.potentialRiskId === pRisk.id);
                    const riskCausesList = riskCauses.filter(rc => rc.potentialRiskId === pRisk.id);
                    return (
                      <TableRow key={pRisk.id}>
                        <TableCell className="font-medium max-w-xs truncate" title={pRisk.description}>
                            {pRisk.description}
                        </TableCell>
                        <TableCell><Badge variant={pRisk.category ? "outline" : "ghost"}>{pRisk.category || 'N/A'}</Badge></TableCell>
                        <TableCell className="text-xs truncate max-w-[100px]" title={pRisk.owner || ''}>{pRisk.owner || 'N/A'}</TableCell>
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
                               <DropdownMenuItem onClick={() => router.push(`/all-risks/manage/${pRisk.id}`)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit Details & Causes
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenManageCausesModal(pRisk)}>
                                <Zap className="mr-2 h-4 w-4" /> Manage Causes (Quick)
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenAnalysisModal(pRisk)}>
                                <BarChart3 className="mr-2 h-4 w-4" /> Analyze Level
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenControlModal(pRisk)}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Control
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
      </div>

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

      {selectedPotentialRiskForCauses && goal && (
        <ManageRiskCausesDialog
            potentialRisk={selectedPotentialRiskForCauses}
            goalUprId={goal.uprId}
            goalPeriod={goal.period}
            isOpen={isManageCausesModalOpen}
            onOpenChange={(isOpen) => {
                setIsManageCausesModalOpen(isOpen);
                if (!isOpen) setSelectedPotentialRiskForCauses(null);
            }}
            onCausesUpdate={handleCausesUpdate}
            initialCauses={riskCauses.filter(rc => rc.potentialRiskId === selectedPotentialRiskForCauses.id)}
        />
      )}
    </div>
  );
}

    
