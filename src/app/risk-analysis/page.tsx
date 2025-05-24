
"use client";

import React, { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RiskAnalysisModal } from '@/components/risks/risk-analysis-modal';
import type { Goal, PotentialRisk, RiskCategory, LikelihoodImpactLevel } from '@/lib/types';
import { RISK_CATEGORIES, LIKELIHOOD_IMPACT_LEVELS } from '@/lib/types';
import { Loader2, Settings2, BarChart3, ListChecks, ChevronDown, ChevronUp, Search, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { getCurrentUprId, getCurrentPeriod, initializeAppContext } from '@/lib/upr-period-context';
import { ScrollArea } from '@/components/ui/scroll-area';

const getGoalsStorageKey = (uprId: string, period: string) => `riskwise-upr${uprId}-period${period}-goals`;
const getPotentialRisksStorageKey = (uprId: string, period: string, goalId: string) => `riskwise-upr${uprId}-period${period}-goal${goalId}-potentialRisks`;

const getRiskLevel = (likelihood: LikelihoodImpactLevel | null, impact: LikelihoodImpactLevel | null): string => {
  if (!likelihood || !impact) return 'N/A';
  const L: { [key in LikelihoodImpactLevel]: number } = { 'Sangat Rendah': 1, 'Rendah': 2, 'Sedang': 3, 'Tinggi': 4, 'Sangat Tinggi': 5 };
  const I: { [key in LikelihoodImpactLevel]: number } = { 'Sangat Rendah': 1, 'Rendah': 2, 'Sedang': 3, 'Tinggi': 4, 'Sangat Tinggi': 5 };
  
  const likelihoodValue = L[likelihood];
  const impactValue = I[impact];

  if (!likelihoodValue || !impactValue) return 'N/A'; // Should not happen if types are correct

  const score = likelihoodValue * impactValue;

  if (score >= 20) return 'Sangat Tinggi';
  if (score >= 16) return 'Tinggi';
  if (score >= 12) return 'Sedang';
  if (score >= 6) return 'Rendah';
  if (score >= 1) return 'Sangat Rendah';
  return 'N/A';
};

const getRiskLevelColor = (level: string) => {
  switch (level.toLowerCase()) {
    case 'sangat tinggi': return 'bg-red-600 hover:bg-red-700 text-white';
    case 'tinggi': return 'bg-orange-500 hover:bg-orange-600 text-white';
    case 'sedang': return 'bg-yellow-400 hover:bg-yellow-500 text-black dark:bg-yellow-500 dark:text-black';
    case 'rendah': return 'bg-blue-500 hover:bg-blue-600 text-white'; // Changed from green to blue as per matrix
    case 'sangat rendah': return 'bg-green-500 hover:bg-green-600 text-white';
    default: return 'bg-gray-400 hover:bg-gray-500 text-white';
  }
};

export default function RiskAnalysisPage() {
  const router = useRouter();
  const [currentUprId, setCurrentUprId] = useState('');
  const [currentPeriod, setCurrentPeriod] = useState('');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [allPotentialRisks, setAllPotentialRisks] = useState<PotentialRisk[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRiskId, setExpandedRiskId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<RiskCategory[]>([]);
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);

  const [selectedPotentialRiskForAnalysis, setSelectedPotentialRiskForAnalysis] = useState<PotentialRisk | null>(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  
  const { toast } = useToast();

  const loadData = useCallback(() => {
    if (typeof window !== 'undefined' && currentUprId && currentPeriod) {
      setIsLoading(true);
      const goalsStorageKey = getGoalsStorageKey(currentUprId, currentPeriod);
      const storedGoalsData = localStorage.getItem(goalsStorageKey);
      const loadedGoals: Goal[] = storedGoalsData ? JSON.parse(storedGoalsData) : [];
      setGoals(loadedGoals);

      let collectedPotentialRisks: PotentialRisk[] = [];
      loadedGoals.forEach(goal => {
        const potentialRisksStorageKey = getPotentialRisksStorageKey(goal.uprId, goal.period, goal.id);
        const storedPotentialRisksData = localStorage.getItem(potentialRisksStorageKey);
        if (storedPotentialRisksData) {
          const goalPotentialRisks: PotentialRisk[] = JSON.parse(storedPotentialRisksData);
          collectedPotentialRisks = [...collectedPotentialRisks, ...goalPotentialRisks];
        }
      });
      setAllPotentialRisks(collectedPotentialRisks);
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
      localStorage.setItem(key, JSON.stringify(updatedPotentialRisksForGoal.sort((a,b) => a.description.localeCompare(b.description))));
    }
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

    toast({ title: "Analisis Risiko Disimpan", description: `Analisis disimpan untuk: "${updatedPotentialRisk.description}"`});
    setIsAnalysisModalOpen(false);
    setSelectedPotentialRiskForAnalysis(null);
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
        const goalName = goals.find(g => g.id === pRisk.goalId)?.name.toLowerCase() || '';
        return (
          pRisk.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (pRisk.category && pRisk.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (pRisk.owner && pRisk.owner.toLowerCase().includes(searchTerm.toLowerCase())) ||
          goalName.includes(searchTerm.toLowerCase())
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

    return tempRisks.sort((a, b) => a.description.localeCompare(b.description));
  }, [allPotentialRisks, searchTerm, selectedCategories, selectedGoalIds, goals]);


  if (isLoading || !currentUprId || !currentPeriod) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat data analisis risiko...</p>
      </div>
    );
  }

  const relevantGoals = goals.filter(g => g.uprId === currentUprId && g.period === currentPeriod);
  const totalTableColumns = 9; 

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Analisis Risiko`}
        description={`Analisis probabilitas dan dampak untuk potensi risiko di UPR: ${currentUprId}, Periode: ${currentPeriod}.`}
      />

      <div className="flex flex-col md:flex-row gap-2 mb-4">
        <div className="relative flex-grow md:flex-grow-0 md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari deskripsi, kategori, pemilik, sasaran..."
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
                <ChevronDown className="ml-2 h-4 w-4" />
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
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[300px]">
              <DropdownMenuLabel>Pilih Sasaran Terkait</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {relevantGoals.length > 0 ? (
                <ScrollArea className="h-[200px]">
                  {relevantGoals.map((goal) => (
                    <DropdownMenuCheckboxItem
                      key={goal.id}
                      checked={selectedGoalIds.includes(goal.id)}
                      onCheckedChange={() => toggleGoalFilter(goal.id)}
                    >
                      {goal.name}
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
              ? "Belum ada potensi risiko yang teridentifikasi untuk dianalisis."
              : "Tidak ada potensi risiko yang cocok dengan kriteria filter Anda."}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {allPotentialRisks.length === 0
              ? "Identifikasi potensi risiko terlebih dahulu di modul Identifikasi Risiko."
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
                  <TableHead className="w-[25%] min-w-[200px]">Deskripsi</TableHead>
                  <TableHead className="min-w-[120px]">Kategori</TableHead>
                  <TableHead className="min-w-[120px]">Pemilik</TableHead>
                  <TableHead className="min-w-[180px]">Sasaran Terkait</TableHead>
                  <TableHead className="min-w-[120px]">Probabilitas</TableHead>
                  <TableHead className="min-w-[120px]">Dampak</TableHead>
                  <TableHead className="min-w-[120px]">Level Risiko</TableHead>
                  <TableHead className="text-right w-[100px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedRisks.map((pRisk) => {
                  const associatedGoal = goals.find(g => g.id === pRisk.goalId);
                  const isExpanded = expandedRiskId === pRisk.id;
                  const associatedGoalName = associatedGoal?.name || 'N/A';
                  const riskLevelValue = getRiskLevel(pRisk.likelihood, pRisk.impact);

                  return (
                    <Fragment key={pRisk.id}>
                      <TableRow>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => toggleExpandRisk(pRisk.id)} aria-label={isExpanded ? "Sembunyikan deskripsi" : "Tampilkan deskripsi"}>
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium max-w-xs truncate" title={pRisk.description}>
                            {pRisk.description}
                        </TableCell>
                        <TableCell className="text-xs max-w-[120px] truncate" title={pRisk.category || ''}>
                          <Badge variant={pRisk.category ? "secondary" : "outline"}>{pRisk.category || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell className="text-xs max-w-[120px] truncate" title={pRisk.owner || ''}>{pRisk.owner || 'N/A'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate" title={associatedGoalName}>
                          {associatedGoalName}
                        </TableCell>
                        <TableCell>
                           <Badge variant={pRisk.likelihood ? "outline" : "ghost"} className={!pRisk.likelihood ? "text-muted-foreground" : ""}>
                            {pRisk.likelihood || 'Belum Dinilai'}
                           </Badge>
                        </TableCell>
                        <TableCell>
                            <Badge variant={pRisk.impact ? "outline" : "ghost"} className={!pRisk.impact ? "text-muted-foreground" : ""}>
                                {pRisk.impact || 'Belum Dinilai'}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            <Badge className={`${getRiskLevelColor(riskLevelValue)}`}>
                                {riskLevelValue}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => handleOpenAnalysisModal(pRisk)}>
                            <BarChart3 className="mr-2 h-4 w-4" /> Analisis
                          </Button>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow className="bg-muted/30 hover:bg-muted/40">
                          <TableCell colSpan={totalTableColumns} className="p-0">
                            <div className="p-3 space-y-1 text-sm">
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
          </CardContent>
        </Card>
      )}

      {selectedPotentialRiskForAnalysis && <RiskAnalysisModal
        potentialRisk={selectedPotentialRiskForAnalysis}
        isOpen={isAnalysisModalOpen}
        onOpenChange={setIsAnalysisModalOpen}
        onSave={handleSaveRiskAnalysis}
      />}
    </div>
  );
}

