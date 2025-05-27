
"use client";

import React, { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Goal, PotentialRisk, RiskCause, RiskCategory } from '@/lib/types';
import { RISK_CATEGORIES } from '@/lib/types';
import { PlusCircle, Loader2, Settings2, Trash2, Edit, ListChecks, ChevronDown, ChevronUp, Search, Filter, BarChart3, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from '@/contexts/auth-context';
import { getGoals, type GoalsResult } from '@/services/goalService';
import { getPotentialRisksByGoalId, deletePotentialRiskAndSubCollections, addPotentialRisk } from '@/services/potentialRiskService';
import { getRiskCausesByPotentialRiskId } from '@/services/riskCauseService';

const DEFAULT_PERIOD = new Date().getFullYear().toString();

export default function AllRisksPage() {
  const router = useRouter();
  const { currentUser, appUser, loading: authLoading } = useAuth();
  
  const [goals, setGoals] = useState<Goal[]>([]);
  const [allPotentialRisks, setAllPotentialRisks] = useState<PotentialRisk[]>([]);
  const [riskCauseCounts, setRiskCauseCounts] = useState<Record<string, number>>({});
  
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRiskId, setExpandedRiskId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<RiskCategory[]>([]);
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);
  const [selectedOwners, setSelectedOwners] = useState<string[]>([]);
  const [allOwners, setAllOwners] = useState<string[]>([]);

  const [selectedRiskIds, setSelectedRiskIds] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [riskToDelete, setRiskToDelete] = useState<PotentialRisk | null>(null); 
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  
  const [deletingRiskId, setDeletingRiskId] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);

  const { toast } = useToast();
  
  const currentUprId = useMemo(() => appUser?.uprId || null, [appUser]);
  const currentPeriod = useMemo(() => appUser?.activePeriod || DEFAULT_PERIOD, [appUser]);

  const loadData = useCallback(async () => {
    if (!currentUser || !currentUprId || !currentPeriod) {
        setIsLoading(false);
        setGoals([]);
        setAllPotentialRisks([]);
        setAllOwners([]);
        setRiskCauseCounts({});
        return;
    }
    setIsLoading(true);
    try {
      const goalsResult = await getGoals(currentUprId, currentPeriod);
      let loadedGoals: Goal[] = [];
      if (goalsResult.success && goalsResult.goals) {
        loadedGoals = goalsResult.goals;
      } else {
        toast({title: "Kesalahan Memuat Sasaran", description: goalsResult.message || "Tidak dapat memuat daftar sasaran.", variant: "destructive"});
      }
      setGoals(loadedGoals);

      let collectedPotentialRisks: PotentialRisk[] = [];
      const uniqueOwners = new Set<string>();
      const causeCounts: Record<string, number> = {};

      for (const goal of loadedGoals) { 
        const goalPotentialRisks = await getPotentialRisksByGoalId(goal.id, currentUprId, currentPeriod);
        for (const pRisk of goalPotentialRisks) {
          collectedPotentialRisks.push(pRisk);
          if (pRisk.owner) uniqueOwners.add(pRisk.owner);
          const causes = await getRiskCausesByPotentialRiskId(pRisk.id, currentUprId, currentPeriod);
          causeCounts[pRisk.id] = causes.length;
        }
      }
      setAllPotentialRisks(collectedPotentialRisks);
      setAllOwners(Array.from(uniqueOwners).sort((a,b) => a.localeCompare(b)));
      setRiskCauseCounts(causeCounts);
      setSelectedRiskIds([]);
    } catch (error: any) {
        console.error("Error loading data for AllRisksPage:", error.message);
        toast({title: "Gagal Memuat Data", description: `Tidak dapat mengambil daftar risiko: ${error.message}`, variant: "destructive"});
    } finally {
        setIsLoading(false);
    }
  }, [currentUser, currentUprId, currentPeriod, toast]);

  useEffect(() => {
    if (currentUser && currentUprId && currentPeriod) {
      loadData();
    } else if (!authLoading && !currentUser) {
        setIsLoading(false); 
    } else if (currentUser && (!currentUprId || !currentPeriod) && !authLoading && appUser !== undefined) {
        setIsLoading(true);
    }
  }, [loadData, currentUprId, currentPeriod, currentUser, authLoading, appUser]);
  
  const handleOpenEditPotentialRiskPage = (pRiskId: string) => {
    router.push(`/all-risks/manage/${pRiskId}?from=/all-risks`);
  };
  
  const handleDeleteSingleRisk = (pRisk: PotentialRisk) => {
    setRiskToDelete(pRisk);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteRisk = async () => {
    if (!riskToDelete || !currentUser || !currentUprId || !currentPeriod) return;
    
    setDeletingRiskId(riskToDelete.id);
    try {
      await deletePotentialRiskAndSubCollections(riskToDelete.id, currentUprId, currentPeriod);
      toast({ title: "Potensi Risiko Dihapus", description: `Potensi risiko "${riskToDelete.description}" dan semua data terkait telah dihapus.`, variant: "destructive" });
      loadData(); 
    } catch (error: any) {
        console.error("Error deleting potential risk:", error.message);
        toast({ title: "Gagal Menghapus", description: error.message || "Terjadi kesalahan saat menghapus potensi risiko.", variant: "destructive" });
    } finally {
        setIsDeleteDialogOpen(false);
        setRiskToDelete(null);
        setDeletingRiskId(null);
    }
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
  
  const toggleOwnerFilter = (owner: string) => {
    setSelectedOwners(prev =>
      prev.includes(owner)
        ? prev.filter(o => o !== owner)
        : [...prev, owner]
    );
  };

  const filteredAndSortedRisks = useMemo(() => {
    let tempRisks = Array.isArray(allPotentialRisks) ? [...allPotentialRisks] : [];
    const lowerSearchTerm = searchTerm.toLowerCase();
    const currentGoals = Array.isArray(goals) ? goals : [];

    if (searchTerm) {
      tempRisks = tempRisks.filter(pRisk => {
        const goal = currentGoals.find(g => g.id === pRisk.goalId);
        const goalName = goal?.name.toLowerCase() || '';
        const goalCode = goal?.code?.toLowerCase() || '';
        const pRiskCode = `${goalCode}.PR${pRisk.sequenceNumber}`.toLowerCase();

        return (
          pRisk.description.toLowerCase().includes(lowerSearchTerm) ||
          pRiskCode.includes(lowerSearchTerm) ||
          (pRisk.category && pRisk.category.toLowerCase().includes(lowerSearchTerm)) ||
          (pRisk.owner && pRisk.owner.toLowerCase().includes(lowerSearchTerm)) ||
          goalName.includes(lowerSearchTerm)
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
    
    if (selectedOwners.length > 0) {
      tempRisks = tempRisks.filter(pRisk =>
        pRisk.owner && selectedOwners.includes(pRisk.owner)
      );
    }

    return tempRisks.sort((a, b) => {
        const goalA = currentGoals.find(g => g.id === a.goalId);
        const goalB = currentGoals.find(g => g.id === b.goalId);
        
        const codeA = goalA?.code || '';
        const codeB = goalB?.code || '';
        const codeComparison = codeA.localeCompare(codeB, undefined, {numeric: true, sensitivity: 'base'});
        if (codeComparison !== 0) return codeComparison;

        const seqA = a.sequenceNumber || 0;
        const seqB = b.sequenceNumber || 0;
        if (seqA !== seqB) return seqA - seqB;
        
        return a.description.localeCompare(b.description);
    });
  }, [allPotentialRisks, searchTerm, selectedCategories, selectedGoalIds, selectedOwners, goals]);


  const handleSelectRisk = (riskId: string, checked: boolean) => {
    setSelectedRiskIds(prev =>
      checked ? [...prev, riskId] : prev.filter(id => id !== riskId)
    );
  };

  const handleSelectAllRisks = (checked: boolean) => {
    if (checked) {
      setSelectedRiskIds(filteredAndSortedRisks.map(risk => risk.id));
    } else {
      setSelectedRiskIds([]);
    }
  };
  
  const handleDeleteSelectedRisks = () => {
    if (selectedRiskIds.length === 0) {
      toast({ title: "Tidak Ada Risiko Dipilih", description: "Pilih setidaknya satu potensi risiko untuk dihapus.", variant: "destructive" });
      return;
    }
    setIsBulkDeleteDialogOpen(true);
  };

  const confirmDeleteSelectedRisks = async () => {
    if (!currentUser || !currentUprId || !currentPeriod) return;
    setIsBulkDeleting(true);
    let deletedCount = 0;
    
    const deletionPromises = selectedRiskIds.map(riskId => {
        return deletePotentialRiskAndSubCollections(riskId, currentUprId, currentPeriod)
            .then(() => {
                deletedCount++;
            })
            .catch(err => {
                console.error(`Gagal menghapus risiko ${riskId}:`, err);
                const risk = allPotentialRisks.find(r => r.id === riskId);
                toast({ title: "Gagal Sebagian", description: `Gagal menghapus potensi risiko "${risk?.description || riskId}". Pesan: ${err.message}`, variant: "destructive" });
            });
    });

    try {
        await Promise.all(deletionPromises);
        if (deletedCount > 0) {
             toast({ title: "Hapus Massal Berhasil", description: `${deletedCount} potensi risiko dan semua data terkait telah dihapus.`, variant: "destructive" });
        }
        loadData(); 
    } catch (error: any) {
        console.error("Error during bulk delete process:", error.message);
        toast({title: "Gagal Proses Hapus Massal", description: error.message, variant: "destructive"});
    } finally {
        setIsBulkDeleteDialogOpen(false);
        setSelectedRiskIds([]);
        setIsBulkDeleting(false);
    }
  };

  const handleDuplicateRisk = async (riskToDuplicateId: string) => {
    if (!currentUser || !currentUprId || !currentPeriod) return;
    const riskToDuplicate = allPotentialRisks.find(pr => pr.id === riskToDuplicateId);
    if (!riskToDuplicate) {
        toast({ title: "Gagal Menduplikasi", description: "Potensi risiko asli tidak ditemukan.", variant: "destructive" });
        return;
    }
    
    const parentGoal = goals.find(g => g.id === riskToDuplicate.goalId);
    if (!parentGoal) {
        toast({ title: "Gagal Menduplikasi", description: "Sasaran induk untuk risiko tidak ditemukan.", variant: "destructive" });
        return;
    }
    setIsLoading(true);
    try {
        const existingPRsForGoal = await getPotentialRisksByGoalId(parentGoal.id, currentUprId, currentPeriod);
        const newSequenceNumber = existingPRsForGoal.length + 1;

        const newPRData: Omit<PotentialRisk, 'id' | 'identifiedAt' | 'uprId' | 'period' | 'userId' | 'sequenceNumber'> = {
            goalId: riskToDuplicate.goalId,
            description: `${riskToDuplicate.description} (Salinan)`,
            category: riskToDuplicate.category,
            owner: riskToDuplicate.owner,
        };
        const newPotentialRisk = await addPotentialRisk(newPRData, parentGoal.id, currentUprId, currentPeriod, currentUser.uid, newSequenceNumber);
        
        toast({ title: "Risiko Diduplikasi", description: `Potensi risiko "${newPotentialRisk.description}" telah berhasil diduplikasi. Penyebab dan kontrol belum disalin.`});
        loadData(); 
    } catch (error: any) {
        console.error("Error duplicating risk:", error.message);
        toast({ title: "Gagal Menduplikasi", description: `Terjadi kesalahan saat menduplikasi: ${error.message}`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || (currentUser && !appUser)) { 
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat data identifikasi risiko...</p>
      </div>
    );
  }
  
  if (!currentUser && !authLoading) {
    return null;
  }

  const relevantGoalsForFilter = Array.isArray(goals) ? goals.filter(g => g.uprId === currentUprId && g.period === currentPeriod) : [];
  const totalTableColumns = 8; 

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Identifikasi Risiko`}
        description={`Kelola semua potensi risiko yang teridentifikasi di semua sasaran untuk UPR: ${currentUprId || '...'}, Periode: ${currentPeriod || '...'}.`}
        actions={
            <NextLink href={`/all-risks/manage/new?from=${encodeURIComponent("/all-risks")}`} passHref>
              <Button disabled={relevantGoalsForFilter.length === 0 || !currentUser}>
                <PlusCircle className="mr-2 h-4 w-4" /> Tambah Potensi Risiko Baru
                {relevantGoalsForFilter.length === 0 && <span className="ml-2 text-xs">(Buat sasaran terlebih dahulu)</span>}
              </Button>
            </NextLink>
        }
      />

      <div className="flex flex-col md:flex-row gap-2 mb-4 items-center">
        <div className="relative flex-grow md:flex-grow-0 md:max-w-xs w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="Cari kode, deskripsi, kategori, pemilik..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
                disabled={isLoading}
            />
        </div>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full md:w-auto" disabled={isLoading}>
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
            <Button variant="outline" className="w-full md:w-auto" disabled={isLoading}>
                <Filter className="mr-2 h-4 w-4" />
                Filter Pemilik {selectedOwners.length > 0 ? `(${selectedOwners.length})` : ''}
            </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[250px]">
            <DropdownMenuLabel>Pilih Pemilik Risiko</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {allOwners.length > 0 ? (
                <ScrollArea className="h-[200px]">
                {allOwners.map((owner) => (
                    <DropdownMenuCheckboxItem
                    key={owner}
                    checked={selectedOwners.includes(owner)}
                    onCheckedChange={() => toggleOwnerFilter(owner)}
                    >
                    {owner}
                    </DropdownMenuCheckboxItem>
                ))}
                </ScrollArea>
            ) : (
                <DropdownMenuItem disabled>Tidak ada pemilik risiko.</DropdownMenuItem>
            )}
            </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
            <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full md:w-auto" disabled={isLoading}>
                <Filter className="mr-2 h-4 w-4" />
                Filter Sasaran {selectedGoalIds.length > 0 ? `(${selectedGoalIds.length})` : ''}
            </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[300px]">
            <DropdownMenuLabel>Pilih Sasaran Terkait</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {relevantGoalsForFilter.length > 0 ? (
                <ScrollArea className="h-[200px]">
                {relevantGoalsForFilter.sort((a,b) => (a.code || '').localeCompare(b.code || '', undefined, {numeric: true, sensitivity: 'base'})).map((goal) => (
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
      
      {selectedRiskIds.length > 0 && (
          <div className="flex justify-end mb-4">
            <Button variant="destructive" onClick={handleDeleteSelectedRisks} className="w-full sm:w-auto" disabled={!currentUser || isLoading || isBulkDeleting}>
                {isBulkDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Hapus ({selectedRiskIds.length}) yang Dipilih
            </Button>
          </div>
      )}

      {isLoading && (
         <div className="flex flex-col items-center justify-center py-10">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
          <p className="text-muted-foreground">Memuat daftar potensi risiko...</p>
        </div>
      )}

      {!isLoading && filteredAndSortedRisks.length === 0 && (
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
      )}

      {!isLoading && filteredAndSortedRisks.length > 0 && (
        <Card className="w-full">
          <CardContent className="p-0">
            <div className="relative w-full overflow-x-auto">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead className="w-[40px] sticky left-0 bg-background z-10">
                        <Checkbox
                            checked={selectedRiskIds.length === filteredAndSortedRisks.length && filteredAndSortedRisks.length > 0}
                            onCheckedChange={(checked) => handleSelectAllRisks(Boolean(checked))}
                            aria-label="Pilih semua risiko yang terlihat"
                            disabled={filteredAndSortedRisks.length === 0 || !currentUser || isBulkDeleting}
                        />
                    </TableHead>
                    <TableHead className="w-[40px] sticky left-10 bg-background z-10"></TableHead> 
                    <TableHead className="min-w-[120px] sticky left-[72px] bg-background z-10">Kode</TableHead>
                    <TableHead className="min-w-[300px]">Potensi Risiko</TableHead>
                    <TableHead className="min-w-[120px]">Kategori</TableHead>
                    <TableHead className="min-w-[150px]">Pemilik</TableHead>
                    <TableHead className="min-w-[200px]">Sasaran Terkait</TableHead>
                    <TableHead className="min-w-[100px] text-center">Penyebab</TableHead>
                    
                    <TableHead className="text-right min-w-[100px] sticky right-0 bg-background z-10 pr-4">Aksi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredAndSortedRisks.map((pRisk) => {
                    const currentActiveGoals = Array.isArray(goals) ? goals : [];
                    const associatedGoal = currentActiveGoals.find(g => g.id === pRisk.goalId);
                    const isExpanded = expandedRiskId === pRisk.id;
                    
                    const goalCodeDisplay = associatedGoal?.code && associatedGoal.code.trim() !== '' ? associatedGoal.code : '[Tanpa Kode]';
                    const potentialRiskCodeDisplay = `${goalCodeDisplay}.PR${pRisk.sequenceNumber || 'N/A'}`;
                    
                    const associatedGoalText = associatedGoal 
                        ? `${goalCodeDisplay} - ${associatedGoal.name}`
                        : 'N/A';
                    const associatedGoalTitle = associatedGoal
                        ? `Sasaran ${goalCodeDisplay}: ${associatedGoal.name} - ${associatedGoal.description}`
                        : 'Sasaran tidak ditemukan';
                    
                    const returnPath = `/all-risks`;
                    const isCurrentlyDeletingThis = deletingRiskId === pRisk.id || (isBulkDeleting && selectedRiskIds.includes(pRisk.id));

                    return (
                        <Fragment key={pRisk.id}>
                        <TableRow className={isCurrentlyDeletingThis ? "opacity-50" : ""}>
                            <TableCell className="sticky left-0 bg-background z-10">
                                <Checkbox
                                    checked={selectedRiskIds.includes(pRisk.id)}
                                    onCheckedChange={(checked) => handleSelectRisk(pRisk.id, Boolean(checked))}
                                    aria-label={`Pilih risiko ${pRisk.description}`}
                                    disabled={!currentUser || isCurrentlyDeletingThis}
                                />
                            </TableCell>
                            <TableCell className="sticky left-10 bg-background z-10">
                            <Button variant="ghost" size="icon" onClick={() => toggleExpandRisk(pRisk.id)} aria-label={isExpanded ? "Sembunyikan deskripsi" : "Tampilkan deskripsi"} className="h-8 w-8" disabled={isCurrentlyDeletingThis}>
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                            </TableCell>
                            <TableCell className="font-mono text-xs sticky left-[72px] bg-background z-10">{potentialRiskCodeDisplay}</TableCell>
                            <TableCell className="font-medium text-xs max-w-xs truncate" title={pRisk.description}>
                                {pRisk.description}
                            </TableCell>
                            <TableCell className="text-xs max-w-[120px] truncate" title={pRisk.category || ''}>
                            <Badge variant={pRisk.category ? "secondary" : "outline"}>{pRisk.category || 'N/A'}</Badge>
                            </TableCell>
                            <TableCell className="text-xs max-w-[150px] truncate" title={pRisk.owner || ''}>{pRisk.owner || 'N/A'}</TableCell>
                            <TableCell 
                            className="text-xs text-muted-foreground max-w-[200px] truncate" 
                            title={associatedGoalTitle}
                            >
                            {associatedGoalText}
                            </TableCell>
                            <TableCell className="text-center text-xs">{riskCauseCounts[pRisk.id] || 0}</TableCell>
                            
                            <TableCell className="text-right sticky right-0 bg-background z-10 pr-4">
                             {isCurrentlyDeletingThis ? (
                                <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                              ) : (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!currentUser}>
                                      <Settings2 className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleOpenEditPotentialRiskPage(pRisk.id)}>
                                      <Edit className="mr-2 h-4 w-4" /> Edit Detail & Penyebab
                                    </DropdownMenuItem>
                                     <DropdownMenuItem onClick={() => router.push(`/risk-analysis?potentialRiskId=${pRisk.id}&from=${encodeURIComponent(returnPath)}`)}>
                                        <BarChart3 className="mr-2 h-4 w-4" /> Analisis Semua Penyebab
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDuplicateRisk(pRisk.id)} disabled={!currentUser}>
                                      <Copy className="mr-2 h-4 w-4" /> Duplikat Risiko
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleDeleteSingleRisk(pRisk)} className="text-destructive focus:text-destructive focus:bg-destructive/10" disabled={!currentUser}>
                                      <Trash2 className="mr-2 h-4 w-4" /> Hapus Potensi Risiko
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </TableCell>
                        </TableRow>
                        {isExpanded && (
                            <TableRow className="bg-muted/30 hover:bg-muted/40">
                            <TableCell className="sticky left-0 bg-muted/30 z-10" /> 
                            <TableCell className="sticky left-10 bg-muted/30 z-10" />
                            <TableCell className="sticky left-[72px] bg-muted/30 z-10" />
                            <TableCell colSpan={totalTableColumns - 3} className="p-0">
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
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus potensi risiko "{riskToDelete?.description}"? Semua penyebab dan tindakan pengendalian terkait juga akan dihapus. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {setIsDeleteDialogOpen(false); setRiskToDelete(null);}}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteRisk} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction>
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
            <AlertDialogCancel onClick={() => setIsBulkDeleteDialogOpen(false)}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSelectedRisks} className="bg-destructive hover:bg-destructive/90">Hapus ({selectedRiskIds.length})</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}


    