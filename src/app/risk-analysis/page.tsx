
"use client";

import React, { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Goal, PotentialRisk, RiskCause, RiskCategory, LikelihoodLevelDesc, ImpactLevelDesc, RiskSource, CalculatedRiskLevelCategory, ControlMeasure } from '@/lib/types';
import { RISK_CATEGORIES, LIKELIHOOD_LEVELS_MAP, IMPACT_LEVELS_MAP, RISK_SOURCES } from '@/lib/types';
import { Loader2, ListChecks, Search, Filter, BarChart3, Settings2, Trash2, AlertTriangle, CheckCircle2, Columns } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { getCurrentUprId, getCurrentPeriod, initializeAppContext } from '@/lib/upr-period-context';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { getCalculatedRiskLevel, getRiskLevelColor } from '@/app/risk-cause-analysis/[riskCauseId]/page'; 

const getGoalsStorageKey = (uprId: string, period: string) => `riskwise-upr${uprId}-period${period}-goals`;
const getPotentialRisksStorageKeyForGoal = (uprId: string, period: string, goalId: string) => `riskwise-upr${uprId}-period${period}-goal${goalId}-potentialRisks`;
const getRiskCausesStorageKey = (uprId: string, period: string, potentialRiskId: string) => `riskwise-upr${uprId}-period${period}-potentialRisk${potentialRiskId}-causes`;
const getControlsForCauseStorageKey = (uprId: string, period: string, riskCauseId: string) => `riskwise-upr${uprId}-period${period}-riskCause${riskCauseId}-controls`;


interface EnrichedRiskCause extends RiskCause {
  potentialRiskDescription: string;
  potentialRiskCategory: RiskCategory | null;
  goalName: string;
  goalCode: string; 
  potentialRiskSequenceNumber: number; 
  goalUprId: string; 
  goalPeriod: string;
  goalId: string;
}


const ALL_COLUMNS_CONFIG: Array<{ id: keyof ColumnVisibility; label: string; defaultVisible: boolean }> = [
  { id: 'sumber', label: 'Sumber', defaultVisible: true },
  { id: 'kri', label: 'KRI', defaultVisible: true },
  { id: 'toleransi', label: 'Toleransi', defaultVisible: true },
  { id: 'kemungkinan', label: 'Kemungkinan', defaultVisible: true },
  { id: 'dampak', label: 'Dampak', defaultVisible: true },
  { id: 'tingkatRisiko', label: 'Tingkat Risiko', defaultVisible: true },
  { id: 'potensiRisikoInduk', label: 'Potensi Risiko Induk', defaultVisible: false },
  { id: 'sasaranInduk', label: 'Sasaran Induk', defaultVisible: false },
];

type ColumnVisibility = {
  sumber: boolean;
  kri: boolean;
  toleransi: boolean;
  kemungkinan: boolean;
  dampak: boolean;
  tingkatRisiko: boolean;
  potensiRisikoInduk: boolean;
  sasaranInduk: boolean;
};

const ALL_POSSIBLE_CALCULATED_RISK_LEVELS: CalculatedRiskLevelCategory[] = ['Sangat Rendah', 'Rendah', 'Sedang', 'Tinggi', 'Sangat Tinggi'];


export default function RiskAnalysisPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUprId, setCurrentUprId] = useState('');
  const [currentPeriod, setCurrentPeriod] = useState('');
  
  const [allEnrichedRiskCauses, setAllEnrichedRiskCauses] = useState<EnrichedRiskCause[]>([]);
  const [allGoals, setAllGoals] = useState<Goal[]>([]); 
  
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<RiskCategory[]>([]); 
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]); 
  const [selectedSources, setSelectedSources] = useState<RiskSource[]>([]);
  const [selectedRiskLevels, setSelectedRiskLevels] = useState<string[]>([]);
  
  const [selectedCauseIds, setSelectedCauseIds] = useState<string[]>([]);
  const [causeToDelete, setCauseToDelete] = useState<EnrichedRiskCause | null>(null);
  const [isSingleDeleteDialogOpen, setIsSingleDeleteDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(
    ALL_COLUMNS_CONFIG.reduce((acc, col) => {
      acc[col.id] = col.defaultVisible;
      return acc;
    }, {} as ColumnVisibility)
  );

  const toggleColumnVisibility = (columnId: keyof ColumnVisibility) => {
    setColumnVisibility(prev => ({ ...prev, [columnId]: !prev[columnId] }));
  };

  const loadData = useCallback(() => {
    if (typeof window !== 'undefined' && currentUprId && currentPeriod) {
      setIsLoading(true);
      
      const goalsStorageKey = getGoalsStorageKey(currentUprId, currentPeriod);
      const storedGoalsData = localStorage.getItem(goalsStorageKey);
      const loadedGoals: Goal[] = storedGoalsData ? JSON.parse(storedGoalsData).sort((a:Goal, b:Goal) => (a.code || '').localeCompare(b.code || '', undefined, {numeric: true, sensitivity: 'base'})) : [];
      setAllGoals(loadedGoals);

      let collectedEnrichedRiskCauses: EnrichedRiskCause[] = [];

      loadedGoals.forEach(goal => {
        const potentialRisksStorageKey = getPotentialRisksStorageKeyForGoal(goal.uprId, goal.period, goal.id);
        const storedPotentialRisksData = localStorage.getItem(potentialRisksStorageKey);
        if (storedPotentialRisksData) {
          const goalPotentialRisks: PotentialRisk[] = JSON.parse(storedPotentialRisksData).sort((a:PotentialRisk, b:PotentialRisk) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0));
          
          goalPotentialRisks.forEach(pRisk => {
            const causesStorageKey = getRiskCausesStorageKey(goal.uprId, goal.period, pRisk.id);
            const storedCausesData = localStorage.getItem(causesStorageKey);
            if (storedCausesData) {
              const pRiskCauses: RiskCause[] = JSON.parse(storedCausesData).sort((a:RiskCause, b:RiskCause) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0));
              const enrichedCauses = pRiskCauses.map(cause => ({
                ...cause,
                potentialRiskDescription: pRisk.description,
                potentialRiskCategory: pRisk.category,
                potentialRiskSequenceNumber: pRisk.sequenceNumber || 0,
                goalName: goal.name,
                goalCode: goal.code || "", 
                goalUprId: goal.uprId, 
                goalPeriod: goal.period,
                goalId: goal.id,
              }));
              collectedEnrichedRiskCauses = [...collectedEnrichedRiskCauses, ...enrichedCauses];
            }
          });
        }
      });
      setAllEnrichedRiskCauses(collectedEnrichedRiskCauses);
      setSelectedCauseIds([]); 
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
  
  const toggleSourceFilter = (source: RiskSource) => {
    setSelectedSources(prev =>
        prev.includes(source)
        ? prev.filter(s => s !== source)
        : [...prev, source]
    );
  };

  const toggleRiskLevelFilter = (level: string) => {
    setSelectedRiskLevels(prev =>
        prev.includes(level)
        ? prev.filter(l => l !== level)
        : [...prev, level]
    );
  };

  const filteredAndSortedCauses = useMemo(() => {
    let tempCauses = [...allEnrichedRiskCauses];

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      tempCauses = tempCauses.filter(cause => 
        cause.description.toLowerCase().includes(lowerSearchTerm) ||
        (cause.keyRiskIndicator && cause.keyRiskIndicator.toLowerCase().includes(lowerSearchTerm)) ||
        cause.potentialRiskDescription.toLowerCase().includes(lowerSearchTerm) ||
        cause.goalName.toLowerCase().includes(lowerSearchTerm) ||
        `${cause.goalCode || ''}.PR${cause.potentialRiskSequenceNumber || ''}.PC${cause.sequenceNumber || ''}`.toLowerCase().includes(lowerSearchTerm)
      );
    }

    if (selectedCategories.length > 0) {
      tempCauses = tempCauses.filter(cause =>
        cause.potentialRiskCategory && selectedCategories.includes(cause.potentialRiskCategory)
      );
    }
    
    if (selectedGoalIds.length > 0) {
        tempCauses = tempCauses.filter(cause => selectedGoalIds.includes(cause.goalId));
    }

    if (selectedSources.length > 0) {
        tempCauses = tempCauses.filter(cause => selectedSources.includes(cause.source));
    }

    if (selectedRiskLevels.length > 0) {
        tempCauses = tempCauses.filter(cause => {
            const { level } = getCalculatedRiskLevel(cause.likelihood, cause.impact);
            return selectedRiskLevels.includes(level);
        });
    }

    return tempCauses.sort((a, b) => {
        const codeA = `${a.goalCode || 'S?'}.PR${a.potentialRiskSequenceNumber || 0}.PC${a.sequenceNumber || 0}`;
        const codeB = `${b.goalCode || 'S?'}.PR${b.potentialRiskSequenceNumber || 0}.PC${b.sequenceNumber || 0}`;
        return codeA.localeCompare(codeB, undefined, {numeric: true, sensitivity: 'base'});
    });
  }, [allEnrichedRiskCauses, searchTerm, selectedCategories, selectedGoalIds, selectedSources, selectedRiskLevels]);

  const handleSelectCause = (causeId: string, checked: boolean) => {
    setSelectedCauseIds(prev =>
      checked ? [...prev, causeId] : prev.filter(id => id !== causeId)
    );
  };

  const handleSelectAllVisibleCauses = (checked: boolean) => {
    if (checked) {
      setSelectedCauseIds(filteredAndSortedCauses.map(cause => cause.id));
    } else {
      setSelectedCauseIds([]);
    }
  };

  const deleteCausesFromStorage = (causesToDelete: EnrichedRiskCause[]) => {
    const causesByPotentialRisk = causesToDelete.reduce((acc, cause) => {
      (acc[cause.potentialRiskId] = acc[cause.potentialRiskId] || []).push(cause.id);
      return acc;
    }, {} as Record<string, string[]>);

    let updatedEnrichedCauses = [...allEnrichedRiskCauses];

    for (const pRiskId in causesByPotentialRisk) {
      const causeIdsToDeleteForThisPR = causesByPotentialRisk[pRiskId];
      const parentContext = causesToDelete.find(c => c.potentialRiskId === pRiskId); 
      if (parentContext) {
        const storageKey = getRiskCausesStorageKey(parentContext.goalUprId, parentContext.goalPeriod, pRiskId);
        const storedCausesData = localStorage.getItem(storageKey);
        if (storedCausesData) {
          let currentPRCauses: RiskCause[] = JSON.parse(storedCausesData);
          currentPRCauses = currentPRCauses.filter(rc => !causeIdsToDeleteForThisPR.includes(rc.id));
          currentPRCauses = currentPRCauses.sort((a,b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0))
                                          .map((rc, index) => ({ ...rc, sequenceNumber: index + 1 }));
          localStorage.setItem(storageKey, JSON.stringify(currentPRCauses));
        }
        // Also delete associated controls for each deleted cause
        causeIdsToDeleteForThisPR.forEach(causeId => {
            localStorage.removeItem(getControlsForCauseStorageKey(parentContext.goalUprId, parentContext.goalPeriod, causeId));
        });
      }
      updatedEnrichedCauses = updatedEnrichedCauses.filter(rc => !(rc.potentialRiskId === pRiskId && causeIdsToDeleteForThisPR.includes(rc.id)));
    }
    setAllEnrichedRiskCauses(updatedEnrichedCauses);
  };

  const handleDeleteSingleCause = (cause: EnrichedRiskCause) => {
    setCauseToDelete(cause);
    setIsSingleDeleteDialogOpen(true);
  };

  const confirmDeleteSingleCause = () => {
    if (causeToDelete) {
      deleteCausesFromStorage([causeToDelete]);
      toast({ title: "Penyebab Risiko Dihapus", description: `Penyebab "${causeToDelete.description}" telah dihapus.`, variant: "destructive" });
    }
    setIsSingleDeleteDialogOpen(false);
    setCauseToDelete(null);
    setSelectedCauseIds(prev => prev.filter(id => id !== causeToDelete?.id));
  };

  const handleDeleteSelectedCauses = () => {
    if (selectedCauseIds.length === 0) {
      toast({ title: "Tidak Ada Penyebab Dipilih", description: "Harap pilih setidaknya satu penyebab risiko untuk dihapus.", variant: "destructive" });
      return;
    }
    setIsBulkDeleteDialogOpen(true);
  };

  const confirmDeleteSelectedCauses = () => {
    const causesToDelete = allEnrichedRiskCauses.filter(cause => selectedCauseIds.includes(cause.id));
    if (causesToDelete.length > 0) {
      deleteCausesFromStorage(causesToDelete);
      toast({ title: "Hapus Massal Berhasil", description: `${causesToDelete.length} penyebab risiko telah dihapus.`, variant: "destructive" });
    }
    setSelectedCauseIds([]);
    setIsBulkDeleteDialogOpen(false);
  };

  const { totalCauses, completeCauses, incompleteCauses } = useMemo(() => {
    const total = allEnrichedRiskCauses.length;
    const complete = allEnrichedRiskCauses.filter(
      c => c.keyRiskIndicator && c.riskTolerance && c.likelihood && c.impact
    ).length;
    return {
      totalCauses: total,
      completeCauses: complete,
      incompleteCauses: total - complete,
    };
  }, [allEnrichedRiskCauses]);

  if (isLoading || !currentUprId || !currentPeriod) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat data analisis penyebab risiko...</p>
      </div>
    );
  }

  const relevantGoalsForFilter = allGoals.filter(g => g.uprId === currentUprId && g.period === currentPeriod);


  return (
    <div className="space-y-6">
      <PageHeader
        title={`Analisis Detail Penyebab Risiko`}
        description={`Lakukan analisis KRI, Toleransi, Kemungkinan, Dampak, dan Rencana Pengendalian untuk setiap penyebab risiko di UPR: ${currentUprId}, Periode: ${currentPeriod}.`}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Penyebab Risiko</CardTitle>
            <ListChecks className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCauses}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Analisis Lengkap</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completeCauses}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Analisis Belum Lengkap</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{incompleteCauses}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-2 mb-4 justify-between items-center">
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto items-center">
            <div className="relative flex-grow md:flex-grow-0 md:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="Cari kode, penyebab, KRI..."
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
                    Kategori PR {selectedCategories.length > 0 ? `(${selectedCategories.length})` : ''}
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[250px]">
                <DropdownMenuLabel>Pilih Kategori Potensi Risiko</DropdownMenuLabel>
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
                    Sasaran {selectedGoalIds.length > 0 ? `(${selectedGoalIds.length})` : ''}
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[300px]">
                <DropdownMenuLabel>Pilih Sasaran Terkait</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {relevantGoalsForFilter.length > 0 ? (
                    <ScrollArea className="h-[200px]">
                    {relevantGoalsForFilter.map((goal) => (
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
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="outline">
                    <Filter className="mr-2 h-4 w-4" />
                    Sumber {selectedSources.length > 0 ? `(${selectedSources.length})` : ''}
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuLabel>Pilih Sumber Penyebab</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {RISK_SOURCES.map((source) => (
                    <DropdownMenuCheckboxItem
                    key={source}
                    checked={selectedSources.includes(source)}
                    onCheckedChange={() => toggleSourceFilter(source)}
                    >
                    {source}
                    </DropdownMenuCheckboxItem>
                ))}
                </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="outline">
                    <Filter className="mr-2 h-4 w-4" />
                    Level Risiko {selectedRiskLevels.length > 0 ? `(${selectedRiskLevels.length})` : ''}
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuLabel>Pilih Level Risiko Penyebab</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {ALL_POSSIBLE_CALCULATED_RISK_LEVELS.map((level) => (
                    <DropdownMenuCheckboxItem
                    key={level}
                    checked={selectedRiskLevels.includes(level)}
                    onCheckedChange={() => toggleRiskLevelFilter(level)}
                    >
                    {level}
                    </DropdownMenuCheckboxItem>
                ))}
                 <DropdownMenuCheckboxItem 
                    key="N/A"
                    checked={selectedRiskLevels.includes("N/A")}
                    onCheckedChange={() => toggleRiskLevelFilter("N/A")}
                    >
                    N/A (Belum Dianalisis)
                </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Columns className="mr-2 h-4 w-4" />
                  Kolom
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Tampilkan Kolom</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {ALL_COLUMNS_CONFIG.map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    checked={columnVisibility[col.id]}
                    onCheckedChange={() => toggleColumnVisibility(col.id)}
                  >
                    {col.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
        </div>
         {selectedCauseIds.length > 0 && (
            <Button variant="destructive" onClick={handleDeleteSelectedCauses} className="mt-2 md:mt-0">
            <Trash2 className="mr-2 h-4 w-4" />
            Hapus ({selectedCauseIds.length}) yang Dipilih
            </Button>
        )}
      </div>

      {filteredAndSortedCauses.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
          <ListChecks className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-lg font-medium">
            {allEnrichedRiskCauses.length === 0 
              ? "Belum ada penyebab risiko yang teridentifikasi untuk dianalisis."
              : "Tidak ada penyebab risiko yang cocok dengan kriteria filter Anda."}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {allEnrichedRiskCauses.length === 0
              ? "Identifikasi potensi risiko dan penyebabnya terlebih dahulu di menu Identifikasi Risiko."
              : "Coba sesuaikan pencarian atau filter Anda."}
          </p>
        </div>
      ) : (
        <Card className="w-full">
          <CardContent className="p-0">
            <div className="relative w-full overflow-auto">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead className="w-[40px]">
                        <Checkbox
                            checked={selectedCauseIds.length === filteredAndSortedCauses.length && filteredAndSortedCauses.length > 0}
                            onCheckedChange={(checked) => handleSelectAllVisibleCauses(Boolean(checked))}
                            aria-label="Pilih semua penyebab yang terlihat"
                            disabled={filteredAndSortedCauses.length === 0}
                        />
                    </TableHead>
                    <TableHead className="min-w-[120px]">Kode</TableHead>
                    <TableHead className="min-w-[250px] max-w-xs">Penyebab Potensi Risiko</TableHead>
                    {columnVisibility.sumber && <TableHead className="min-w-[100px]">Sumber</TableHead>}
                    {columnVisibility.kri && <TableHead className="min-w-[180px] max-w-xs">KRI</TableHead>}
                    {columnVisibility.toleransi && <TableHead className="min-w-[180px] max-w-xs">Toleransi</TableHead>}
                    {columnVisibility.kemungkinan && <TableHead className="min-w-[150px]">Kemungkinan</TableHead>}
                    {columnVisibility.dampak && <TableHead className="min-w-[150px]">Dampak</TableHead>}
                    {columnVisibility.tingkatRisiko && <TableHead className="min-w-[150px]">Tingkat Risiko</TableHead>}
                    {columnVisibility.potensiRisikoInduk && <TableHead className="min-w-[250px] max-w-xs">Potensi Risiko Induk</TableHead>}
                    {columnVisibility.sasaranInduk && <TableHead className="min-w-[200px] max-w-sm">Sasaran Induk</TableHead>}
                    <TableHead className="text-right w-[100px]">Aksi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredAndSortedCauses.map((cause) => {
                    const {level: causeRiskLevelText, score: causeRiskScore} = getCalculatedRiskLevel(cause.likelihood, cause.impact);
                    const goalCodeDisplay = (cause.goalCode && cause.goalCode.trim() !== '') ? cause.goalCode : '[Tanpa Kode]';
                    const causeCode = `${goalCodeDisplay}.PR${cause.potentialRiskSequenceNumber || 'N/A'}.PC${cause.sequenceNumber || 'N/A'}`;
                    return (
                        <Fragment key={cause.id}>
                        <TableRow>
                            <TableCell>
                            <Checkbox
                                checked={selectedCauseIds.includes(cause.id)}
                                onCheckedChange={(checked) => handleSelectCause(cause.id, Boolean(checked))}
                                aria-label={`Pilih penyebab ${cause.description}`}
                            />
                            </TableCell>
                            <TableCell className="text-xs font-mono">{causeCode}</TableCell>
                            <TableCell className="font-medium text-xs max-w-xs truncate" title={cause.description}>{cause.description}</TableCell>
                            {columnVisibility.sumber && <TableCell className="text-xs"><Badge variant="outline">{cause.source}</Badge></TableCell>}
                            {columnVisibility.kri && <TableCell className="text-xs max-w-xs truncate" title={cause.keyRiskIndicator || ''}>{cause.keyRiskIndicator || '-'}</TableCell>}
                            {columnVisibility.toleransi && <TableCell className="text-xs max-w-xs truncate" title={cause.riskTolerance || ''}>{cause.riskTolerance || '-'}</TableCell>}
                            {columnVisibility.kemungkinan && <TableCell><Badge variant={cause.likelihood ? "outline" : "ghost"} className={`text-xs ${!cause.likelihood ? "text-muted-foreground" : ""}`}>{cause.likelihood ? `${cause.likelihood} (${LIKELIHOOD_LEVELS_MAP[cause.likelihood]})` : 'N/A'}</Badge></TableCell>}
                            {columnVisibility.dampak && <TableCell><Badge variant={cause.impact ? "outline" : "ghost"} className={`text-xs ${!cause.impact ? "text-muted-foreground" : ""}`}>{cause.impact ? `${cause.impact} (${IMPACT_LEVELS_MAP[cause.impact]})` : 'N/A'}</Badge></TableCell>}
                            {columnVisibility.tingkatRisiko && <TableCell><Badge className={`${getRiskLevelColor(causeRiskLevelText)} text-xs`}>{causeRiskLevelText === 'N/A' ? 'N/A' : `${causeRiskLevelText} (${causeRiskScore || 'N/A'})`}</Badge></TableCell>}
                            {columnVisibility.potensiRisikoInduk && 
                              <TableCell className="text-xs max-w-xs truncate" title={cause.potentialRiskDescription}>
                                PR{cause.potentialRiskSequenceNumber || 'N/A'} - {cause.potentialRiskDescription} 
                                {cause.potentialRiskCategory && <Badge variant="secondary" className="ml-1 text-[10px]">{cause.potentialRiskCategory}</Badge>}
                              </TableCell>
                            }
                            {columnVisibility.sasaranInduk && 
                              <TableCell className="text-xs max-w-sm truncate text-muted-foreground" title={cause.goalName}>
                                {goalCodeDisplay} - {cause.goalName}
                              </TableCell>
                            }
                            <TableCell className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Settings2 className="h-4 w-4" />
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                    <Link href={`/risk-cause-analysis/${cause.id}?from=/risk-analysis`}>
                                    <BarChart3 className="mr-2 h-4 w-4" /> Analisis Detail
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeleteSingleCause(cause)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                    <Trash2 className="mr-2 h-4 w-4" /> Hapus Penyebab
                                </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            </TableCell>
                        </TableRow>
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
              Apakah Anda yakin ingin menghapus penyebab risiko "{causeToDelete?.description}"? Semua rencana pengendalian terkait juga akan dihapus. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {setIsSingleDeleteDialogOpen(false); setCauseToDelete(null);}}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSingleCause} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

       <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus Massal</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus {selectedCauseIds.length} penyebab risiko yang dipilih? Semua rencana pengendalian terkait juga akan dihapus. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSelectedCauses} className="bg-destructive hover:bg-destructive/90">Hapus ({selectedCauseIds.length})</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
