
"use client";

import React, { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Untuk pencarian
import { RiskIdentificationCard } from '@/components/risks/risk-identification-card';
import { RiskListItem } from '@/components/risks/risk-list-item';
import { RiskControlModal } from '@/components/risks/risk-control-modal';
import type { Goal, PotentialRisk, Control, RiskCause, RiskCategory, LikelihoodImpactLevel } from '@/lib/types';
import { RISK_CATEGORIES } from '@/lib/types'; // Import RISK_CATEGORIES
import { ArrowLeft, ShieldAlert, Loader2, Edit, Trash2, Settings2, PlusCircle, Copy, Search, Filter, CheckSquare, Square } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUprId, getCurrentPeriod, initializeAppContext } from '@/lib/upr-period-context';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";


const getGoalsStorageKey = (uprId: string, period: string) => `riskwise-upr${uprId}-period${period}-goals`;
const getPotentialRisksStorageKey = (uprId: string, period: string, goalId: string) => `riskwise-upr${uprId}-period${period}-goal${goalId}-potentialRisks`;
const getControlsStorageKey = (uprId: string, period: string, potentialRiskId: string) => `riskwise-upr${uprId}-period${period}-potentialRisk${potentialRiskId}-controls`;
const getRiskCausesStorageKey = (uprId: string, period: string, potentialRiskId: string) => `riskwise-upr${uprId}-period${period}-potentialRisk${potentialRiskId}-causes`;


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

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<RiskCategory[]>([]);
  const [allRiskOwnersForGoal, setAllRiskOwnersForGoal] = useState<string[]>([]);
  const [selectedOwners, setSelectedOwners] = useState<string[]>([]);
  const [selectedRiskIds, setSelectedRiskIds] = useState<string[]>([]);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [riskToDelete, setRiskToDelete] = useState<PotentialRisk | null>(null);
  const [isSingleDeleteDialogOpen, setIsSingleDeleteDialogOpen] = useState(false);


  const [selectedPotentialRiskForControl, setSelectedPotentialRiskForControl] = useState<PotentialRisk | null>(null);
  const [selectedControlForEdit, setSelectedControlForEdit] = useState<Control | null>(null);
  const [isControlModalOpen, setIsControlModalOpen] = useState(false);

  const { toast } = useToast();

  const loadData = useCallback(() => {
    if (typeof window !== 'undefined' && goalId && currentUprId && currentPeriod) {
      setIsLoading(true);
      const goalsStorageKey = getGoalsStorageKey(currentUprId, currentPeriod);
      const storedGoalsData = localStorage.getItem(goalsStorageKey);
      const allGoals: Goal[] = storedGoalsData ? JSON.parse(storedGoalsData) : [];
      const currentGoal = allGoals.find(g => g.id === goalId && g.uprId === currentUprId && g.period === currentPeriod);
      
      setGoal(currentGoal || null);

      const uniqueOwners = new Set<string>();
      if (currentGoal) {
        const potentialRisksStorageKey = getPotentialRisksStorageKey(currentGoal.uprId, currentGoal.period, goalId);
        const storedPotentialRisksData = localStorage.getItem(potentialRisksStorageKey);
        const currentPotentialRisks: PotentialRisk[] = storedPotentialRisksData ? JSON.parse(storedPotentialRisksData) : [];
        setPotentialRisks(currentPotentialRisks.sort((a,b)=>(a.sequenceNumber || 0) - (b.sequenceNumber || 0) || a.description.localeCompare(b.description)));

        currentPotentialRisks.forEach(pr => { if (pr.owner) uniqueOwners.add(pr.owner); });

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
      setAllRiskOwnersForGoal(Array.from(uniqueOwners).sort());
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
  
  const updateRiskCausesInStorage = (goalForCauses: Goal, potentialRiskId: string, updatedCausesForPRisk: RiskCause[]) => {
    if (typeof window !== 'undefined' && goalForCauses) {
      const key = getRiskCausesStorageKey(goalForCauses.uprId, goalForCauses.period, potentialRiskId);
      localStorage.setItem(key, JSON.stringify(updatedCausesForPRisk.sort((a,b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0))));
    }
  };

  const handlePotentialRisksIdentified = (newPotentialRisks: PotentialRisk[]) => {
    if (!goal) return;
    const updatedPotentialRisksState = [...potentialRisks, ...newPotentialRisks].sort((a,b)=>(a.sequenceNumber || 0) - (b.sequenceNumber || 0) || a.description.localeCompare(b.description));
    setPotentialRisks(updatedPotentialRisksState);
    updatePotentialRisksInStorage(goal, updatedPotentialRisksState);
    loadData(); // Refresh owners list
    toast({
        title: "Potensi Risiko Teridentifikasi!",
        description: `${newPotentialRisks.length} potensi risiko telah di-brainstorm untuk "${goal.name}". Anda sekarang dapat mengedit detailnya dan menambahkan penyebab.`
    });
  };
  
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

  const handleDeleteSingleRisk = (pRisk: PotentialRisk) => {
    setRiskToDelete(pRisk);
    setIsSingleDeleteDialogOpen(true);
  };
  
  const confirmDeleteSingleRisk = () => {
    if (!goal || !riskToDelete) return;
    
    const pRiskIdToDelete = riskToDelete.id;
    const updatedPotentialRisksState = potentialRisks.filter(pr => pr.id !== pRiskIdToDelete).sort((a,b)=>(a.sequenceNumber || 0) - (b.sequenceNumber || 0) || a.description.localeCompare(b.description));
    setPotentialRisks(updatedPotentialRisksState);
    updatePotentialRisksInStorage(goal, updatedPotentialRisksState);
      
    if (typeof window !== 'undefined') {
      localStorage.removeItem(getControlsStorageKey(goal.uprId, goal.period, pRiskIdToDelete));
      localStorage.removeItem(getRiskCausesStorageKey(goal.uprId, goal.period, pRiskIdToDelete));
    }
    setControls(currentControls => currentControls.filter(c => c.potentialRiskId !== pRiskIdToDelete));
    setRiskCauses(currentCauses => currentCauses.filter(rc => rc.potentialRiskId !== pRiskIdToDelete));
    toast({ title: "Potensi Risiko Dihapus", description: `Potensi risiko "${riskToDelete.description}" dihapus.`, variant: "destructive" });
    setIsSingleDeleteDialogOpen(false);
    setRiskToDelete(null);
    loadData(); // Refresh owners
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

  const filteredPotentialRisks = useMemo(() => {
    let tempRisks = [...potentialRisks];
    const lowerSearchTerm = searchTerm.toLowerCase();

    if (searchTerm) {
      tempRisks = tempRisks.filter(pr =>
        pr.description.toLowerCase().includes(lowerSearchTerm) ||
        (pr.category && pr.category.toLowerCase().includes(lowerSearchTerm)) ||
        (pr.owner && pr.owner.toLowerCase().includes(lowerSearchTerm))
      );
    }
    if (selectedCategories.length > 0) {
      tempRisks = tempRisks.filter(pr => pr.category && selectedCategories.includes(pr.category));
    }
    if (selectedOwners.length > 0) {
      tempRisks = tempRisks.filter(pr => pr.owner && selectedOwners.includes(pr.owner));
    }
    return tempRisks; // Already sorted on load
  }, [potentialRisks, searchTerm, selectedCategories, selectedOwners]);

  const handleSelectRisk = (riskId: string, checked: boolean) => {
    setSelectedRiskIds(prev =>
      checked ? [...prev, riskId] : prev.filter(id => id !== riskId)
    );
  };

  const handleSelectAllVisibleRisks = (checked: boolean) => {
    if (checked) {
      setSelectedRiskIds(filteredPotentialRisks.map(risk => risk.id));
    } else {
      setSelectedRiskIds([]);
    }
  };

  const handleDeleteSelectedRisks = () => {
    if (selectedRiskIds.length === 0) {
        toast({ title: "Tidak Ada Risiko Dipilih", description: "Harap pilih setidaknya satu risiko untuk dihapus.", variant: "destructive" });
        return;
    }
    setIsBulkDeleteDialogOpen(true);
  };

  const confirmDeleteSelectedRisks = () => {
    if (!goal) return;
    let count = 0;
    let updatedPRs = [...potentialRisks];
    selectedRiskIds.forEach(riskId => {
        const risk = updatedPRs.find(r => r.id === riskId);
        if (risk) {
            count++;
            // Remove associated causes and controls
            if (typeof window !== 'undefined') {
                localStorage.removeItem(getControlsStorageKey(goal.uprId, goal.period, riskId));
                localStorage.removeItem(getRiskCausesStorageKey(goal.uprId, goal.period, riskId));
            }
            setControls(prev => prev.filter(c => c.potentialRiskId !== riskId));
            setRiskCauses(prev => prev.filter(rc => rc.potentialRiskId !== riskId));
        }
        updatedPRs = updatedPRs.filter(pr => pr.id !== riskId);
    });
    
    setPotentialRisks(updatedPRs.sort((a,b)=>(a.sequenceNumber || 0) - (b.sequenceNumber || 0) || a.description.localeCompare(b.description)));
    updatePotentialRisksInStorage(goal, updatedPRs);
    toast({ title: "Hapus Massal Berhasil", description: `${count} potensi risiko telah dihapus.`, variant: "destructive" });
    setSelectedRiskIds([]);
    setIsBulkDeleteDialogOpen(false);
    loadData(); // Refresh owners list
  };

  const handleDuplicateRisk = (riskToDuplicate: PotentialRisk) => {
    if (!goal) return;

    const originalCauses = riskCauses.filter(rc => rc.potentialRiskId === riskToDuplicate.id);
    const originalControls = controls.filter(c => c.potentialRiskId === riskToDuplicate.id);

    let maxSeq = 0;
    potentialRisks.forEach(pr => {
        if (pr.sequenceNumber && pr.sequenceNumber > maxSeq) {
            maxSeq = pr.sequenceNumber;
        }
    });
    const newSequenceNumber = maxSeq + 1;

    const newPotentialRisk: PotentialRisk = {
        ...riskToDuplicate,
        id: `prisk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        description: `${riskToDuplicate.description} (Salinan)`,
        identifiedAt: new Date().toISOString(),
        sequenceNumber: newSequenceNumber,
    };

    const newCauses: RiskCause[] = originalCauses.map((cause, index) => ({
        ...cause,
        id: `rcause_${newPotentialRisk.id}_${index}`,
        potentialRiskId: newPotentialRisk.id,
        createdAt: new Date().toISOString(),
    }));

    const newControls: Control[] = originalControls.map((control, index) => ({
        ...control,
        id: `ctrl_${newPotentialRisk.id}_${index}`,
        potentialRiskId: newPotentialRisk.id,
        createdAt: new Date().toISOString(),
    }));

    const updatedPotentialRisks = [...potentialRisks, newPotentialRisk].sort((a,b)=>(a.sequenceNumber || 0) - (b.sequenceNumber || 0) || a.description.localeCompare(b.description));
    setPotentialRisks(updatedPotentialRisks);
    updatePotentialRisksInStorage(goal, updatedPotentialRisks);

    setRiskCauses(prev => [...prev, ...newCauses]);
    if (newCauses.length > 0) {
        updateRiskCausesInStorage(goal, newPotentialRisk.id, newCauses);
    }
    
    setControls(prev => [...prev, ...newControls]);
    if (newControls.length > 0) {
        updateControlsInStorage(goal, newPotentialRisk.id, newControls);
    }

    toast({ title: "Risiko Diduplikasi", description: `Potensi risiko "${newPotentialRisk.description}" telah berhasil diduplikasi.`});
    loadData(); // To refresh owner list if duplication adds new owners
  };


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
        title={`Potensi Risiko untuk Sasaran: ${goal.code || '[Tanpa Kode]'} - ${goal.name}`}
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
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
            <h2 className="text-xl font-semibold whitespace-nowrap">Potensi Risiko Teridentifikasi ({filteredPotentialRisks.length} / {potentialRisks.length})</h2>
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                <div className="relative flex-grow md:flex-grow-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari deskripsi, kategori, pemilik..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full md:w-64"
                    />
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full md:w-auto">
                            <Filter className="mr-2 h-4 w-4" />
                            Filter Kategori {selectedCategories.length > 0 ? `(${selectedCategories.length})` : ''}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[250px]">
                        <DropdownMenuLabel>Pilih Kategori</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <ScrollArea className="h-[200px]">
                        {RISK_CATEGORIES.map((category) => (
                            <DropdownMenuCheckboxItem
                                key={category}
                                checked={selectedCategories.includes(category)}
                                onCheckedChange={() => setSelectedCategories(prev => prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category])}
                            >
                                {category}
                            </DropdownMenuCheckboxItem>
                        ))}
                        </ScrollArea>
                    </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full md:w-auto">
                            <Filter className="mr-2 h-4 w-4" />
                            Filter Pemilik {selectedOwners.length > 0 ? `(${selectedOwners.length})` : ''}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[250px]">
                        <DropdownMenuLabel>Pilih Pemilik</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {allRiskOwnersForGoal.length > 0 ? (
                            <ScrollArea className="h-[200px]">
                            {allRiskOwnersForGoal.map((owner) => (
                                <DropdownMenuCheckboxItem
                                    key={owner}
                                    checked={selectedOwners.includes(owner)}
                                    onCheckedChange={() => setSelectedOwners(prev => prev.includes(owner) ? prev.filter(o => o !== owner) : [...prev, owner])}
                                >
                                    {owner}
                                </DropdownMenuCheckboxItem>
                            ))}
                            </ScrollArea>
                        ) : <DropdownMenuItem disabled>Tidak ada pemilik.</DropdownMenuItem>}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
        
        {(selectedRiskIds.length > 0 || filteredPotentialRisks.length > 0 ) && (
             <div className="flex items-center justify-between mb-4 border-b pb-2">
                <div className="flex items-center gap-2">
                    <Checkbox
                        id="selectAllVisibleRisks"
                        checked={selectedRiskIds.length === filteredPotentialRisks.length && filteredPotentialRisks.length > 0}
                        onCheckedChange={(checked) => handleSelectAllVisibleRisks(Boolean(checked))}
                        disabled={filteredPotentialRisks.length === 0}
                    />
                    <label htmlFor="selectAllVisibleRisks" className="text-sm font-medium text-muted-foreground cursor-pointer">
                        Pilih Semua ({selectedRiskIds.length} dipilih)
                    </label>
                </div>
                {selectedRiskIds.length > 0 && (
                    <Button variant="destructive" size="sm" onClick={handleDeleteSelectedRisks}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Hapus ({selectedRiskIds.length}) yang Dipilih
                    </Button>
                )}
            </div>
        )}


        {filteredPotentialRisks.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
            <ShieldAlert className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-lg font-medium">
                {potentialRisks.length === 0 ? "Belum ada potensi risiko yang teridentifikasi" : "Tidak ada potensi risiko yang cocok dengan filter"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {potentialRisks.length === 0 ? "Gunakan alat AI di atas untuk brainstorming potensi risiko untuk sasaran ini." : "Coba sesuaikan filter Anda."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredPotentialRisks.map((pRisk) => (
              <RiskListItem
                key={pRisk.id}
                potentialRisk={pRisk}
                goalCode={goal.code}
                controls={controls.filter(c => c.potentialRiskId === pRisk.id)}
                riskCauses={riskCauses.filter(rc => rc.potentialRiskId === pRisk.id)}
                onAddControl={() => handleOpenControlModal(pRisk)}
                onEditControl={(controlToEdit) => {
                    const parentPRisk = potentialRisks.find(pr => pr.id === controlToEdit.potentialRiskId);
                    if (parentPRisk) handleOpenControlModal(parentPRisk, controlToEdit);
                }}
                onDeletePotentialRisk={() => handleDeleteSingleRisk(pRisk)}
                onDeleteControl={(controlId) => handleDeleteControl(controlId)}
                onEditDetails={() => router.push(`/all-risks/manage/${pRisk.id}`)} 
                isSelected={selectedRiskIds.includes(pRisk.id)}
                onSelectRisk={(checked) => handleSelectRisk(pRisk.id, checked)}
                onDuplicateRisk={() => handleDuplicateRisk(pRisk)}
              />
            ))}
          </div>
        )}
      </div>

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

        <AlertDialog open={isSingleDeleteDialogOpen} onOpenChange={setIsSingleDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
                <AlertDialogDescription>
                    Apakah Anda yakin ingin menghapus potensi risiko "{riskToDelete?.description}"? Semua penyebab dan kontrol terkait juga akan dihapus. Tindakan ini tidak dapat dibatalkan.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => {setIsSingleDeleteDialogOpen(false); setRiskToDelete(null);}}>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDeleteSingleRisk} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Konfirmasi Hapus Massal</AlertDialogTitle>
                <AlertDialogDescription>
                    Apakah Anda yakin ingin menghapus {selectedRiskIds.length} potensi risiko yang dipilih? Semua penyebab dan kontrol terkait juga akan dihapus. Tindakan ini tidak dapat dibatalkan.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDeleteSelectedRisks} className="bg-destructive hover:bg-destructive/90">Hapus ({selectedRiskIds.length})</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

    </div>
  );
}

    