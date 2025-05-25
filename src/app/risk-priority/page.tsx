
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, BarChart3, Settings2, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import type { Goal, PotentialRisk, RiskCause, LikelihoodLevelDesc, ImpactLevelDesc, RiskCategory } from '@/lib/types';
import { LIKELIHOOD_LEVELS_MAP, IMPACT_LEVELS_MAP } from '@/lib/types';
import { getCurrentUprId, getCurrentPeriod, initializeAppContext } from '@/lib/upr-period-context';
import { RiskPriorityMatrix } from '@/components/risks/risk-priority-matrix';
import { getCalculatedRiskLevel, getRiskLevelColor } from '@/app/risk-cause-analysis/[riskCauseId]/page'; // Import shared functions

const getGoalsStorageKey = (uprId: string, period: string) => `riskwise-upr${uprId}-period${period}-goals`;
const getPotentialRisksStorageKeyForGoal = (uprId: string, period: string, goalId: string) => `riskwise-upr${uprId}-period${period}-goal${goalId}-potentialRisks`;
const getRiskCausesStorageKey = (uprId: string, period: string, potentialRiskId: string) => `riskwise-upr${uprId}-period${period}-potentialRisk${potentialRiskId}-causes`;

interface AnalyzedRiskCause extends RiskCause {
  potentialRiskDescription: string;
  potentialRiskCategory: RiskCategory | null;
  goalName: string;
  goalCode: string;
  potentialRiskSequenceNumber: number;
  riskScore: number | null;
  riskLevelText: string;
}

type SortableRiskCauseKeys = 'riskScore' | 'likelihood' | 'impact' | 'description';

export default function RiskPriorityPage() {
  const [currentUprId, setCurrentUprId] = useState('');
  const [currentPeriod, setCurrentPeriod] = useState('');
  const [analyzedRiskCauses, setAnalyzedRiskCauses] = useState<AnalyzedRiskCause[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortableRiskCauseKeys>('riskScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const loadData = useCallback(() => {
    if (typeof window !== 'undefined' && currentUprId && currentPeriod) {
      setIsLoading(true);
      const goalsStorageKey = getGoalsStorageKey(currentUprId, currentPeriod);
      const storedGoalsData = localStorage.getItem(goalsStorageKey);
      const loadedGoals: Goal[] = storedGoalsData ? JSON.parse(storedGoalsData) : [];

      let collectedAnalyzedRiskCauses: AnalyzedRiskCause[] = [];

      loadedGoals.forEach(goal => {
        const potentialRisksStorageKey = getPotentialRisksStorageKeyForGoal(goal.uprId, goal.period, goal.id);
        const storedPotentialRisksData = localStorage.getItem(potentialRisksStorageKey);
        if (storedPotentialRisksData) {
          const goalPotentialRisks: PotentialRisk[] = JSON.parse(storedPotentialRisksData);
          goalPotentialRisks.forEach(pRisk => {
            const causesStorageKey = getRiskCausesStorageKey(goal.uprId, goal.period, pRisk.id);
            const storedCausesData = localStorage.getItem(causesStorageKey);
            if (storedCausesData) {
              const pRiskCauses: RiskCause[] = JSON.parse(storedCausesData);
              pRiskCauses.forEach(cause => {
                if (cause.likelihood && cause.impact) { // Only include analyzed causes
                  const { level, score } = getCalculatedRiskLevel(cause.likelihood, cause.impact);
                  collectedAnalyzedRiskCauses.push({
                    ...cause,
                    potentialRiskDescription: pRisk.description,
                    potentialRiskCategory: pRisk.category,
                    potentialRiskSequenceNumber: pRisk.sequenceNumber,
                    goalName: goal.name,
                    goalCode: goal.code || '',
                    riskScore: score,
                    riskLevelText: level,
                  });
                }
              });
            }
          });
        }
      });
      setAnalyzedRiskCauses(collectedAnalyzedRiskCauses);
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

  const sortedRiskCauses = useMemo(() => {
    return [...analyzedRiskCauses].sort((a, b) => {
      let valA: any = a[sortKey];
      let valB: any = b[sortKey];

      if (sortKey === 'riskScore') {
        valA = a.riskScore ?? -1; // Treat null/undefined scores as lowest
        valB = b.riskScore ?? -1;
      } else if (sortKey === 'likelihood' && a.likelihood && b.likelihood) {
        valA = LIKELIHOOD_LEVELS_MAP[a.likelihood] ?? 0;
        valB = LIKELIHOOD_LEVELS_MAP[b.likelihood] ?? 0;
      } else if (sortKey === 'impact' && a.impact && b.impact) {
        valA = IMPACT_LEVELS_MAP[a.impact] ?? 0;
        valB = IMPACT_LEVELS_MAP[b.impact] ?? 0;
      }


      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      return 0;
    });
  }, [analyzedRiskCauses, sortKey, sortOrder]);

  const handleSort = (key: SortableRiskCauseKeys) => {
    if (sortKey === key) {
      setSortOrder(prevOrder => (prevOrder === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder('desc'); // Default to descending for new sort key
    }
  };

  const SortIndicator = ({ columnKey }: { columnKey: SortableRiskCauseKeys }) => {
    if (sortKey !== columnKey) return null;
    return sortOrder === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat data prioritas risiko...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prioritas Risiko"
        description={`Visualisasi dan daftar penyebab risiko yang telah dianalisis untuk UPR: ${currentUprId}, Periode: ${currentPeriod}.`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Matriks Profil Risiko (Heatmap Penyebab Risiko)</CardTitle>
        </CardHeader>
        <CardContent>
          {analyzedRiskCauses.length > 0 ? (
            <RiskPriorityMatrix riskCauses={analyzedRiskCauses} />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Belum ada penyebab risiko yang dianalisis untuk ditampilkan di matriks.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Penyebab Risiko Teranalisis ({sortedRiskCauses.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sortedRiskCauses.length === 0 ? (
             <p className="text-sm text-muted-foreground text-center py-8">Tidak ada penyebab risiko yang telah dianalisis.</p>
          ) : (
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[100px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('description')}>
                      <div className="flex items-center">Penyebab Risiko <SortIndicator columnKey="description" /></div>
                    </TableHead>
                    <TableHead className="min-w-[120px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('riskScore')}>
                       <div className="flex items-center">Tingkat Risiko <SortIndicator columnKey="riskScore" /></div>
                    </TableHead>
                    <TableHead className="min-w-[150px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('likelihood')}>
                       <div className="flex items-center">Kemungkinan <SortIndicator columnKey="likelihood" /></div>
                    </TableHead>
                    <TableHead className="min-w-[150px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('impact')}>
                       <div className="flex items-center">Dampak <SortIndicator columnKey="impact" /></div>
                    </TableHead>
                    <TableHead className="min-w-[200px]">Potensi Risiko Induk</TableHead>
                    <TableHead className="min-w-[180px]">Sasaran Induk</TableHead>
                    <TableHead className="text-right w-[100px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRiskCauses.map((cause) => {
                    const causeCode = `${cause.goalCode || 'S?'}.PR${cause.potentialRiskSequenceNumber || '?'}.PC${cause.sequenceNumber || '?'}`;
                    const returnPath = `/risk-priority`;
                    return (
                      <TableRow key={cause.id}>
                        <TableCell className="font-medium text-xs max-w-xs truncate" title={cause.description}>
                          {causeCode} - {cause.description}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getRiskLevelColor(cause.riskLevelText as any)} text-xs`}>
                            {cause.riskLevelText === 'N/A' ? 'N/A' : `${cause.riskLevelText} (${cause.riskScore})`}
                          </Badge>
                        </TableCell>
                         <TableCell>
                            <Badge variant={cause.likelihood ? "outline" : "ghost"} className={`text-xs ${!cause.likelihood ? "text-muted-foreground" : ""}`}>
                                {cause.likelihood ? `${cause.likelihood}` : 'N/A'}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            <Badge variant={cause.impact ? "outline" : "ghost"} className={`text-xs ${!cause.impact ? "text-muted-foreground" : ""}`}>
                                {cause.impact ? `${cause.impact}` : 'N/A'}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-xs max-w-xs truncate" title={cause.potentialRiskDescription}>
                           PR{cause.potentialRiskSequenceNumber || '?'} - {cause.potentialRiskDescription}
                           {cause.potentialRiskCategory && <Badge variant="secondary" className="ml-1 text-[10px]">{cause.potentialRiskCategory}</Badge>}
                        </TableCell>
                        <TableCell className="text-xs max-w-sm truncate text-muted-foreground" title={cause.goalName}>
                           {cause.goalCode || '[Tanpa Kode]'} - {cause.goalName}
                        </TableCell>
                        <TableCell className="text-right">
                           <Link href={`/risk-cause-analysis/${cause.id}?from=${encodeURIComponent(returnPath)}`}>
                            <Button variant="outline" size="sm" className="text-xs">
                              <BarChart3 className="mr-1 h-3 w-3" /> Analisis/Kontrol
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    