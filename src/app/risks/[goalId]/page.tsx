
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link'; 
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { RiskIdentificationCard } from '@/components/risks/risk-identification-card';
import { RiskListItem } from '@/components/risks/risk-list-item';
// RiskAnalysisModal is no longer used here for PotentialRisk inherent analysis
import { RiskControlModal } from '@/components/risks/risk-control-modal';
// ManageRiskCausesDialog is no longer used here for quick management, direct to full page
import type { Goal, PotentialRisk, Control, RiskCause, LikelihoodImpactLevel, RiskLevel } from '@/lib/types';
import { ArrowLeft, ShieldAlert, Loader2, LayoutGrid, List, Settings2, PlusCircle, Trash2, Zap, Edit } from 'lucide-react'; 
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

// getRiskLevel and getRiskLevelColor are no longer needed here as inherent analysis is removed

export default function GoalRisksPage() {
  const router = useRouter();
  const params = useParams();
  const goalId = params.goalId as string;

  const [currentUprId, setCurrentUprId] = useState('');
  const [currentPeriod, setCurrentPeriod] = useState('');
  const [goal, setGoal] = useState<Goal | null>(null);
  const [potentialRisks, setPotentialRisks] = useState<PotentialRisk[]>([]);
  const [controls, setControls] = useState<Control[]>([]);
  const [riskCauses, setRiskCauses] = useState<RiskCause[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  
  // selectedPotentialRiskForAnalysis and isAnalysisModalOpen are removed
  
  const [selectedPotentialRiskForControl, setSelectedPotentialRiskForControl] = useState<PotentialRisk | null>(null);
  const [selectedControlForEdit, setSelectedControlForEdit] = useState<Control | null>(null);
  const [isControlModalOpen, setIsControlModalOpen] = useState(false);

  // selectedPotentialRiskForCauses and isManageCausesModalOpen are removed
  
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
        setPotentialRisks(currentPotentialRisks.sort((a,b)=>(a.sequenceNumber || 0) - (b.sequenceNumber || 0) || a.description.localeCompare(b.description)));


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
        setRiskCauses(allRiskCausesForGoal.sort((a,b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0)));
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
  }, [loadData, currentUprId, currentPeriod, goalId, router]);

  const updatePotentialRisksInStorage = (goalForPotentialRisks: Goal, updatedPRisks: PotentialRisk[]) => {
    if (typeof window !== 'undefined' && goalForPotentialRisks) {
      const key = getPotentialRisksStorageKey(goalForPotentialRisks.uprId, goalForPotentialRisks.period, goalForPotentialRisks.id);
      localStorage.setItem(key, JSON.stringify(updatedPRisks.sort((a,b)=>(a.sequenceNumber || 0) - (b.sequenceNumber || 0) || a.description.localeCompare(b.description))));
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
    const updatedPotentialRisksState = [...potentialRisks, ...newPotentialRisks].sort((a,b)=>(a.sequenceNumber || 0) - (b.sequenceNumber || 0) || a.description.localeCompare(b.description));
    setPotentialRisks(updatedPotentialRisksState);
    updatePotentialRisksInStorage(goal, updatedPotentialRisksState);
    toast({
        title: "Potensi Risiko Teridentifikasi!",
        description: `${newPotentialRisks.length} potensi risiko telah di-brainstorm untuk "${goal.name}". Anda sekarang dapat mengedit detailnya dan menambahkan penyebab.`
    });
  };
  
  // handleOpenAnalysisModal and handleSaveRiskAnalysis are removed as inherent analysis is gone

  const handleOpenControlModal = (pRiskForControl: PotentialRisk, controlToEdit?: Control) => {
    setSelectedPotentialRiskForControl(pRiskForControl);
    setSelectedControlForEdit(controlToEdit || null);
    setIsControlModalOpen(true);
  };

  const handleSaveControl = (control: Control) => {
    if (!goal) return;
    let updatedOverallControls;
    let actionText = "";

    setControls(prevControls => {
        const pRiskSpecificControls = prevControls.filter(c => c.potentialRiskId === control.potentialRiskId);
        const existingIndex = pRiskSpecificControls.findIndex(c => c.id === control.id);
        let updatedPRiskControlsList: Control[];

        if (existingIndex > -1) {
          updatedPRiskControlsList = pRiskSpecificControls.map(c => c.id === control.id ? control : c);
          actionText = "diperbarui";
        } else {
          updatedPRiskControlsList = [...pRiskSpecificControls, control];
          actionText = "ditambahkan";
        }
        
        updateControlsInStorage(goal, control.potentialRiskId, updatedPRiskControlsList);
        updatedOverallControls = prevControls.filter(c => c.potentialRiskId !== control.potentialRiskId).concat(updatedPRiskControlsList);
        return updatedOverallControls;
    });
        
    toast({ 
        title: actionText === "diperbarui" ? "Kontrol Diperbarui" : "Kontrol Ditambahkan", 
        description: `Kontrol "${control.description}" ${actionText}.` 
    });
    
    setIsControlModalOpen(false);
    setSelectedPotentialRiskForControl(null);
    setSelectedControlForEdit(null);
  };

  const handleDeletePotentialRisk = (pRiskIdToDelete: string) => {
    if (!goal) return;
    const pRiskToDelete = potentialRisks.find(pr => pr.id === pRiskIdToDelete);
    if (!pRiskToDelete) return;

    const updatedPotentialRisksState = potentialRisks.filter(pr => pr.id !== pRiskIdToDelete).sort((a,b)=>(a.sequenceNumber || 0) - (b.sequenceNumber || 0) || a.description.localeCompare(b.description));
    setPotentialRisks(updatedPotentialRisksState);
    updatePotentialRisksInStorage(goal, updatedPotentialRisksState);
      
    if (typeof window !== 'undefined') {
      localStorage.removeItem(getControlsStorageKey(goal.uprId, goal.period, pRiskIdToDelete));
      localStorage.removeItem(getRiskCausesStorageKey(goal.uprId, goal.period, pRiskIdToDelete));
    }
    setControls(currentControls => currentControls.filter(c => c.potentialRiskId !== pRiskIdToDelete));
    setRiskCauses(currentCauses => currentCauses.filter(rc => rc.potentialRiskId !== pRiskIdToDelete));
    toast({ title: "Potensi Risiko Dihapus", description: `Potensi risiko "${pRiskToDelete.description}" dihapus.`, variant: "destructive" });
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

    toast({ title: "Kontrol Dihapus", description: `Kontrol "${controlToDelete.description}" dihapus.`, variant: "destructive" });
  };

  // handleOpenManageCausesModal and handleCausesUpdate are removed

  if (isLoading) { 
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat data sasaran dan potensi risiko...</p>
      </div>
    );
  }
  
  if (!goal && !isLoading) { 
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <ShieldAlert className="w-16 h-16 text-muted-foreground mb-4" />
        <p className="text-xl text-muted-foreground">Sasaran tidak ditemukan untuk UPR: {currentUprId}, Periode: {currentPeriod}.</p>
        <Button onClick={() => router.push('/goals')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Sasaran
        </Button>
      </div>
    );
  }
  
  if (!goal) return null; 

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Potensi Risiko untuk Sasaran: ${goal.code} - ${goal.name}`}
        description={`${goal.description}`}
        actions={
          <Button onClick={() => router.push('/goals')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Sasaran
          </Button>
        }
      />

      <RiskIdentificationCard goal={goal} onPotentialRisksIdentified={handlePotentialRisksIdentified} existingPotentialRisksCount={potentialRisks.length} />
      
      <Separator />

      <div>
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Potensi Risiko Teridentifikasi ({potentialRisks.length})</h2>
            <div className="flex items-center space-x-2">
                <Button 
                    variant={viewMode === 'card' ? 'default' : 'outline'} 
                    size="icon" 
                    onClick={() => setViewMode('card')}
                    aria-label="Tampilan Kartu"
                >
                    <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button 
                    variant={viewMode === 'table' ? 'default' : 'outline'} 
                    size="icon" 
                    onClick={() => setViewMode('table')}
                    aria-label="Tampilan Tabel"
                >
                    <List className="h-4 w-4" />
                </Button>
            </div>
        </div>

        {potentialRisks.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
            <ShieldAlert className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-lg font-medium">Belum ada potensi risiko yang teridentifikasi</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Gunakan alat AI di atas untuk brainstorming potensi risiko untuk sasaran ini.
            </p>
          </div>
        ) : viewMode === 'card' ? (
          <div className="space-y-4">
            {potentialRisks.map((pRisk) => (
              <RiskListItem
                key={pRisk.id}
                potentialRisk={pRisk}
                goalCode={goal.code}
                controls={controls.filter(c => c.potentialRiskId === pRisk.id)}
                riskCauses={riskCauses.filter(rc => rc.potentialRiskId === pRisk.id)}
                // onAnalyze removed
                onAddControl={() => handleOpenControlModal(pRisk)}
                onEditControl={(controlToEdit) => {
                    const parentPRisk = potentialRisks.find(pr => pr.id === controlToEdit.potentialRiskId);
                    if (parentPRisk) handleOpenControlModal(parentPRisk, controlToEdit);
                }}
                onDeletePotentialRisk={() => handleDeletePotentialRisk(pRisk.id)}
                onDeleteControl={(controlId) => handleDeleteControl(controlId)}
                // onManageCauses removed, handled by onEditDetails
                onEditDetails={() => router.push(`/all-risks/manage/${pRisk.id}`)} 
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Kode PR</TableHead>
                    <TableHead className="w-[30%]">Deskripsi</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Pemilik</TableHead>
                    <TableHead className="text-center">Penyebab</TableHead>
                    <TableHead className="text-center">Kontrol</TableHead>
                    <TableHead className="text-right w-[100px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {potentialRisks.map((pRisk) => {
                    const riskControlsList = controls.filter(c => c.potentialRiskId === pRisk.id);
                    const riskCausesList = riskCauses.filter(rc => rc.potentialRiskId === pRisk.id);
                    return (
                      <TableRow key={pRisk.id}>
                        <TableCell className="font-mono text-xs">{goal.code}.PR{pRisk.sequenceNumber}</TableCell>
                        <TableCell className="font-medium text-xs max-w-xs truncate" title={pRisk.description}>
                            {pRisk.description}
                        </TableCell>
                        <TableCell><Badge variant={pRisk.category ? "outline" : "ghost"} className="text-xs">{pRisk.category || 'N/A'}</Badge></TableCell>
                        <TableCell className="text-xs truncate max-w-[100px]" title={pRisk.owner || ''}>{pRisk.owner || 'N/A'}</TableCell>
                        <TableCell className="text-center text-xs">{riskCausesList.length}</TableCell>
                        <TableCell className="text-center text-xs">{riskControlsList.length}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Settings2 className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                               <DropdownMenuItem onClick={() => router.push(`/all-risks/manage/${pRisk.id}`)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit Detail & Penyebab
                              </DropdownMenuItem>
                              {/* Manage Causes (Quick) option removed - handled on detail page */}
                              {/* Analyze Level (Inherent) option removed */}
                              <DropdownMenuItem onClick={() => handleOpenControlModal(pRisk)}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Tambah Kontrol
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDeletePotentialRisk(pRisk.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                <Trash2 className="mr-2 h-4 w-4" /> Hapus Potensi Risiko
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

      {/* RiskAnalysisModal related states and component instance removed */}

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

      {/* ManageRiskCausesDialog related states and component instance removed */}
    </div>
  );
}
