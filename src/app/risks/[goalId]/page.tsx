
"use client";

import React, { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { useParams, useRouter } from 'next/navigation';
import NextLink from 'next/link'; 
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RiskIdentificationCard } from '@/components/risks/risk-identification-card';
import { RiskListItem } from '@/components/risks/risk-list-item';
import type { Goal, PotentialRisk, RiskCause, RiskCategory } from '@/lib/types';
import { RISK_CATEGORIES } from '@/lib/types';
import { ArrowLeft, ShieldAlert, Loader2, Edit, Trash2, Settings2, PlusCircle, Copy, Search, Filter, LayoutGrid, List, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getCurrentUprId, getCurrentPeriod, initializeAppContext } from '@/lib/upr-period-context';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from '@/contexts/auth-context';
import { getGoals } from '@/services/goalService';
import { getPotentialRisksByGoalId, addPotentialRisk, deletePotentialRiskAndSubCollections } from '@/services/potentialRiskService';
import { getRiskCausesByPotentialRiskId, addRiskCause, deleteRiskCauseAndSubCollections as deleteRiskCausesForPR } from '@/services/riskCauseService';
// ControlMeasureService is not directly used for control creation from this page anymore.

export default function GoalRisksPage() {
  const router = useRouter();
  const params = useParams();
  const goalId = params.goalId as string;
  const { currentUser } = useAuth();

  const [currentUprId, setCurrentUprId] = useState('');
  const [currentPeriod, setCurrentPeriod] = useState('');
  const [goal, setGoal] = useState<Goal | null>(null);
  const [potentialRisks, setPotentialRisks] = useState<PotentialRisk[]>([]);
  // Controls are now managed at riskCause level, so no top-level controls state here.
  // const [controls, setControls] = useState<Control[]>([]);
  const [riskCauseCounts, setRiskCauseCounts] = useState<Record<string, number>>({});
  
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [expandedRiskId, setExpandedRiskId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<RiskCategory[]>([]);
  const [allRiskOwnersForGoal, setAllRiskOwnersForGoal] = useState<string[]>([]);
  const [selectedOwners, setSelectedOwners] = useState<string[]>([]);
  const [selectedRiskIds, setSelectedRiskIds] = useState<string[]>([]);
  
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [riskToDelete, setRiskToDelete] = useState<PotentialRisk | null>(null);
  const [isSingleDeleteDialogOpen, setIsSingleDeleteDialogOpen] = useState(false);

  const { toast } = useToast();

  const loadData = useCallback(async () => {
    if (!currentUser || !goalId || !currentUprId || !currentPeriod) {
        setIsLoading(false);
        setGoal(null);
        setPotentialRisks([]);
        setAllRiskOwnersForGoal([]);
        setRiskCauseCounts({});
        return;
    }
    setIsLoading(true);
    try {
      const allGoals = await getGoals(currentUprId, currentPeriod);
      const currentGoal = allGoals.find(g => g.id === goalId);
      setGoal(currentGoal || null);

      const uniqueOwners = new Set<string>();
      const causeCounts: Record<string,number> = {};
      if (currentGoal) {
        const currentPotentialRisks = await getPotentialRisksByGoalId(goalId, currentUprId, currentPeriod);
        setPotentialRisks(currentPotentialRisks);
        for (const pRisk of currentPotentialRisks) {
          if (pRisk.owner) uniqueOwners.add(pRisk.owner);
          const causes = await getRiskCausesByPotentialRiskId(pRisk.id, currentUprId, currentPeriod);
          causeCounts[pRisk.id] = causes.length;
        }
      } else {
        setPotentialRisks([]);
      }
      setAllRiskOwnersForGoal(Array.from(uniqueOwners).sort());
      setRiskCauseCounts(causeCounts);
      setSelectedRiskIds([]); // Reset selection
    } catch (error) {
        console.error("Error loading data for GoalRisksPage:", error);
        toast({title: "Gagal Memuat Data", description: "Tidak dapat mengambil data sasaran dan risiko.", variant: "destructive"});
        setGoal(null); // Ensure goal is null on error
    } finally {
        setIsLoading(false);
    }
  }, [goalId, currentUprId, currentPeriod, currentUser, toast]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const context = initializeAppContext();
      setCurrentUprId(context.uprId);
      setCurrentPeriod(context.period);
    }
  }, []);
  
  useEffect(() => {
    if (currentUprId && currentPeriod && goalId && currentUser) {
      loadData();
    } else if (!currentUser && goalId && currentUprId && currentPeriod) {
      setIsLoading(false); // Stop loading if no user but context is set
    }
  }, [loadData, currentUprId, currentPeriod, goalId, currentUser]);

  const handlePotentialRisksIdentified = (newPRs: PotentialRisk[]) => {
    // No need to manually add to state if addPotentialRisk in service works and we reload
    toast({
        title: "Potensi Risiko Teridentifikasi!",
        description: `${newPRs.length} potensi risiko telah disimpan ke Firestore.`,
    });
    loadData(); // Reload data to reflect new additions
  };
  
  const handleDeleteSingleRisk = (pRisk: PotentialRisk) => {
    setRiskToDelete(pRisk);
    setIsSingleDeleteDialogOpen(true);
  };
  
  const confirmDeleteSingleRisk = async () => {
    if (!goal || !riskToDelete || !currentUser || !currentUprId || !currentPeriod) return;
    
    try {
      await deletePotentialRiskAndSubCollections(riskToDelete.id, currentUprId, currentPeriod);
      toast({ title: "Potensi Risiko Dihapus", description: `Potensi risiko "${riskToDelete.description}" dan semua data terkait telah dihapus.`, variant: "destructive" });
      loadData(); // Refresh data
    } catch (error) {
        console.error("Error deleting single potential risk:", error);
        toast({ title: "Gagal Menghapus", description: "Terjadi kesalahan saat menghapus potensi risiko.", variant: "destructive" });
    } finally {
        setIsSingleDeleteDialogOpen(false);
        setRiskToDelete(null);
    }
  };

  const filteredPotentialRisks = useMemo(() => {
    let tempRisks = [...potentialRisks];
    const lowerSearchTerm = searchTerm.toLowerCase();

    if (searchTerm) {
      tempRisks = tempRisks.filter(pr =>
        (pr.sequenceNumber && `${goal?.code || ''}.PR${pr.sequenceNumber || ''}`.toLowerCase().includes(lowerSearchTerm)) ||
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
    return tempRisks; 
  }, [potentialRisks, searchTerm, selectedCategories, selectedOwners, goal?.code]);

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

  const confirmDeleteSelectedRisks = async () => {
    if (!goal || !currentUser || !currentUprId || !currentPeriod ) return;
    let deletedCount = 0;
    
    const deletionPromises = selectedRiskIds.map(riskId => {
        return deletePotentialRiskAndSubCollections(riskId, currentUprId, currentPeriod)
            .then(() => {
                deletedCount++;
            })
            .catch(err => {
                console.error(`Gagal menghapus risiko ${riskId}:`, err);
                 const risk = potentialRisks.find(r => r.id === riskId);
                toast({ title: "Gagal Sebagian", description: `Gagal menghapus potensi risiko "${risk?.description || riskId}".`, variant: "destructive" });
            });
    });

    try {
        await Promise.all(deletionPromises);
        if (deletedCount > 0) {
           toast({ title: "Hapus Massal Berhasil", description: `${deletedCount} potensi risiko dan data terkait telah dihapus.`, variant: "destructive" });
        }
        loadData(); 
    } catch (error) {
        console.error("Error during bulk delete selected risks:", error);
    } finally {
        setIsBulkDeleteDialogOpen(false);
        setSelectedRiskIds([]);
    }
  };

  const handleDuplicateRisk = async (riskToDuplicate: PotentialRisk) => {
    if (!goal || !currentUser || !currentUprId || !currentPeriod) return;

    setIsLoading(true); // Indicate loading
    try {
        const existingPRsForGoal = await getPotentialRisksByGoalId(goal.id, currentUprId, currentPeriod);
        const newSequenceNumber = existingPRsForGoal.length + 1;

        const newPRData: Omit<PotentialRisk, 'id' | 'identifiedAt' | 'uprId' | 'period' | 'userId' | 'sequenceNumber'> = {
            goalId: riskToDuplicate.goalId,
            description: `${riskToDuplicate.description} (Salinan)`,
            category: riskToDuplicate.category,
            owner: riskToDuplicate.owner,
        };
        const newPotentialRisk = await addPotentialRisk(newPRData, goal.id, currentUprId, currentPeriod, currentUser.uid, newSequenceNumber);

        const originalCauses = await getRiskCausesByPotentialRiskId(riskToDuplicate.id, currentUprId, currentPeriod);
        let causeSeq = 0;
        for (const cause of originalCauses) {
            causeSeq++;
            const newCauseData: Omit<RiskCause, 'id' | 'createdAt' | 'uprId' | 'period' | 'userId' | 'potentialRiskId' | 'goalId' | 'sequenceNumber'> = {
                description: cause.description,
                source: cause.source,
                keyRiskIndicator: cause.keyRiskIndicator,
                riskTolerance: cause.riskTolerance,
                likelihood: cause.likelihood,
                impact: cause.impact,
            };
            // Controls for this cause would need to be duplicated too if we go deeper.
            // For now, just duplicating cause.
            await addRiskCause(newCauseData, newPotentialRisk.id, newPotentialRisk.goalId, currentUprId, currentPeriod, currentUser.uid, causeSeq);
        }

        toast({ title: "Risiko Diduplikasi", description: `Potensi risiko "${newPotentialRisk.description}" telah berhasil diduplikasi.`});
        loadData(); 
    } catch (error) {
        console.error("Error duplicating risk:", error);
        toast({ title: "Gagal Menduplikasi", description: "Terjadi kesalahan saat menduplikasi potensi risiko.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };

  const toggleExpandRisk = (riskId: string) => {
    setExpandedRiskId(currentId => (currentId === riskId ? null : riskId));
  };

  if (isLoading) { 
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat data sasaran dan potensi risiko...</p>
      </div>
    );
  }
  
  if (!currentUser && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <ShieldAlert className="w-16 h-16 text-muted-foreground mb-4" />
        <p className="text-xl text-muted-foreground">Anda harus login untuk melihat halaman ini.</p>
        <Button onClick={() => router.push('/login')} className="mt-4">
          Ke Halaman Login
        </Button>
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

  const totalTableColumns = 8;

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
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold whitespace-nowrap">Potensi Risiko Teridentifikasi ({filteredPotentialRisks.length} / {potentialRisks.length})</h2>
              <div className="flex items-center space-x-1">
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
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                <div className="relative flex-grow md:flex-grow-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari kode, deskripsi, kategori..."
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
                        id="selectAllVisibleRisksGoalPage"
                        checked={selectedRiskIds.length === filteredPotentialRisks.length && filteredPotentialRisks.length > 0}
                        onCheckedChange={(checked) => handleSelectAllVisibleRisks(Boolean(checked))}
                        disabled={filteredPotentialRisks.length === 0 || !currentUser}
                        aria-label="Pilih Semua Risiko yang Terlihat"
                    />
                    <label htmlFor="selectAllVisibleRisksGoalPage" className="text-sm font-medium text-muted-foreground cursor-pointer">
                        Pilih Semua ({selectedRiskIds.length} dipilih)
                    </label>
                </div>
                {selectedRiskIds.length > 0 && (
                    <Button variant="destructive" size="sm" onClick={handleDeleteSelectedRisks} disabled={!currentUser}>
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
        ) : viewMode === 'card' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredPotentialRisks.map((pRisk) => (
              <RiskListItem
                key={pRisk.id}
                potentialRisk={pRisk}
                goalCode={goal.code}
                riskCausesCount={riskCauseCounts[pRisk.id] || 0} // Pass cause count
                // Controls are now managed at cause level, so not passed here
                onEditDetails={() => router.push(`/all-risks/manage/${pRisk.id}?from=${encodeURIComponent(`/risks/${goal.id}`)}`)} 
                onDeletePotentialRisk={() => handleDeleteSingleRisk(pRisk)}
                isSelected={selectedRiskIds.includes(pRisk.id)}
                onSelectRisk={(checked) => handleSelectRisk(pRisk.id, checked)}
                onDuplicateRisk={() => handleDuplicateRisk(pRisk)}
                canDelete={!!currentUser} // Pass canDelete based on user login
              />
            ))}
          </div>
        ) : (
           <Card className="w-full">
            <CardContent className="p-0">
              <div className="relative w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px] sticky left-0 bg-background z-10">
                        <Checkbox
                            checked={selectedRiskIds.length === filteredPotentialRisks.length && filteredPotentialRisks.length > 0}
                            onCheckedChange={(checked) => handleSelectAllVisibleRisks(Boolean(checked))}
                            aria-label="Pilih semua risiko yang terlihat"
                            disabled={filteredPotentialRisks.length === 0 || !currentUser}
                        />
                      </TableHead>
                      <TableHead className="w-[40px] sticky left-10 bg-background z-10"></TableHead> {/* For expand button */}
                      <TableHead className="min-w-[120px] sticky left-[72px] bg-background z-10">Kode</TableHead>
                      <TableHead className="min-w-[300px]">Deskripsi</TableHead>
                      <TableHead className="min-w-[120px]">Kategori</TableHead>
                      <TableHead className="min-w-[150px]">Pemilik</TableHead>
                      <TableHead className="min-w-[100px] text-center">Penyebab</TableHead>
                      {/* Controls count column removed as controls are per cause now */}
                      <TableHead className="text-right min-w-[100px] sticky right-0 bg-background z-10">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPotentialRisks.map((pRisk) => {
                      const isExpanded = expandedRiskId === pRisk.id;
                      const potentialRiskCodeDisplay = `${goal?.code || 'S?'}.PR${pRisk.sequenceNumber || 'N/A'}`;
                      return (
                        <Fragment key={pRisk.id}>
                          <TableRow>
                            <TableCell className="sticky left-0 bg-background z-10">
                              <Checkbox
                                  checked={selectedRiskIds.includes(pRisk.id)}
                                  onCheckedChange={(checked) => handleSelectRisk(pRisk.id, Boolean(checked))}
                                  aria-label={`Pilih risiko ${pRisk.description}`}
                                  disabled={!currentUser}
                              />
                            </TableCell>
                            <TableCell className="sticky left-10 bg-background z-10">
                              <Button variant="ghost" size="icon" onClick={() => toggleExpandRisk(pRisk.id)} aria-label={isExpanded ? "Sembunyikan deskripsi" : "Tampilkan deskripsi"} className="h-8 w-8">
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </Button>
                            </TableCell>
                            <TableCell className="font-mono text-xs sticky left-[72px] bg-background z-10">{potentialRiskCodeDisplay}</TableCell>
                            <TableCell className="font-medium text-xs max-w-xs truncate" title={pRisk.description}>
                                {pRisk.description}
                            </TableCell>
                            <TableCell><Badge variant={pRisk.category ? "secondary" : "outline"} className="text-xs">{pRisk.category || 'N/A'}</Badge></TableCell>
                            <TableCell className="text-xs truncate max-w-[150px]" title={pRisk.owner || ''}>{pRisk.owner || 'N/A'}</TableCell>
                            <TableCell className="text-center text-xs">{riskCauseCounts[pRisk.id] || 0}</TableCell>
                            {/* Controls count cell removed */}
                            <TableCell className="text-right sticky right-0 bg-background z-10">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Settings2 className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => router.push(`/all-risks/manage/${pRisk.id}?from=${encodeURIComponent(`/risks/${goal.id}`)}`)}>
                                    <Edit className="mr-2 h-4 w-4" /> Edit Detail & Penyebab
                                  </DropdownMenuItem>
                                   <DropdownMenuItem onClick={() => router.push(`/risk-analysis?potentialRiskId=${pRisk.id}`)}>
                                      <BarChart3 className="mr-2 h-4 w-4" /> Analisis Semua Penyebab
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDuplicateRisk(pRisk)} disabled={!currentUser}>
                                    <Copy className="mr-2 h-4 w-4" /> Duplikat Risiko
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleDeleteSingleRisk(pRisk)} className="text-destructive focus:text-destructive focus:bg-destructive/10" disabled={!currentUser}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Hapus Potensi Risiko
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow className="bg-muted/30 hover:bg-muted/40">
                              <TableCell className="sticky left-0 bg-muted/30 z-10" /> 
                              <TableCell className="sticky left-10 bg-muted/30 z-10" />
                              <TableCell className="sticky left-[72px] bg-muted/30 z-10" />
                              <TableCell colSpan={totalTableColumns - 3} className="p-0"> {/* Adjusted colSpan */}
                                <div className="p-3 space-y-1 text-xs">
                                  <h4 className="font-semibold text-foreground">Deskripsi Lengkap:</h4>
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
      </div>

      <AlertDialog open={isSingleDeleteDialogOpen} onOpenChange={setIsSingleDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
            <AlertDialogDescription>
                Apakah Anda yakin ingin menghapus potensi risiko "{riskToDelete?.description}" ({goal?.code || 'S?'}.PR{riskToDelete?.sequenceNumber || 'N/A'})? Semua penyebab dan kontrol terkait juga akan dihapus. Tindakan ini tidak dapat dibatalkan.
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
