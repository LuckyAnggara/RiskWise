
"use client";

import React, { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, BarChart3, Settings2, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import type { Goal, PotentialRisk, RiskCause, LikelihoodLevelDesc, ImpactLevelDesc, RiskCategory, CalculatedRiskLevelCategory } from '@/lib/types';
import { LIKELIHOOD_LEVELS_DESC_MAP, IMPACT_LEVELS_DESC_MAP } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { useAppStore } from '@/stores/useAppStore';
import { RiskPriorityMatrix } from '@/components/risks/risk-priority-matrix';
import { getCalculatedRiskLevel, getRiskLevelColor } from '@/app/risk-cause-analysis/[riskCauseId]/page';

interface AnalyzedRiskCause extends RiskCause {
  potentialRiskDescription: string;
  potentialRiskCategory: RiskCategory | null;
  goalName: string;
  goalCode: string;
  potentialRiskSequenceNumber: number;
  riskScore: number | null;
  riskLevelText: CalculatedRiskLevelCategory | 'N/A';
  goalId: string; 
}

type SortableRiskCauseKeys = 'riskScore' | 'likelihood' | 'impact' | 'description';

export default function RiskPriorityPage() {
  const { currentUser, appUser, loading: authLoading } = useAuth();
  const store = useAppStore();
  const {
    goals,
    potentialRisks,
    riskCauses: storeRiskCauses,
    fetchGoals,
    riskCausesLoading,
    goalsLoading,
    potentialRisksLoading,
  } = store;

  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [analyzedRiskCauses, setAnalyzedRiskCauses] = useState<AnalyzedRiskCause[]>([]);
  
  const [sortKey, setSortKey] = useState<SortableRiskCauseKeys>('riskScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedCauseId, setExpandedCauseId] = useState<string | null>(null);

  const currentUserId = useMemo(() => currentUser?.uid || null, [currentUser]);
  const currentPeriod = useMemo(() => appUser?.activePeriod || null, [appUser]);
  const uprDisplayName = useMemo(() => appUser?.displayName || 'UPR...', [appUser]);

  useEffect(() => {
    if (!authLoading && currentUserId && currentPeriod) {
      if (goals.length === 0 && !goalsLoading) {
        console.log("[RiskPriorityPage] Triggering fetchGoals from store.");
        fetchGoals(currentUserId, currentPeriod); 
      }
    }
  }, [authLoading, currentUserId, currentPeriod, fetchGoals, goals.length, goalsLoading]);
  
  useEffect(() => {
    const allStoreLoadingFlags = authLoading || goalsLoading || potentialRisksLoading || riskCausesLoading;
    setIsLoadingPage(allStoreLoadingFlags);

    if (!allStoreLoadingFlags && currentUserId && currentPeriod) {
      console.log("[RiskPriorityPage] Store data updated or loading finished. Store Risk Causes Count:", storeRiskCauses.length);
      const enriched = storeRiskCauses
        .filter(cause => cause.userId === currentUserId && cause.period === currentPeriod && cause.likelihood && cause.impact)
        .map(cause => {
          const parentPR = potentialRisks.find(pr => pr.id === cause.potentialRiskId && pr.userId === currentUserId && pr.period === currentPeriod);
          const grandParentGoal = parentPR ? goals.find(g => g.id === parentPR.goalId && g.userId === currentUserId && g.period === currentPeriod) : undefined;
          const {level, score} = getCalculatedRiskLevel(cause.likelihood, cause.impact);
          return {
            ...cause,
            potentialRiskDescription: parentPR?.description || 'N/A',
            potentialRiskCategory: parentPR?.category || null,
            potentialRiskSequenceNumber: parentPR?.sequenceNumber || 0,
            goalName: grandParentGoal?.name || 'N/A',
            goalCode: grandParentGoal?.code || '',
            goalId: grandParentGoal?.id || '',
            riskScore: score,
            riskLevelText: level,
          };
        });
      console.log("[RiskPriorityPage] Enriched causes for priority page:", enriched.length);
      setAnalyzedRiskCauses(enriched);
    } else if (!currentUserId || !currentPeriod) {
        setAnalyzedRiskCauses([]);
    }
  }, [storeRiskCauses, riskCausesLoading, potentialRisks, goals, authLoading, goalsLoading, potentialRisksLoading, currentUserId, currentPeriod]);


  const sortedRiskCauses = useMemo(() => {
    return [...analyzedRiskCauses].sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortKey === 'riskScore') {
        valA = a.riskScore ?? -1; 
        valB = b.riskScore ?? -1;
      } else if (sortKey === 'likelihood' && a.likelihood && b.likelihood) {
        valA = LIKELIHOOD_LEVELS_DESC_MAP[a.likelihood] ?? 0;
        valB = LIKELIHOOD_LEVELS_DESC_MAP[b.likelihood] ?? 0;
      } else if (sortKey === 'impact' && a.impact && b.impact) {
        valA = IMPACT_LEVELS_DESC_MAP[a.impact] ?? 0;
        valB = IMPACT_LEVELS_DESC_MAP[b.impact] ?? 0;
      } else if (sortKey === 'description') {
        valA = a.description;
        valB = b.description;
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
      setSortOrder('desc'); 
    }
  };

  const SortIndicator = ({ columnKey }: { columnKey: SortableRiskCauseKeys }) => {
    if (sortKey !== columnKey) return null;
    return sortOrder === 'asc' ? <ChevronUp className="h-4 w-4 ml-1 inline-block" /> : <ChevronDown className="h-4 w-4 ml-1 inline-block" />;
  };

  const toggleExpandCause = (causeId: string) => {
    setExpandedCauseId(currentId => (currentId === causeId ? null : causeId));
  };

  if (isLoadingPage) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat data prioritas risiko...</p>
      </div>
    );
  }
  
  if (!currentUser || !currentUserId || !currentPeriod) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <ShieldCheck className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-xl text-muted-foreground">Silakan login dan pastikan UPR serta Periode aktif telah diatur.</p>
         <Link href="/settings">
            <Button variant="outline" className="mt-4">Ke Pengaturan</Button>
        </Link>
      </div>
    );
  }

  const numberOfColumns = 7; // Expand Icon, Kode, Penyebab, Tingkat, Kemungkinan, Dampak, Aksi

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prioritas Risiko"
        description={`Visualisasi dan daftar penyebab risiko yang telah dianalisis untuk UPR: ${uprDisplayName}, Periode: ${currentPeriod}.`}
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
                    <TableHead className="w-[40px] text-center"></TableHead> {/* For expand button */}
                    <TableHead className="min-w-[120px]">Kode</TableHead>
                    <TableHead className="min-w-[300px] max-w-md cursor-pointer hover:bg-muted/50" onClick={() => handleSort('description')}>
                      <div className="flex items-center">Penyebab Risiko <SortIndicator columnKey="description" /></div>
                    </TableHead>
                    <TableHead className="min-w-[150px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('riskScore')}>
                       <div className="flex items-center">Tingkat Risiko <SortIndicator columnKey="riskScore" /></div>
                    </TableHead>
                    <TableHead className="min-w-[180px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('likelihood')}>
                       <div className="flex items-center">Kemungkinan <SortIndicator columnKey="likelihood" /></div>
                    </TableHead>
                    <TableHead className="min-w-[180px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('impact')}>
                       <div className="flex items-center">Dampak <SortIndicator columnKey="impact" /></div>
                    </TableHead>
                    <TableHead className="text-right w-[120px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRiskCauses.map((cause) => {
                    const causeCode = `${cause.goalCode || '[S?]'}.PR${cause.potentialRiskSequenceNumber || '?'}.PC${cause.sequenceNumber || '?'}`;
                    const returnPath = `/risk-priority`;
                    const isExpanded = expandedCauseId === cause.id;
                    return (
                      <Fragment key={cause.id}>
                        <TableRow>
                          <TableCell className="text-center">
                            <Button variant="ghost" size="icon" onClick={() => toggleExpandCause(cause.id)} className="h-8 w-8">
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{causeCode}</TableCell>
                          <TableCell className="font-medium text-xs max-w-md truncate" title={cause.description}>
                            {cause.description}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getRiskLevelColor(cause.riskLevelText)} text-xs`}>
                              {cause.riskLevelText === 'N/A' ? 'N/A' : `${cause.riskLevelText} (${cause.riskScore ?? 'N/A'})`}
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
                          <TableCell className="text-right">
                             <Link href={`/risk-cause-analysis/${cause.id}?from=${encodeURIComponent(returnPath)}`}>
                              <Button variant="outline" size="sm" className="text-xs">
                                <BarChart3 className="mr-1 h-3 w-3" /> Analisis/Kontrol
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow className="bg-muted/10 hover:bg-muted/20">
                            <TableCell colSpan={numberOfColumns} className="p-3">
                              <div className="pl-10 space-y-1 text-xs">
                                <p><strong>Potensi Risiko Induk:</strong> (PR{cause.potentialRiskSequenceNumber || '?'}) {cause.potentialRiskDescription} {cause.potentialRiskCategory && <Badge variant="secondary" className="ml-1 text-[10px]">{cause.potentialRiskCategory}</Badge>}</p>
                                <p><strong>Sasaran Induk:</strong> ({cause.goalCode || '[S?]'}) {cause.goalName}</p>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}

