
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, ShieldCheck, Target, Activity, Loader2, ListChecks } from 'lucide-react';
import type { Goal, PotentialRisk, RiskCause, ControlMeasure } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { getGoals } from '@/services/goalService';
import { getPotentialRisksByGoalId } from '@/services/potentialRiskService';
import { getRiskCausesByPotentialRiskId } from '@/services/riskCauseService';
import { getControlMeasuresByRiskCauseId } from '@/services/controlMeasureService';

export default function DashboardPage() {
  const { currentUser, appUser, loading: authLoading } = useAuth();

  const [goalsCount, setGoalsCount] = useState(0);
  const [potentialRisksCount, setPotentialRisksCount] = useState(0);
  const [analyzedRiskCausesCount, setAnalyzedRiskCausesCount] = useState(0);
  const [totalControlsCount, setTotalControlsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    if (!currentUser || !appUser || !appUser.uid || !appUser.activePeriod) {
      setIsLoading(false);
      setGoalsCount(0);
      setPotentialRisksCount(0);
      setAnalyzedRiskCausesCount(0);
      setTotalControlsCount(0);
      console.log("[DashboardPage] loadDashboardData: Missing user context, aborting.");
      return;
    }

    setIsLoading(true);
    console.log("[DashboardPage] loadDashboardData: Starting data fetch for user:", appUser.uid, "period:", appUser.activePeriod);

    try {
      const goalsResult = await getGoals(appUser.uid, appUser.activePeriod);
      let currentGoals: Goal[] = [];
      if (goalsResult.success && goalsResult.goals) {
        currentGoals = goalsResult.goals;
      }
      setGoalsCount(currentGoals.length);
      console.log(`[DashboardPage] Fetched ${currentGoals.length} goals.`);

      let allPotentialRisks: PotentialRisk[] = [];
      let allRiskCauses: RiskCause[] = [];
      let allControls: ControlMeasure[] = [];
      let currentAnalyzedRiskCauses = 0;

      for (const goal of currentGoals) {
        const pRisks = await getPotentialRisksByGoalId(goal.id, appUser.uid, appUser.activePeriod);
        allPotentialRisks.push(...pRisks);
        console.log(`[DashboardPage] Goal ${goal.id}: Fetched ${pRisks.length} potential risks.`);

        for (const pRisk of pRisks) {
          const causes = await getRiskCausesByPotentialRiskId(pRisk.id, appUser.uid, appUser.activePeriod);
          allRiskCauses.push(...causes);
          console.log(`[DashboardPage] PotentialRisk ${pRisk.id}: Fetched ${causes.length} risk causes.`);
          
          currentAnalyzedRiskCauses += causes.filter(c => c.likelihood && c.impact).length;

          for (const cause of causes) {
            const controls = await getControlMeasuresByRiskCauseId(cause.id, appUser.uid, appUser.activePeriod);
            allControls.push(...controls);
            // console.log(`[DashboardPage] RiskCause ${cause.id}: Fetched ${controls.length} control measures.`);
          }
        }
      }

      setPotentialRisksCount(allPotentialRisks.length);
      setAnalyzedRiskCausesCount(currentAnalyzedRiskCauses);
      setTotalControlsCount(allControls.length);

      console.log("[DashboardPage] Data aggregation complete:", {
        goals: currentGoals.length,
        potentialRisks: allPotentialRisks.length,
        analyzedRiskCauses: currentAnalyzedRiskCauses,
        controls: allControls.length,
      });

    } catch (error: any) {
      console.error("Error loading dashboard data:", error.message);
      // Optionally set error state or show toast
      setGoalsCount(0);
      setPotentialRisksCount(0);
      setAnalyzedRiskCausesCount(0);
      setTotalControlsCount(0);
    } finally {
      setIsLoading(false);
      console.log("[DashboardPage] loadDashboardData: Finished, isLoading set to false.");
    }
  }, [currentUser, appUser]);

  useEffect(() => {
    if (!authLoading && currentUser && appUser) {
      loadDashboardData();
    } else if (!authLoading && !currentUser) {
      // Pengguna tidak login, pastikan loading selesai dan data kosong
      setIsLoading(false);
      setGoalsCount(0);
      setPotentialRisksCount(0);
      setAnalyzedRiskCausesCount(0);
      setTotalControlsCount(0);
    }
  }, [authLoading, currentUser, appUser, loadDashboardData]);

  if (authLoading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">
          {authLoading ? "Memverifikasi sesi & profil..." : "Memuat data dasbor..."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dasbor Risiko"
        description={`Ringkasan lanskap risiko Anda saat ini untuk UPR: ${appUser?.displayName || '...'}, Periode: ${appUser?.activePeriod || '...'}.`}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sasaran</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{goalsCount}</div>
            <p className="text-xs text-muted-foreground">Sasaran yang dilacak untuk UPR/Periode ini</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Potensi Risiko</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{potentialRisksCount}</div>
            <p className="text-xs text-muted-foreground">Jumlah potensi risiko teridentifikasi.</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Penyebab Dianalisis</CardTitle>
            <ListChecks className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyzedRiskCausesCount}</div>
            <p className="text-xs text-muted-foreground">Penyebab risiko yang telah dinilai.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tindakan Pengendalian</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalControlsCount}</div>
            <p className="text-xs text-muted-foreground">Jumlah total rencana pengendalian.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Informasi Tambahan</CardTitle>
            <CardDescription>Analisis risiko detail dilakukan pada tingkat penyebab risiko.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Untuk melihat dan menganalisis tingkat risiko, silakan navigasi ke modul "Analisis Risiko" di mana setiap penyebab risiko dapat dinilai kemungkinan dan dampaknya.
              Modul "Identifikasi Risiko" digunakan untuk mencatat potensi risiko dan penyebab-penyebabnya.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
