
"use client";

import React, { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RiskAnalysisModal } from '@/components/risks/risk-analysis-modal';
import { RiskControlModal } from '@/components/risks/risk-control-modal';
// import { ManageRiskCausesDialog } from '@/components/risks/manage-risk-causes-dialog'; // Manage causes directly on edit page now
import type { Goal, PotentialRisk, Control, RiskCause, RiskCategory, LikelihoodImpactLevel, RiskLevel } from '@/lib/types';
import { RISK_CATEGORIES } from '@/lib/types';
import { PlusCircle, Loader2, Settings2, BarChart3, Trash2, Edit, ListChecks, ChevronDown, ChevronUp, Search, Filter, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { getCurrentUprId, getCurrentPeriod, initializeAppContext } from '@/lib/upr-period-context';
import { ScrollArea } from '@/components/ui/scroll-area';

const getGoalsStorageKey = (uprId: string, period: string) => `riskwise-upr${uprId}-period${period}-goals`;
const getPotentialRisksStorageKey = (uprId: string, period: string, goalId: string) => `riskwise-upr${uprId}-period${period}-goal${goalId}-potentialRisks`;
const getControlsStorageKey = (uprId: string, period: string, potentialRiskId: string) => `riskwise-upr${uprId}-period${period}-potentialRisk${potentialRiskId}-controls`;
const getRiskCausesStorageKey = (uprId: string, period: string, potentialRiskId: string) => `riskwise-upr${uprId}-period${period}-potentialRisk${potentialRiskId}-causes`;


export default function AllRisksPage() {
  const router = useRouter();
  const [currentUprId, setCurrentUprId] = useState('');
  const [currentPeriod, setCurrentPeriod] = useState('');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [allPotentialRisks, setAllPotentialRisks] = useState<PotentialRisk[]>([]);
  const [allControls, setAllControls] = useState<Control[]>([]);
  const [allRiskCauses, setAllRiskCauses] = useState<RiskCause[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRiskId, setExpandedRiskId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<RiskCategory[]>([]);
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);

  const [selectedPotentialRiskForAnalysis, setSelectedPotentialRiskForAnalysis] = useState<PotentialRisk | null>(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  
  const [selectedPotentialRiskForControl, setSelectedPotentialRiskForControl] = useState<PotentialRisk | null>(null);
  const [selectedControlForEdit, setSelectedControlForEdit] = useState<Control | null>(null);
  const [isControlModalOpen, setIsControlModalOpen] = useState(false);

  // const [selectedPotentialRiskForCauses, setSelectedPotentialRiskForCauses] = useState<PotentialRisk | null>(null);
  // const [isManageCausesModalOpen, setIsManageCausesModalOpen] = useState(false);

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
      setAllPotentialRisks(collectedPotentialRisks);
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
  }, [loadData, currentUprId, currentPeriod, router]);

  const updatePotentialRisksInStorageForGoal = (uprId: string, period: string, goalId: string, updatedPotentialRisksForGoal: PotentialRisk[]) => {
    if (typeof window !== 'undefined') {
      const key = getPotentialRisksStorageKey(uprId, period, goalId);
      const sortedRisks = updatedPotentialRisksForGoal.sort((a, b) => {
        const codeA = a.sequenceNumber?.toString() || '';
        const codeB = b.sequenceNumber?.toString() || '';
        return codeA.localeCompare(codeB, undefined, { numeric: true }) || a.description.localeCompare(b.description);
      });
      localStorage.setItem(key, JSON.stringify(sortedRisks));
    }
  };
  
  const updateControlsInStorageForPotentialRisk = (uprId: string, period: string, potentialRiskId: string, updatedControlsForPotentialRisk: Control[]) => {
     if (typeof window !== 'undefined') {
        const key = getControlsStorageKey(uprId, period, potentialRiskId);
        localStorage.setItem(key, JSON.stringify(updatedControlsForPotentialRisk));
     }
  };
  
  const handleOpenAddPotentialRiskPage = () => {
    if (goals.filter(g => g.uprId === currentUprId && g.period === currentPeriod).length === 0) {
        toast({ title: "Tidak Dapat Menambah Potensi Risiko", description: "Harap buat setidaknya satu sasaran untuk UPR/Periode saat ini sebelum menambahkan potensi risiko.", variant: "destructive"});
        return;
    }
    router.push('/all-risks/manage/new');
  };

  const handleOpenEditPotentialRiskPage = (pRiskId: string) => {
    router.push(`/all-risks/manage/${pRiskId}`);
  };
  
  const handleOpenAnalysisModal = (pRiskToAnalyze: PotentialRisk) => {
    setSelectedPotentialRiskForAnalysis(pRiskToAnalyze);
    setIsAnalysisModalOpen(true);
  };

  const handleSaveRiskAnalysis = (updatedPotentialRisk: PotentialRisk) => {
    const parentGoal = goals.find(g => g.id === updatedPotentialRisk.goalId);
    if (!parentGoal) return;

    setAllPotentialRisks(prevRisks => 
        prevRisks.map(pr => pr.id === updatedPotentialRisk.id ? updatedPotentialRisk : pr)
    );
    
    const goalPotentialRisks = allPotentialRisks
        .map(pr => pr.id === updatedPotentialRisk.id ? updatedPotentialRisk : pr)
        .filter(pr => pr.goalId === updatedPotentialRisk.goalId);
    updatePotentialRisksInStorageForGoal(parentGoal.uprId, parentGoal.period, updatedPotentialRisk.goalId, goalPotentialRisks);

    toast({ title: "Analisis Inheren Potensi Risiko Disimpan", description: `Analisis untuk: "${updatedPotentialRisk.description}" telah disimpan.`});
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

    let updatedRiskControlsList: Control[];
    let actionText = "";

    setAllControls(prevControls => {
        const riskSpecificControls = prevControls.filter(c => c.potentialRiskId === control.potentialRiskId);
        const existingIndex = riskSpecificControls.findIndex(c => c.id === control.id);

        if (existingIndex > -1) {
          updatedRiskControlsList = riskSpecificControls.map(c => c.id === control.id ? control : c);
          actionText = "diperbarui";
        } else {
          updatedRiskControlsList = [...riskSpecificControls, control];
          actionText = "ditambahkan";
        }
        updateControlsInStorageForPotentialRisk(parentGoal.uprId, parentGoal.period, control.potentialRiskId, updatedRiskControlsList);
        return prevControls.filter(c => c.potentialRiskId !== control.potentialRiskId).concat(updatedRiskControlsList);
    });
    
    toast({ title: actionText === "diperbarui" ? "Kontrol Diperbarui" : "Kontrol Ditambahkan", description: `Kontrol "${control.description}" ${actionText}.` });
    
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
    toast({ title: "Potensi Risiko Dihapus", description: `Potensi risiko "${pRiskToDelete.description}" dihapus.`, variant: "destructive" });
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
    
    setAllControls(prevControls => prevControls.filter(c => c.id !== controlIdToDelete));

    toast({ title: "Kontrol Dihapus", description: `Kontrol "${controlToDelete.description}" dihapus.`, variant: "destructive" });
  };

  const toggleExpandRisk = (riskId: string) => {
    setExpandedRiskId(currentId => (currentId === riskId ? null : riskId));
  };

  const toggleCategoryFilter = (category: RiskCategory) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category) 
        : [...prev, category]
    );
  };

  const toggleGoalFilter = (goalId: string) => {
    setSelectedGoalIds(prev =>
      prev.includes(goalId)
        ? prev.filter(id => id !== goalId)
        : [...prev, goalId]
    );
  };

  const filteredAndSortedRisks = useMemo(() => {
    let tempRisks = [...allPotentialRisks];

    if (searchTerm) {
      tempRisks = tempRisks.filter(pRisk => {
        const goal = goals.find(g => g.id === pRisk.goalId);
        const goalName = goal?.name.toLowerCase() || '';
        const goalCode = goal?.code?.toLowerCase() || '';
        return (
          pRisk.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (pRisk.category && pRisk.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (pRisk.owner && pRisk.owner.toLowerCase().includes(searchTerm.toLowerCase())) ||
          goalName.includes(searchTerm.toLowerCase()) ||
          goalCode.includes(searchTerm.toLowerCase())
        );
      });
    }

    if (selectedCategories.length > 0) {
      tempRisks = tempRisks.filter(pRisk =>
        pRisk.category && selectedCategories.includes(pRisk.category)
      );
    }

    if (selectedGoalIds.length > 0) {
      tempRisks = tempRisks.filter(pRisk => selectedGoalIds.includes(pRisk.goalId));
    }

    return tempRisks.sort((a, b) => {
        const goalA = goals.find(g => g.id === a.goalId);
        const goalB = goals.find(g => g.id === b.goalId);
        
        const codeA = goalA?.code || '';
        const codeB = goalB?.code || '';
        const codeComparison = codeA.localeCompare(codeB, undefined, {numeric: true});
        if (codeComparison !== 0) return codeComparison;

        const seqA = a.sequenceNumber || 0;
        const seqB = b.sequenceNumber || 0;
        if (seqA !== seqB) return seqA - seqB;
        
        return a.description.localeCompare(b.description);
    });
  }, [allPotentialRisks, searchTerm, selectedCategories, selectedGoalIds, goals]);


  if (isLoading || !currentUprId || !currentPeriod) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat data identifikasi risiko...</p>
      </div>
    );
  }

  const relevantGoals = goals.filter(g => g.uprId === currentUprId && g.period === currentPeriod);
  const totalTableColumns = 8; // Expand, Kode, Deskripsi, Kategori, Pemilik, Sasaran, Penyebab, Kontrol, Aksi

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Identifikasi Risiko`}
        description={`Kelola semua potensi risiko yang teridentifikasi di semua sasaran untuk UPR: ${currentUprId}, Periode: ${currentPeriod}.`}
        actions={
          <Button onClick={handleOpenAddPotentialRiskPage} disabled={relevantGoals.length === 0}>
            <PlusCircle className="mr-2 h-4 w-4" /> Tambah Potensi Risiko Baru
            {relevantGoals.length === 0 && <span className="ml-2 text-xs">(Buat sasaran terlebih dahulu)</span>}
          </Button>
        }
      />

      <div className="flex flex-col md:flex-row gap-2 mb-4">
        <div className="relative flex-grow md:flex-grow-0 md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari kode, deskripsi, kategori..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
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
                    onCheckedChange={() => toggleCategoryFilter(category)}
                  >
                    {category}
                  </DropdownMenuCheckboxItem>
                ))}
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Filter Sasaran {selectedGoalIds.length > 0 ? `(${selectedGoalIds.length})` : ''}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[300px]">
              <DropdownMenuLabel>Pilih Sasaran Terkait</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {relevantGoals.length > 0 ? (
                <ScrollArea className="h-[200px]">
                  {relevantGoals.sort((a,b) => (a.code || '').localeCompare(b.code || '', undefined, {numeric: true})).map((goal) => (
                    <DropdownMenuCheckboxItem
                      key={goal.id}
                      checked={selectedGoalIds.includes(goal.id)}
                      onCheckedChange={() => toggleGoalFilter(goal.id)}
                    >
                      {goal.code || '[Tanpa Kode]'} - {goal.name}
                    </DropdownMenuCheckboxItem>
                  ))}
                </ScrollArea>
              ) : (
                <DropdownMenuItem disabled>Tidak ada sasaran tersedia</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {filteredAndSortedRisks.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
          <ListChecks className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-lg font-medium">
            {allPotentialRisks.length === 0 
              ? "Belum ada potensi risiko yang teridentifikasi untuk UPR/Periode ini"
              : "Tidak ada potensi risiko yang cocok dengan kriteria filter Anda."}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {allPotentialRisks.length === 0
              ? "Klik \"Tambah Potensi Risiko Baru\" untuk mulai mengisi register risiko Anda."
              : "Coba sesuaikan pencarian atau filter Anda."}
          </p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead> 
                  <TableHead className="w-[100px]">Kode</TableHead>
                  <TableHead className="w-[30%] min-w-[200px]">Potensi Risiko</TableHead>
                  <TableHead className="min-w-[120px]">Kategori</TableHead>
                  <TableHead className="min-w-[120px]">Pemilik</TableHead>
                  <TableHead className="min-w-[180px]">Sasaran Terkait</TableHead>
                  <TableHead className="min-w-[80px] text-center">Penyebab</TableHead>
                  <TableHead className="min-w-[80px] text-center">Kontrol</TableHead>
                  <TableHead className="text-right w-[100px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedRisks.map((pRisk) => {
                  const riskControlsList = allControls.filter(c => c.potentialRiskId === pRisk.id);
                  const riskCausesList = allRiskCauses.filter(rc => rc.potentialRiskId === pRisk.id);
                  const associatedGoal = goals.find(g => g.id === pRisk.goalId);
                  const isExpanded = expandedRiskId === pRisk.id;
                  
                  const goalCodeDisplay = associatedGoal?.code && associatedGoal.code.trim() !== '' ? associatedGoal.code : '[Tanpa Kode]';
                  const potentialRiskCodeDisplay = `${goalCodeDisplay}.PR${pRisk.sequenceNumber || 'N/A'}`;
                  
                  const associatedGoalText = associatedGoal 
                    ? `${goalCodeDisplay} - ${associatedGoal.name}`
                    : 'N/A';
                  const associatedGoalTitle = associatedGoal
                    ? `Sasaran ${goalCodeDisplay}: ${associatedGoal.name} - ${associatedGoal.description}`
                    : 'Sasaran tidak ditemukan';

                  return (
                    <Fragment key={pRisk.id}>
                      <TableRow>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => toggleExpandRisk(pRisk.id)} aria-label={isExpanded ? "Sembunyikan deskripsi" : "Tampilkan deskripsi"}>
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{potentialRiskCodeDisplay}</TableCell>
                        <TableCell className="font-medium text-xs max-w-xs truncate" title={pRisk.description}>
                            {pRisk.description}
                        </TableCell>
                        <TableCell className="text-xs max-w-[120px] truncate" title={pRisk.category || ''}>
                          <Badge variant={pRisk.category ? "secondary" : "outline"}>{pRisk.category || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell className="text-xs max-w-[120px] truncate" title={pRisk.owner || ''}>{pRisk.owner || 'N/A'}</TableCell>
                        <TableCell 
                          className="text-xs text-muted-foreground max-w-[180px] truncate" 
                          title={associatedGoalTitle}
                        >
                          {associatedGoalText}
                        </TableCell>
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
                              <DropdownMenuItem onClick={() => handleOpenEditPotentialRiskPage(pRisk.id)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit Detail & Penyebab
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenAnalysisModal(pRisk)}>
                                <BarChart3 className="mr-2 h-4 w-4" /> Analisis Level (Inheren)
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenControlModal(pRisk)}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Kelola Kontrol
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDeletePotentialRisk(pRisk.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                <Trash2 className="mr-2 h-4 w-4" /> Hapus Potensi Risiko
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow className="bg-muted/30 hover:bg-muted/40">
                          <TableCell /> 
                          <TableCell colSpan={totalTableColumns -1} className="p-0">
                            <div className="p-3 space-y-1 text-xs">
                              <h4 className="font-semibold text-foreground">Deskripsi Lengkap Potensi Risiko:</h4>
                              <p className="text-muted-foreground whitespace-pre-wrap">{pRisk.description}</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {selectedPotentialRiskForAnalysis && goals.find(g => g.id === selectedPotentialRiskForAnalysis.goalId) && (
        <RiskAnalysisModal
            potentialRisk={selectedPotentialRiskForAnalysis}
            goalDescription={goals.find(g => g.id === selectedPotentialRiskForAnalysis!.goalId)?.description || ""}
            isOpen={isAnalysisModalOpen}
            onOpenChange={setIsAnalysisModalOpen}
            onSave={handleSaveRiskAnalysis}
        />
      )}


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

      {/* ManageRiskCausesDialog is no longer needed here as causes are managed on the detail page */}
      {/* {selectedPotentialRiskForCauses && (
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
      )} */}
    </div>
  );
}
