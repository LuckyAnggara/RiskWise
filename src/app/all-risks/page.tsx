
"use client";

import React, { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Goal, PotentialRisk, RiskCategory } from '@/lib/types';
import { RISK_CATEGORIES } from '@/lib/types';
import { PlusCircle, Loader2, Settings2, Trash2, Edit, ListChecks, ChevronDown, ChevronUp, Search, Filter, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

import { useAuth } from '@/contexts/auth-context';
import { useAppStore } from '@/stores/useAppStore';

export default function AllRisksPage() {
  const router = useRouter();
  const { currentUser, appUser, loading: authLoading } = useAuth();
  
  // State from Zustand store
  const goals = useAppStore(state => state.goals);
  const fetchGoals = useAppStore(state => state.fetchGoals);
  const potentialRisks = useAppStore(state => state.potentialRisks);
  const potentialRisksLoading = useAppStore(state => state.potentialRisksLoading);
  const fetchPotentialRisks = useAppStore(state => state.fetchPotentialRisks);
  const deletePotentialRiskFromStore = useAppStore(state => state.deletePotentialRisk);
  const addPotentialRiskToStore = useAppStore(state => state.addPotentialRisk);


  const [expandedRiskId, setExpandedRiskId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<RiskCategory[]>([]);
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);
  const [selectedOwners, setSelectedOwners] = useState<string[]>([]);
  
  const [selectedRiskIds, setSelectedRiskIds] = useState<string[]>([]);
  const [isSingleDeleteDialogOpen, setIsSingleDeleteDialogOpen] = useState(false);
  const [riskToDelete, setRiskToDelete] = useState<PotentialRisk | null>(null); 
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  
  const [deletingRiskId, setDeletingRiskId] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);

  const { toast } = useToast();
  
  const currentUserId = useMemo(() => currentUser?.uid || null, [currentUser]);
  const currentPeriod = useMemo(() => appUser?.activePeriod || null, [appUser]);

  useEffect(() => {
    if (currentUserId && currentPeriod && !authLoading) {
      // Fetch goals if not already loaded, which will then trigger potential risks fetch
      if (goals.length === 0) { // Or based on a more specific loading flag for goals if available
        fetchGoals(currentUserId, currentPeriod);
      } else {
        // If goals are already loaded, directly fetch potential risks
        fetchPotentialRisks(currentUserId, currentPeriod);
      }
    }
  }, [currentUserId, currentPeriod, authLoading, fetchGoals, fetchPotentialRisks, goals.length]);
  
  const allOwners = useMemo(() => {
    const ownersSet = new Set<string>();
    potentialRisks.forEach(pr => {
      if (pr.owner) ownersSet.add(pr.owner);
    });
    return Array.from(ownersSet).sort();
  }, [potentialRisks]);

  const handleOpenEditPotentialRiskPage = (pRiskId: string) => {
    router.push(`/all-risks/manage/${pRiskId}?from=/all-risks`);
  };
  
  const handleDeleteSingleRisk = (pRisk: PotentialRisk) => {
    if(!currentUser) return;
    setRiskToDelete(pRisk);
    setIsSingleDeleteDialogOpen(true);
  };

  const confirmDeleteSingleRisk = async () => {
    if (!riskToDelete || !currentUser || !currentUserId || !currentPeriod) return;
    
    setDeletingRiskId(riskToDelete.id);
    try {
      await deletePotentialRiskFromStore(riskToDelete.id, currentUserId, currentPeriod);
      toast({ title: "Potensi Risiko Dihapus", description: `Potensi risiko "${riskToDelete.description}" dan semua data terkait telah dihapus.`, variant: "destructive" });
      // Store state should update automatically, no need to call loadData()
      setSelectedRiskIds(prev => prev.filter(id => id !== riskToDelete.id));
    } catch (error: any) {
        const errorMessage = error.message || String(error);
        console.error("Error deleting potential risk:", errorMessage);
        toast({ title: "Gagal Menghapus", description: errorMessage, variant: "destructive" });
    } finally {
        setIsSingleDeleteDialogOpen(false);
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
    let tempRisks = Array.isArray(potentialRisks) ? [...potentialRisks] : [];
    const lowerSearchTerm = searchTerm.toLowerCase();
    const currentActiveGoals = Array.isArray(goals) ? goals : [];

    if (searchTerm) {
      tempRisks = tempRisks.filter(pRisk => {
        const goal = currentActiveGoals.find(g => g.id === pRisk.goalId);
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
        const goalA = currentActiveGoals.find(g => g.id === a.goalId);
        const goalB = currentActiveGoals.find(g => g.id === b.goalId);
        
        const codeA = goalA?.code || '';
        const codeB = goalB?.code || '';
        const codeComparison = codeA.localeCompare(codeB, undefined, {numeric: true, sensitivity: 'base'});
        if (codeComparison !== 0) return codeComparison;

        const seqA = a.sequenceNumber || 0;
        const seqB = b.sequenceNumber || 0;
        if (seqA !== seqB) return seqA - seqB;
        
        return a.description.localeCompare(b.description);
    });
  }, [potentialRisks, searchTerm, selectedCategories, selectedGoalIds, selectedOwners, goals]);


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
    if (!currentUser || !currentUserId || !currentPeriod) return;
    setIsBulkDeleting(true);
    let deletedCount = 0;
    const errors: string[] = [];
    
    for (const riskId of selectedRiskIds) {
        try {
            await deletePotentialRiskFromStore(riskId, currentUserId, currentPeriod);
            deletedCount++;
        } catch (err: any) {
            const risk = potentialRisks.find(r => r.id === riskId);
            errors.push(risk?.description || riskId);
            console.error(`Gagal menghapus potensi risiko ${riskId}:`, err.message);
        }
    }

    if (deletedCount > 0) {
        toast({ title: "Hapus Massal Berhasil", description: `${deletedCount} potensi risiko dan semua data terkait telah dihapus.`, variant: "destructive" });
    }
    if (errors.length > 0) {
        toast({ title: "Gagal Sebagian", description: `Gagal menghapus potensi risiko: ${errors.join(', ')}.`, variant: "destructive" });
    }
    
    setIsBulkDeleteDialogOpen(false);
    setSelectedRiskIds([]);
    setIsBulkDeleting(false);
    // Store state should update automatically
  };

  const handleDuplicateRisk = async (riskToDuplicateId: string) => {
    if (!currentUser || !currentUserId || !currentPeriod) return;
    const riskToDuplicate = potentialRisks.find(pr => pr.id === riskToDuplicateId);
    if (!riskToDuplicate) {
        toast({ title: "Gagal Menduplikasi", description: "Potensi risiko asli tidak ditemukan.", variant: "destructive" });
        return;
    }
    
    const parentGoal = goals.find(g => g.id === riskToDuplicate.goalId);
    if (!parentGoal) {
        toast({ title: "Gagal Menduplikasi", description: "Sasaran induk untuk risiko tidak ditemukan.", variant: "destructive" });
        return;
    }
    
    // setIsPageLoading(true); // Consider a specific loading state for duplication if needed
    try {
        const existingPRsForGoal = potentialRisks.filter(pr => pr.goalId === parentGoal.id);
        const newSequenceNumber = existingPRsForGoal.length + 1;

        const newPRData: Omit<PotentialRisk, 'id' | 'identifiedAt' | 'userId' | 'period' | 'goalId' | 'sequenceNumber'> = {
            description: `${riskToDuplicate.description} (Salinan)`,
            category: riskToDuplicate.category,
            owner: riskToDuplicate.owner,
        };
        
        const newPotentialRisk = await addPotentialRiskToStore(newPRData, parentGoal.id, currentUserId, currentPeriod, newSequenceNumber);
        
        if (newPotentialRisk) {
          toast({ title: "Risiko Diduplikasi", description: `Potensi risiko "${newPotentialRisk.description}" telah berhasil diduplikasi. Penyebab dan kontrol belum disalin.`});
          // Store updates, no need to call loadData();
        } else {
          throw new Error("Gagal membuat duplikasi potensi risiko di store.");
        }
    } catch (error: any) {
        console.error("Error duplicating risk:", error.message);
        toast({ title: "Gagal Menduplikasi", description: `Terjadi kesalahan saat menduplikasi: ${error.message}`, variant: "destructive" });
    } finally {
      // setIsPageLoading(false);
    }
  };

  const isLoading = authLoading || potentialRisksLoading;

  if (isLoading && potentialRisks.length === 0) { 
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

  const relevantGoalsForFilter = Array.isArray(goals) ? goals.filter(g => g.userId === currentUserId && g.period === currentPeriod) : [];
  const totalTableColumns = 7; // Adjusted for no likelihood/impact columns

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Identifikasi Risiko`}
        description={`Kelola semua potensi risiko yang teridentifikasi di semua sasaran untuk UPR: ${appUser?.displayName || '...'}, Periode: ${currentPeriod || '...'}.`}
        actions={
            <NextLink href={`/all-risks/manage/new?from=${encodeURIComponent("/all-risks")}`} passHref>
              <Button disabled={relevantGoalsForFilter.length === 0 || !currentUser}>
                <PlusCircle className="mr-2 h-4 w-4" /> Tambah Potensi Risiko Baru
                {relevantGoalsForFilter.length === 0 && <span className="ml-2 text-xs">(Buat sasaran terlebih dahulu)</span>}
              </Button>
            </NextLink>
        }
      />

      <div className="flex flex-col md:flex-row gap-2 mb-4 items-start md:items-center">
        <div className="relative flex-grow md:flex-grow-0 md:max-w-xs w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="Cari kode, deskripsi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
                disabled={isLoading}
            />
        </div>
        <div className="flex flex-wrap gap-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto" disabled={isLoading}>
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
                <Button variant="outline" className="w-full sm:w-auto" disabled={isLoading || allOwners.length === 0}>
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
                <Button variant="outline" className="w-full sm:w-auto" disabled={isLoading || relevantGoalsForFilter.length === 0}>
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
      </div>
      
      {selectedRiskIds.length > 0 && (
          <div className="mb-4 text-right">
            <Button variant="destructive" onClick={handleDeleteSelectedRisks} className="w-full sm:w-auto" disabled={!currentUser || isLoading || isBulkDeleting}>
                {isBulkDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Hapus ({selectedRiskIds.length}) yang Dipilih
            </Button>
          </div>
      )}

      {isLoading && filteredAndSortedRisks.length === 0 && ( // Show main loading only if no risks are displayed yet
         <div className="flex flex-col items-center justify-center py-10">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
          <p className="text-muted-foreground">Memuat daftar potensi risiko...</p>
        </div>
      )}

      {!isLoading && filteredAndSortedRisks.length === 0 && (
        <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
          <ListChecks className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-lg font-medium">
            {potentialRisks.length === 0 
              ? "Belum ada potensi risiko yang teridentifikasi untuk UPR/Periode ini"
              : "Tidak ada potensi risiko yang cocok dengan kriteria filter Anda."}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {potentialRisks.length === 0
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
                            disabled={filteredAndSortedRisks.length === 0 || !currentUser || isBulkDeleting || isLoading}
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
                        ? `Sasaran ${goalCodeDisplay}: ${associatedGoal.name}`
                        : 'Sasaran tidak ditemukan';
                    
                    const returnPath = `/all-risks`;
                    const isCurrentlyDeletingThis = deletingRiskId === pRisk.id || (isBulkDeleting && selectedRiskIds.includes(pRisk.id));
                    // const riskCauseCount = riskCauseCounts[pRisk.id] || 0; // Placeholder, needs riskCause state in store

                    return (
                        <Fragment key={pRisk.id}>
                        <TableRow className={isCurrentlyDeletingThis ? "opacity-50" : ""}>
                            <TableCell className="sticky left-0 bg-background z-10">
                                <Checkbox
                                    checked={selectedRiskIds.includes(pRisk.id)}
                                    onCheckedChange={(checked) => handleSelectRisk(pRisk.id, Boolean(checked))}
                                    aria-label={`Pilih risiko ${pRisk.description}`}
                                    disabled={!currentUser || isCurrentlyDeletingThis || isLoading}
                                />
                            </TableCell>
                            <TableCell className="sticky left-10 bg-background z-10">
                            <Button variant="ghost" size="icon" onClick={() => toggleExpandRisk(pRisk.id)} aria-label={isExpanded ? "Sembunyikan deskripsi" : "Tampilkan deskripsi"} className="h-8 w-8" disabled={isCurrentlyDeletingThis || isLoading}>
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
                            <TableCell className="text-center text-xs">{/* riskCauseCount - Diimplementasikan nanti dengan RiskCause state */}?</TableCell> 
                            
                            <TableCell className="text-right sticky right-0 bg-background z-10 pr-4">
                             {isCurrentlyDeletingThis ? (
                                <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                              ) : (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!currentUser || isLoading}>
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
                                    <DropdownMenuItem onClick={() => handleDuplicateRisk(pRisk.id)} disabled={!currentUser || isLoading}>
                                      <Copy className="mr-2 h-4 w-4" /> Duplikat Risiko
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleDeleteSingleRisk(pRisk)} className="text-destructive focus:text-destructive focus:bg-destructive/10" disabled={!currentUser || isLoading}>
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

      <AlertDialog open={isSingleDeleteDialogOpen} onOpenChange={setIsSingleDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus potensi risiko "{riskToDelete?.description}"? Semua penyebab dan tindakan pengendalian terkait juga akan dihapus. Tindakan ini tidak dapat dibatalkan.
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
            <AlertDialogCancel onClick={() => setIsBulkDeleteDialogOpen(false)}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSelectedRisks} className="bg-destructive hover:bg-destructive/90">Hapus ({selectedRiskIds.length})</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

    