
"use client"; 

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, ShieldCheck, Target, TrendingUp, Activity, Loader2 } from 'lucide-react';
import type { PotentialRisk, Goal, Control, LikelihoodImpactLevel } from '@/lib/types';
// BarChart components are removed as the chart is removed
import { getCurrentUprId, getCurrentPeriod, initializeAppContext } from '@/lib/upr-period-context';

const getGoalsStorageKey = (uprId: string, period: string) => `riskwise-upr${uprId}-period${period}-goals`;
const getPotentialRisksStorageKey = (uprId: string, period: string, goalId: string) => `riskwise-upr${uprId}-period${period}-goal${goalId}-potentialRisks`;
const getControlsStorageKey = (uprId: string, period: string, potentialRiskId: string) => `riskwise-upr${uprId}-period${period}-potentialRisk${potentialRiskId}-controls`;

const MOCK_GOALS_TEMPLATE: Omit<Goal, 'uprId' | 'period'>[] = [
  { id: 'g1', code: 'P1', name: 'Luncurkan Produk Baru (Mock)', description: 'Berhasil diluncurkan pada Q4', createdAt: new Date().toISOString() },
  { id: 'g2', code: 'M1', name: 'Perluas Pangsa Pasar (Mock)', description: 'Tingkatkan pangsa pasar sebesar 5%', createdAt: new Date().toISOString() },
];

// Removed likelihood and impact from MOCK_POTENTIAL_RISKS_TEMPLATE
const MOCK_POTENTIAL_RISKS_TEMPLATE: Omit<PotentialRisk, 'goalId' | 'sequenceNumber'>[] = [ 
  { id: 'pr1', description: 'Gangguan rantai pasok (Mock)', category: 'Operasional', owner: 'Kepala Rantai Pasok', identifiedAt: new Date().toISOString() },
  { id: 'pr2', description: 'Pesaing meluncurkan produk serupa (Mock)', category: 'Strategis', owner: 'Tim Produk', identifiedAt: new Date().toISOString() },
  { id: 'pr3', description: 'Perubahan regulasi (Mock)', category: 'Kepatuhan', owner: 'Departemen Legal', identifiedAt: new Date().toISOString() },
  { id: 'pr4', description: 'Kepergian anggota tim kunci (Mock)', category: 'Hukum', owner: 'Manajer SDM', identifiedAt: new Date().toISOString()}, // Example using 'Hukum'
  { id: 'pr5', description: 'Penurunan ekonomi mempengaruhi permintaan (Mock)', category: 'Keuangan', owner: 'CFO', identifiedAt: new Date().toISOString()},
];

const MOCK_CONTROLS_TEMPLATE: Omit<Control, 'potentialRiskId'>[] = [ 
  { id: 'c1', description: 'Diversifikasi pemasok (Mock)', effectiveness: 'Medium', status: 'In Progress', createdAt: new Date().toISOString() },
  { id: 'c2', description: 'Percepat kampanye pemasaran (Mock)', effectiveness: 'High', status: 'Implemented', createdAt: new Date().toISOString() },
];

// getRiskLevel and getRiskLevelColor functions are removed as they are no longer needed for PotentialRisk here

export default function DashboardPage() {
  const [currentUprId, setCurrentUprId] = useState('');
  const [currentPeriod, setCurrentPeriod] = useState('');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [potentialRisks, setPotentialRisks] = useState<PotentialRisk[]>([]);
  const [controls, setControls] = useState<Control[]>([]);
  // riskLevelChartData and its state are removed
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const context = initializeAppContext();
      const uprId = context.uprId;
      const period = context.period;
      setCurrentUprId(uprId);
      setCurrentPeriod(period);

      const goalsStorageKey = getGoalsStorageKey(uprId, period);
      let loadedGoalsData = localStorage.getItem(goalsStorageKey);
      let loadedGoals: Goal[];

      if (loadedGoalsData) {
        loadedGoals = JSON.parse(loadedGoalsData);
      } else {
        loadedGoals = MOCK_GOALS_TEMPLATE.map(g => ({...g, uprId: uprId, period: period}));
        if (MOCK_GOALS_TEMPLATE.length > 0) {
            localStorage.setItem(goalsStorageKey, JSON.stringify(loadedGoals));
        }
      }
      setGoals(loadedGoals);
      
      let allPRisks: PotentialRisk[] = [];
      let allControls: Control[] = [];

      loadedGoals.forEach((goal, goalIndex) => {
        const pRisksStorageKey = getPotentialRisksStorageKey(goal.uprId, goal.period, goal.id);
        let goalPRisksData = localStorage.getItem(pRisksStorageKey);
        let goalPRisks: PotentialRisk[] = [];

        if (goalPRisksData) {
          goalPRisks = JSON.parse(goalPRisksData);
        } else if (MOCK_POTENTIAL_RISKS_TEMPLATE.length > 0 && goalIndex < MOCK_POTENTIAL_RISKS_TEMPLATE.length) {
            const mockRiskTemplate = MOCK_POTENTIAL_RISKS_TEMPLATE[goalIndex % MOCK_POTENTIAL_RISKS_TEMPLATE.length];
            goalPRisks = [ { 
                ...mockRiskTemplate, 
                goalId: goal.id, 
                id: `mpr-${goal.id}-${goalIndex}`,
                sequenceNumber: (goalIndex % MOCK_POTENTIAL_RISKS_TEMPLATE.length) + 1 
            } ];
            localStorage.setItem(pRisksStorageKey, JSON.stringify(goalPRisks));
        }
        
        allPRisks = [...allPRisks, ...goalPRisks];

        goalPRisks.forEach((pRisk, pRiskIndex) => {
          const controlsStorageKey = getControlsStorageKey(goal.uprId, goal.period, pRisk.id);
          let pRiskControlsData = localStorage.getItem(controlsStorageKey);
          let pRiskControls: Control[] = [];

          if (pRiskControlsData) {
            pRiskControls = JSON.parse(pRiskControlsData);
          } else if (MOCK_CONTROLS_TEMPLATE.length > 0 && pRiskIndex < MOCK_CONTROLS_TEMPLATE.length) {
            pRiskControls = [ { ...MOCK_CONTROLS_TEMPLATE[pRiskIndex % MOCK_CONTROLS_TEMPLATE.length], potentialRiskId: pRisk.id, id: `mc-${pRisk.id}-${pRiskIndex}` } ];
            localStorage.setItem(controlsStorageKey, JSON.stringify(pRiskControls));
          }
          allControls = [...allControls, ...pRiskControls];
        });
      });
      setPotentialRisks(allPRisks);
      setControls(allControls);
      setIsLoading(false);
    }
  }, []);
  
  if (isLoading || !currentUprId || !currentPeriod) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat data dasbor...</p>
      </div>
    );
  }

  // highPriorityPotentialRisks and criticalPotentialRisksNum are removed as they relied on inherent risk levels
  
  const totalPotentialRisksCount = potentialRisks.length;
  const controlsImplementedCount = controls.filter(c => c.status === 'Implemented').length;

  return (
    <div className="space-y-6">
      <PageHeader title="Dasbor Risiko" description={`Ringkasan lanskap risiko Anda saat ini untuk UPR: ${currentUprId}, Periode: ${currentPeriod}.`} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sasaran</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{goals.length}</div>
            <p className="text-xs text-muted-foreground">Sasaran yang dilacak untuk UPR/Periode ini</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Potensi Risiko</CardTitle> 
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPotentialRisksCount}</div>
            {/* Removed count of critical risks as inherent levels are gone */}
            <p className="text-xs text-muted-foreground">Jumlah potensi risiko teridentifikasi.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kontrol Diterapkan</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{controlsImplementedCount}</div>
            <p className="text-xs text-muted-foreground">Dari {controls.length} total kontrol</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tren Risiko Keseluruhan</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              Stabil <TrendingUp className="ml-2 h-5 w-5 text-green-500" />
            </div>
            <p className="text-xs text-muted-foreground">Berdasarkan 30 hari terakhir (data tiruan)</p>
          </CardContent>
        </Card>
      </div>

      {/* Removed Risk Distribution Chart and High Priority Risks Table as they relied on inherent risk levels of PotentialRisk */}
      <div className="grid gap-4 md:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Informasi Tambahan</CardTitle>
            <CardDescription>Analisis risiko detail sekarang dilakukan pada tingkat penyebab risiko.</CardDescription>
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
