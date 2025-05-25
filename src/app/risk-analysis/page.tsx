
"use client";

import React, { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Goal, PotentialRisk, RiskCause, RiskCategory, LikelihoodImpactLevel, RiskSource } from '@/lib/types';
import { RISK_CATEGORIES, LIKELIHOOD_IMPACT_LEVELS, RISK_SOURCES } from '@/lib/types';
import { Loader2, Settings2, Zap, ListChecks, ChevronDown, ChevronUp, Search, Filter, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { getCurrentUprId, getCurrentPeriod, initializeAppContext } from '@/lib/upr-period-context';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RiskCauseAnalysisModal } from '@/components/risks/risk-cause-analysis-modal';

const getGoalsStorageKey = (uprId: string, period: string) => `riskwise-upr${uprId}-period${period}-goals`;
const getPotentialRisksStorageKey = (uprId: string, period: string, goalId: string) => `riskwise-upr${uprId}-period${period}-goal${goalId}-potentialRisks`;
const getRiskCausesStorageKey = (uprId: string, period: string, potentialRiskId: string) => `riskwise-upr${uprId}-period${period}-potentialRisk${potentialRiskId}-causes`;

interface EnrichedRiskCause extends RiskCause {
  potentialRiskDescription: string;
  potentialRiskCategory: RiskCategory | null;
  potentialRiskOwner: string | null;
  goalName: string;
  goalUprId: string;
  goalPeriod: string;
  parentPotentialRiskId: string;
  parentPotentialRiskObject: PotentialRisk; // To pass to modal
}

const getRiskLevel = (likelihood: LikelihoodImpactLevel | null, impact: LikelihoodImpactLevel | null): string => {
  if (!likelihood || !impact) return 'N/A';
  const L: { [key in LikelihoodImpactLevel]: number } = { 'Sangat Rendah': 1, 'Rendah': 2, 'Sedang': 3, 'Tinggi': 4, 'Sangat Tinggi': 5 };
  const I: { [key in LikelihoodImpactLevel]: number } = { 'Sangat Rendah': 1, 'Rendah': 2, 'Sedang': 3, 'Tinggi': 4, 'Sangat Tinggi': 5 };
  
  const likelihoodValue = L[likelihood];
  const impactValue = I[impact];

  if (!likelihoodValue || !impactValue) return 'N/A';

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
    case 'rendah': return 'bg-blue-500 hover:bg-blue-600 text-white';
    case 'sangat rendah': return 'bg-green-500 hover:bg-green-600 text-white';
    default: return 'bg-gray-400 hover:bg-gray-500 text-white';
  }
};

export default function RiskAnalysisPage() {
  const router = useRouter();
  const [currentUprId, setCurrentUprId] = useState('');
  const [currentPeriod, setCurrentPeriod] = useState('');
  
  const [allGoals, setAllGoals] = useState<Goal[]>([]);
  const [allPotentialRisks, setAllPotentialRisks] = useState<PotentialRisk[]>([]);
  const [allEnrichedRiskCauses, setAllEnrichedRiskCauses] = useState<EnrichedRiskCause[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCauseId, setExpandedCauseId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<RiskCategory[]>([]); // Filters by PotentialRisk category
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]); // Filters by Goal ID
  const [selectedSources, setSelectedSources] = useState<RiskSource[]>([]); // Filters by RiskCause source

  const [selectedRiskCauseForAnalysis, setSelectedRiskCauseForAnalysis] = useState<RiskCause | null>(null);
  const [selectedParentPotentialRisk, setSelectedParentPotentialRisk] = useState<PotentialRisk | null>(null);
  const [isCauseAnalysisModalOpen, setIsCauseAnalysisModalOpen] = useState(false);
  
  const { toast } = useToast();

  const loadData = useCallback(() => {
    if (typeof window !== 'undefined' && currentUprId && currentPeriod) {
      setIsLoading(true);
      
      const goalsStorageKey = getGoalsStorageKey(currentUprId, currentPeriod);
      const storedGoalsData = localStorage.getItem(goalsStorageKey);
      const loadedGoals: Goal[] = storedGoalsData ? JSON.parse(storedGoalsData) : [];
      setAllGoals(loadedGoals);

      let collectedPotentialRisks: PotentialRisk[] = [];
      let collectedEnrichedRiskCauses: EnrichedRiskCause[] = [];

      loadedGoals.forEach(goal => {
        const potentialRisksStorageKey = getPotentialRisksStorageKey(goal.uprId, goal.period, goal.id);
        const storedPotentialRisksData = localStorage.getItem(potentialRisksStorageKey);
        if (storedPotentialRisksData) {
          const goalPotentialRisks: PotentialRisk[] = JSON.parse(storedPotentialRisksData);
          collectedPotentialRisks = [...collectedPotentialRisks, ...goalPotentialRisks];
          
          goalPotentialRisks.forEach(pRisk => {
            const causesStorageKey = getRiskCausesStorageKey(goal.uprId, goal.period, pRisk.id);
            const storedCausesData = localStorage.getItem(causesStorageKey);
            if (storedCausesData) {
              const pRiskCauses: RiskCause[] = JSON.parse(storedCausesData);
              const enrichedCauses = pRiskCauses.map(cause => ({
                ...cause,
                potentialRiskDescription: pRisk.description,
                potentialRiskCategory: pRisk.category,
                potentialRiskOwner: pRisk.owner,
                goalName: goal.name,
                goalUprId: goal.uprId,
                goalPeriod: goal.period,
                parentPotentialRiskId: pRisk.id,
                parentPotentialRiskObject: pRisk,
              }));
              collectedEnrichedRiskCauses = [...collectedEnrichedRiskCauses, ...enrichedCauses];
            }
          });
        }
      });
      setAllPotentialRisks(collectedPotentialRisks); // Keep this for context if needed
      setAllEnrichedRiskCauses(collectedEnrichedRiskCauses.sort((a, b) => a.description.localeCompare(b.description)));
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

  const handleOpenCauseAnalysisModal = (cause: EnrichedRiskCause) => {
    setSelectedRiskCauseForAnalysis(cause);
    const parentPRisk = allPotentialRisks.find(pr => pr.id === cause.parentPotentialRiskId);
    setSelectedParentPotentialRisk(parentPRisk || null);
    setIsCauseAnalysisModalOpen(true);
  };

  const handleRiskCauseUpdated = (updatedRiskCause: RiskCause) => {
    setAllEnrichedRiskCauses(prevCauses => 
      prevCauses.map(cause => 
        cause.id === updatedRiskCause.id ? { ...cause, ...updatedRiskCause } : cause
      )
    );
    // localStorage is updated within RiskCauseAnalysisModal or ManagePotentialRiskPage
    setIsCauseAnalysisModalOpen(false);
    setSelectedRiskCauseForAnalysis(null);
  };

  const toggleExpandCause = (causeId: string) => {
    setExpandedCauseId(currentId => (currentId === causeId ? null : causeId));
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
  
  const toggleSourceFilter = (source: RiskSource) => {
    setSelectedSources(prev =>
        prev.includes(source)
        ? prev.filter(s => s !== source)
        : [...prev, source]
    );
  };

  const filteredAndSortedCauses = useMemo(() => {
    let tempCauses = [...allEnrichedRiskCauses];

    if (searchTerm) {
      tempCauses = tempCauses.filter(cause => 
        cause.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cause.keyRiskIndicator && cause.keyRiskIndicator.toLowerCase().includes(searchTerm.toLowerCase())) ||
        cause.potentialRiskDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cause.goalName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategories.length > 0) {
      tempCauses = tempCauses.filter(cause =>
        cause.potentialRiskCategory && selectedCategories.includes(cause.potentialRiskCategory)
      );
    }
    
    if (selectedGoalIds.length > 0) {
      tempCauses = tempCauses.filter(cause => {
         const parentPRisk = allPotentialRisks.find(pr => pr.id === cause.parentPotentialRiskId);
         return parentPRisk && selectedGoalIds.includes(parentPRisk.goalId);
      });
    }

    if (selectedSources.length > 0) {
        tempCauses = tempCauses.filter(cause => selectedSources.includes(cause.source));
    }

    return tempCauses.sort((a, b) => a.description.localeCompare(b.description));
  }, [allEnrichedRiskCauses, searchTerm, selectedCategories, selectedGoalIds, selectedSources, allPotentialRisks]);


  if (isLoading || !currentUprId || !currentPeriod) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat data analisis risiko...</p>
      </div>
    );
  }

  const relevantGoalsForFilter = allGoals.filter(g => g.uprId === currentUprId && g.period === currentPeriod);
  const totalTableColumns = 11; // Expand, Desk Penyebab, Sumber, KRI, Toleransi, Prob, Damp, Level, Potensi Risiko, Kategori PR, Sasaran, Aksi

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Analisis Penyebab Risiko`}
        description={`Lakukan analisis KRI, Toleransi, Probabilitas, dan Dampak untuk setiap penyebab risiko di UPR: ${currentUprId}, Periode: ${currentPeriod}.`}
      />

      <div className="flex flex-col md:flex-row gap-2 mb-4">
        <div className="relative flex-grow md:flex-grow-0 md:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari penyebab, KRI, potensi risiko..."
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
                Filter Kategori (Potensi Risiko) {selectedCategories.length > 0 ? `(${selectedCategories.length})` : ''}
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
                Filter Sasaran {selectedGoalIds.length > 0 ? `(${selectedGoalIds.length})` : ''}
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
                      {goal.name}
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
                Filter Sumber Penyebab {selectedSources.length > 0 ? `(${selectedSources.length})` : ''}
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
        </div>
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
              ? "Identifikasi potensi risiko dan penyebabnya terlebih dahulu."
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
                  <TableHead className="min-w-[200px]">Deskripsi Penyebab</TableHead>
                  <TableHead className="min-w-[100px]">Sumber</TableHead>
                  <TableHead className="min-w-[150px]">KRI</TableHead>
                  <TableHead className="min-w-[150px]">Toleransi Risiko</TableHead>
                  <TableHead className="min-w-[120px]">Probabilitas</TableHead>
                  <TableHead className="min-w-[120px]">Dampak</TableHead>
                  <TableHead className="min-w-[120px]">Tingkat Risiko</TableHead>
                  <TableHead className="min-w-[200px]">Potensi Risiko Terkait</TableHead>
                  <TableHead className="min-w-[150px]">Kategori Potensi Risiko</TableHead>
                  <TableHead className="min-w-[180px]">Sasaran Terkait</TableHead>
                  <TableHead className="text-right w-[150px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedCauses.map((cause) => {
                  const isExpanded = expandedCauseId === cause.id;
                  const causeRiskLevel = getRiskLevel(cause.likelihood, cause.impact);
                  return (
                    <Fragment key={cause.id}>
                      <TableRow>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => toggleExpandCause(cause.id)} aria-label={isExpanded ? "Sembunyikan detail" : "Tampilkan detail"}>
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium text-xs max-w-[200px] truncate" title={cause.description}>{cause.description}</TableCell>
                        <TableCell className="text-xs"><Badge variant="outline">{cause.source}</Badge></TableCell>
                        <TableCell className="text-xs max-w-[150px] truncate" title={cause.keyRiskIndicator || ''}>{cause.keyRiskIndicator || '-'}</TableCell>
                        <TableCell className="text-xs max-w-[150px] truncate" title={cause.riskTolerance || ''}>{cause.riskTolerance || '-'}</TableCell>
                        <TableCell><Badge variant={cause.likelihood ? "outline" : "ghost"} className={`text-xs ${!cause.likelihood ? "text-muted-foreground" : ""}`}>{cause.likelihood || 'N/A'}</Badge></TableCell>
                        <TableCell><Badge variant={cause.impact ? "outline" : "ghost"} className={`text-xs ${!cause.impact ? "text-muted-foreground" : ""}`}>{cause.impact || 'N/A'}</Badge></TableCell>
                        <TableCell><Badge className={`${getRiskLevelColor(causeRiskLevel)} text-xs`}>{causeRiskLevel}</Badge></TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate" title={cause.potentialRiskDescription}>{cause.potentialRiskDescription}</TableCell>
                        <TableCell className="text-xs max-w-[150px] truncate" title={cause.potentialRiskCategory || ''}><Badge variant={cause.potentialRiskCategory ? "secondary" : "outline"}>{cause.potentialRiskCategory || 'N/A'}</Badge></TableCell>
                        <TableCell className="text-xs max-w-[180px] truncate text-muted-foreground" title={cause.goalName}>{cause.goalName}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => handleOpenCauseAnalysisModal(cause)}>
                            <BarChart3 className="mr-2 h-4 w-4" /> Analisis Detail
                          </Button>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow className="bg-muted/30 hover:bg-muted/40">
                           <TableCell /> 
                          <TableCell colSpan={totalTableColumns -1} className="p-0">
                            <div className="p-3 space-y-2 text-xs">
                              <div><span className="font-semibold">Deskripsi Penyebab Lengkap:</span> <p className="text-muted-foreground whitespace-pre-wrap mt-0.5">{cause.description}</p></div>
                              {cause.keyRiskIndicator && <div><span className="font-semibold">Key Risk Indicator (KRI):</span> <p className="text-muted-foreground whitespace-pre-wrap mt-0.5">{cause.keyRiskIndicator}</p></div>}
                              {cause.riskTolerance && <div><span className="font-semibold">Toleransi Risiko:</span> <p className="text-muted-foreground whitespace-pre-wrap mt-0.5">{cause.riskTolerance}</p></div>}
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

      {selectedRiskCauseForAnalysis && selectedParentPotentialRisk && (
        <RiskCauseAnalysisModal
            riskCause={selectedRiskCauseForAnalysis}
            potentialRisk={selectedParentPotentialRisk} // Pass the parent PotentialRisk object
            goalUprId={selectedRiskCauseForAnalysis.goalUprId} // UPR ID from enriched cause
            goalPeriod={selectedRiskCauseForAnalysis.goalPeriod} // Period from enriched cause
            isOpen={isCauseAnalysisModalOpen}
            onOpenChange={(open) => {
                setIsCauseAnalysisModalOpen(open);
                if(!open) setSelectedRiskCauseForAnalysis(null);
            }}
            onSave={handleRiskCauseUpdated}
        />
      )}
    </div>
  );
}

    