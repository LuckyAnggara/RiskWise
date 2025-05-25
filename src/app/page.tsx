
"use client"; 

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, ShieldCheck, Target, TrendingUp, Activity, Loader2 } from 'lucide-react';
import type { PotentialRisk, Goal, Control, LikelihoodImpactLevel } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { getCurrentUprId, getCurrentPeriod, initializeAppContext } from '@/lib/upr-period-context';

const getGoalsStorageKey = (uprId: string, period: string) => `riskwise-upr${uprId}-period${period}-goals`;
const getPotentialRisksStorageKey = (uprId: string, period: string, goalId: string) => `riskwise-upr${uprId}-period${period}-goal${goalId}-potentialRisks`;
const getControlsStorageKey = (uprId: string, period: string, potentialRiskId: string) => `riskwise-upr${uprId}-period${period}-potentialRisk${potentialRiskId}-controls`;

const MOCK_GOALS_TEMPLATE: Omit<Goal, 'uprId' | 'period'>[] = [
  { id: 'g1', code: 'P1', name: 'Luncurkan Produk Baru (Mock)', description: 'Berhasil diluncurkan pada Q4', createdAt: new Date().toISOString() },
  { id: 'g2', code: 'M1', name: 'Perluas Pangsa Pasar (Mock)', description: 'Tingkatkan pangsa pasar sebesar 5%', createdAt: new Date().toISOString() },
];

const MOCK_POTENTIAL_RISKS_TEMPLATE: Omit<PotentialRisk, 'goalId' | 'sequenceNumber'>[] = [ 
  { id: 'pr1', description: 'Gangguan rantai pasok (Mock)', category: 'Operasional', owner: 'Kepala Rantai Pasok', likelihood: 'Tinggi', impact: 'Sangat Tinggi', identifiedAt: new Date().toISOString() },
  { id: 'pr2', description: 'Pesaing meluncurkan produk serupa (Mock)', category: 'Strategis', owner: 'Tim Produk', likelihood: 'Sedang', impact: 'Tinggi', identifiedAt: new Date().toISOString() },
  { id: 'pr3', description: 'Perubahan regulasi (Mock)', category: 'Kepatuhan', owner: 'Departemen Legal', likelihood: 'Rendah', impact: 'Sedang', identifiedAt: new Date().toISOString() },
  { id: 'pr4', description: 'Kepergian anggota tim kunci (Mock)', category: 'Sumber Daya Manusia', owner: 'Manajer SDM', likelihood: 'Sedang', impact: 'Tinggi', identifiedAt: new Date().toISOString()},
  { id: 'pr5', description: 'Penurunan ekonomi mempengaruhi permintaan (Mock)', category: 'Keuangan', owner: 'CFO', likelihood: 'Tinggi', impact: 'Tinggi', identifiedAt: new Date().toISOString()},
];

const MOCK_CONTROLS_TEMPLATE: Omit<Control, 'potentialRiskId'>[] = [ 
  { id: 'c1', description: 'Diversifikasi pemasok (Mock)', effectiveness: 'Medium', status: 'In Progress', createdAt: new Date().toISOString() },
  { id: 'c2', description: 'Percepat kampanye pemasaran (Mock)', effectiveness: 'High', status: 'Implemented', createdAt: new Date().toISOString() },
];


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

const chartConfig = {
  count: {
    label: "Potensi Risiko",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export default function DashboardPage() {
  const [currentUprId, setCurrentUprId] = useState('');
  const [currentPeriod, setCurrentPeriod] = useState('');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [potentialRisks, setPotentialRisks] = useState<PotentialRisk[]>([]);
  const [controls, setControls] = useState<Control[]>([]);
  const [riskLevelChartData, setRiskLevelChartData] = useState<{name: string; count: number}[]>([]);
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
            // Assign sequenceNumber when creating mock potential risks
            const mockRiskTemplate = MOCK_POTENTIAL_RISKS_TEMPLATE[goalIndex % MOCK_POTENTIAL_RISKS_TEMPLATE.length];
            goalPRisks = [ { 
                ...mockRiskTemplate, 
                goalId: goal.id, 
                id: `mpr-${goal.id}-${goalIndex}`,
                sequenceNumber: (goalIndex % MOCK_POTENTIAL_RISKS_TEMPLATE.length) + 1 // Simple sequence
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

      const chartData = allPRisks.reduce((acc, pRisk) => {
        const level = getRiskLevel(pRisk.likelihood, pRisk.impact);
        const existing = acc.find(item => item.name === level);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ name: level, count: 1 });
        }
        return acc;
      }, [] as { name: string; count: number }[]).sort((a,b) => {
        const order = ['Sangat Rendah', 'Rendah', 'Sedang', 'Tinggi', 'Sangat Tinggi', 'N/A'];
        return order.indexOf(a.name) - order.indexOf(b.name);
      });
      setRiskLevelChartData(chartData);
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

  const highPriorityPotentialRisks = potentialRisks
    .filter(pRisk => {
        const level = getRiskLevel(pRisk.likelihood, pRisk.impact);
        return level === 'Sangat Tinggi' || level === 'Tinggi';
    })
    .slice(0, 5);
  
  const totalPotentialRisksCount = potentialRisks.length;
  const criticalPotentialRisksNum = potentialRisks.filter(pr => getRiskLevel(pr.likelihood, pr.impact) === 'Sangat Tinggi').length;
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
            <p className="text-xs text-muted-foreground">{criticalPotentialRisksNum} potensi risiko sangat tinggi</p>
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

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribusi Potensi Risiko berdasarkan Level</CardTitle>
            <CardDescription>Jumlah potensi risiko di setiap level yang dihitung untuk UPR/Periode ini.</CardDescription>
          </CardHeader>
          <CardContent>
            {riskLevelChartData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskLevelChartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
            ) : (
              <p className="text-muted-foreground text-center py-10">Tidak ada data potensi risiko yang tersedia untuk grafik.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Potensi Risiko Prioritas Tinggi</CardTitle>
            <CardDescription>5 potensi risiko teratas level sangat tinggi atau tinggi yang memerlukan perhatian untuk UPR/Periode ini.</CardDescription>
          </CardHeader>
          <CardContent>
            {highPriorityPotentialRisks.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Pemilik</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Sasaran</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {highPriorityPotentialRisks.map((pRisk) => {
                    const goal = goals.find(g => g.id === pRisk.goalId);
                    const level = getRiskLevel(pRisk.likelihood, pRisk.impact);
                    const goalCodeDisplay = (goal?.code && goal.code.trim() !== '') ? goal.code : '[Tanpa Kode]';
                    return (
                      <TableRow key={pRisk.id}>
                        <TableCell className="font-medium max-w-xs truncate" title={pRisk.description}>{pRisk.description}</TableCell>
                        <TableCell className="text-xs max-w-[100px] truncate" title={pRisk.category || ''}>
                            <Badge variant={pRisk.category ? "secondary" : "outline"}>{pRisk.category || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell className="text-xs max-w-[100px] truncate" title={pRisk.owner || ''}>{pRisk.owner || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge className={`${getRiskLevelColor(level)}`}>
                            {level}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground truncate" title={goal?.name}>
                          {goalCodeDisplay}: {goal?.name || 'N/A'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-10">Tidak ada potensi risiko prioritas tinggi yang teridentifikasi.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


    