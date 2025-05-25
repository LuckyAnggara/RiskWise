
"use client";

import React, { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Goal, PotentialRisk, RiskCause, RiskCategory, LikelihoodImpactLevel, RiskSource } from '@/lib/types';
import { RISK_CATEGORIES, LIKELIHOOD_IMPACT_LEVELS, RISK_SOURCES } from '@/lib/types';
import { Loader2, ListChecks, Search, Filter, BarChart3 } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { getCurrentUprId, getCurrentPeriod, initializeAppContext } from '@/lib/upr-period-context';
import { ScrollArea } from '@/components/ui/scroll-area';

const getGoalsStorageKey = (uprId: string, period: string) => `riskwise-upr${uprId}-period${period}-goals`;
const getPotentialRisksStorageKeyForGoal = (uprId: string, period: string, goalId: string) => `riskwise-upr${uprId}-period${period}-goal${goalId}-potentialRisks`;
const getRiskCausesStorageKey = (uprId: string, period: string, potentialRiskId: string) => `riskwise-upr${uprId}-period${period}-potentialRisk${potentialRiskId}-causes`;

interface EnrichedRiskCause extends RiskCause {
  potentialRiskDescription: string;
  potentialRiskCategory: RiskCategory | null;
  goalName: string;
  goalCode: string; 
  potentialRiskSequenceNumber: number;
  goalSequenceNumber: string; 
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
  
  const [allEnrichedRiskCauses, setAllEnrichedRiskCauses] = useState<EnrichedRiskCause[]>([]);
  const [allGoals, setAllGoals] = useState<Goal[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<RiskCategory[]>([]); 
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]); 
  const [selectedSources, setSelectedSources] = useState<RiskSource[]>([]);
  const [selectedRiskLevels, setSelectedRiskLevels] = useState<string[]>([]);


  const loadData = useCallback(() => {
    if (typeof window !== 'undefined' && currentUprId && currentPeriod) {
      setIsLoading(true);
      
      const goalsStorageKey = getGoalsStorageKey(currentUprId, currentPeriod);
      const storedGoalsData = localStorage.getItem(goalsStorageKey);
      const loadedGoals: Goal[] = storedGoalsData ? JSON.parse(storedGoalsData).sort((a:Goal, b:Goal) => {
        const codeA = a.code || '';
        const codeB = b.code || '';
        return codeA.localeCompare(codeB, undefined, {numeric: true});
      }) : [];
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
                goalName: goal.name,
                goalCode: goal.code || "", 
                potentialRiskSequenceNumber: pRisk.sequenceNumber,
                goalSequenceNumber: goal.code || "", 
              }));
              collectedEnrichedRiskCauses = [...collectedEnrichedRiskCauses, ...enrichedCauses];
            }
          });
        }
      });
      setAllEnrichedRiskCauses(collectedEnrichedRiskCauses);
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

  const handleRiskCauseUpdated = (updatedCause: RiskCause) => {
     setAllEnrichedRiskCauses(prevCauses => 
        prevCauses.map(cause => cause.id === updatedCause.id ? {
            ...cause, 
            ...updatedCause 
        } : cause)
     );
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
        tempCauses = tempCauses.filter(cause => {
          // Find the goalId associated with this cause's potential risk
          const parentPotentialRisk = allGoals.flatMap(g => {
            const prKey = getPotentialRisksStorageKeyForGoal(g.uprId, g.period, g.id);
            const prData = typeof window !== 'undefined' ? localStorage.getItem(prKey) : null;
            if (prData) {
                const potentialRisks: PotentialRisk[] = JSON.parse(prData);
                return potentialRisks.filter(pr => pr.id === cause.potentialRiskId).map(pr => ({...pr, originalGoalId: g.id}));
            }
            return [];
          }).find(pr => pr.id === cause.potentialRiskId);
          
          return parentPotentialRisk && selectedGoalIds.includes(parentPotentialRisk.originalGoalId);
        });
    }


    if (selectedSources.length > 0) {
        tempCauses = tempCauses.filter(cause => selectedSources.includes(cause.source));
    }

    if (selectedRiskLevels.length > 0) {
        tempCauses = tempCauses.filter(cause => {
            const level = getRiskLevel(cause.likelihood, cause.impact);
            return selectedRiskLevels.includes(level);
        });
    }

    return tempCauses.sort((a, b) => {
        const codeA = `${a.goalCode || ''}.PR${a.potentialRiskSequenceNumber || 0}.PC${a.sequenceNumber || 0}`;
        const codeB = `${b.goalCode || ''}.PR${b.potentialRiskSequenceNumber || 0}.PC${b.sequenceNumber || 0}`;
        return codeA.localeCompare(codeB, undefined, {numeric: true, sensitivity: 'base'});
    });
  }, [allEnrichedRiskCauses, searchTerm, selectedCategories, selectedGoalIds, selectedSources, selectedRiskLevels, allGoals, currentUprId, currentPeriod]);


  if (isLoading || !currentUprId || !currentPeriod) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat data analisis penyebab risiko...</p>
      </div>
    );
  }

  const relevantGoalsForFilter = allGoals.filter(g => g.uprId === currentUprId && g.period === currentPeriod);
  const allPossibleRiskLevels = ['Sangat Rendah', 'Rendah', 'Sedang', 'Tinggi', 'Sangat Tinggi', 'N/A'];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Analisis Detail Penyebab Risiko`}
        description={`Lakukan analisis KRI, Toleransi, Probabilitas, dan Dampak untuk setiap penyebab risiko di UPR: ${currentUprId}, Periode: ${currentPeriod}.`}
      />

      <div className="flex flex-col md:flex-row gap-2 mb-4">
        <div className="relative flex-grow md:flex-grow-0 md:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari kode, penyebab, KRI, potensi risiko..."
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
                Filter Kategori PR {selectedCategories.length > 0 ? `(${selectedCategories.length})` : ''}
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
                Filter Sumber {selectedSources.length > 0 ? `(${selectedSources.length})` : ''}
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
                Filter Level Risiko {selectedRiskLevels.length > 0 ? `(${selectedRiskLevels.length})` : ''}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuLabel>Pilih Level Risiko Penyebab</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allPossibleRiskLevels.map((level) => (
                <DropdownMenuCheckboxItem
                  key={level}
                  checked={selectedRiskLevels.includes(level)}
                  onCheckedChange={() => toggleRiskLevelFilter(level)}
                >
                  {level}
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
              ? "Identifikasi potensi risiko dan penyebabnya terlebih dahulu di menu Identifikasi Risiko."
              : "Coba sesuaikan pencarian atau filter Anda."}
          </p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Kode</TableHead>
                  <TableHead className="min-w-[200px]">Penyebab Potensi Risiko</TableHead>
                  <TableHead className="min-w-[100px]">Sumber</TableHead>
                  <TableHead className="min-w-[150px]">KRI</TableHead>
                  <TableHead className="min-w-[150px]">Toleransi</TableHead>
                  <TableHead className="min-w-[120px]">Kemungkinan</TableHead>
                  <TableHead className="min-w-[120px]">Dampak</TableHead>
                  <TableHead className="min-w-[120px]">Tingkat Risiko</TableHead>
                  <TableHead className="min-w-[200px]">Potensi Risiko</TableHead>
                  <TableHead className="min-w-[180px]">Sasaran</TableHead>
                  <TableHead className="text-right w-[150px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedCauses.map((cause) => {
                  const causeRiskLevel = getRiskLevel(cause.likelihood, cause.impact);
                  const goalCodeDisplay = (cause.goalCode && cause.goalCode.trim() !== '') ? cause.goalCode : '[Tanpa Kode]';
                  const causeCode = `${goalCodeDisplay}.PR${cause.potentialRiskSequenceNumber || 'N/A'}.PC${cause.sequenceNumber || 'N/A'}`;
                  return (
                    <Fragment key={cause.id}>
                      <TableRow>
                        <TableCell className="text-xs font-mono">{causeCode}</TableCell>
                        <TableCell className="font-medium text-xs max-w-[200px] truncate" title={cause.description}>{cause.description}</TableCell>
                        <TableCell className="text-xs"><Badge variant="outline">{cause.source}</Badge></TableCell>
                        <TableCell className="text-xs max-w-[150px] truncate" title={cause.keyRiskIndicator || ''}>{cause.keyRiskIndicator || '-'}</TableCell>
                        <TableCell className="text-xs max-w-[150px] truncate" title={cause.riskTolerance || ''}>{cause.riskTolerance || '-'}</TableCell>
                        <TableCell><Badge variant={cause.likelihood ? "outline" : "ghost"} className={`text-xs ${!cause.likelihood ? "text-muted-foreground" : ""}`}>{cause.likelihood || 'N/A'}</Badge></TableCell>
                        <TableCell><Badge variant={cause.impact ? "outline" : "ghost"} className={`text-xs ${!cause.impact ? "text-muted-foreground" : ""}`}>{cause.impact || 'N/A'}</Badge></TableCell>
                        <TableCell><Badge className={`${getRiskLevelColor(causeRiskLevel)} text-xs`}>{causeRiskLevel}</Badge></TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate" title={cause.potentialRiskDescription}>
                          PR{cause.potentialRiskSequenceNumber || 'N/A'} - {cause.potentialRiskDescription} 
                          {cause.potentialRiskCategory && <Badge variant="secondary" className="ml-1 text-[10px]">{cause.potentialRiskCategory}</Badge>}
                        </TableCell>
                        <TableCell className="text-xs max-w-[180px] truncate text-muted-foreground" title={cause.goalName}>
                           {goalCodeDisplay} - {cause.goalName}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/risk-cause-analysis/${cause.id}`}>
                            <Button variant="outline" size="sm">
                              <BarChart3 className="mr-2 h-4 w-4" /> Analisis Detail
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
    

    