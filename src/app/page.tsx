
"use client"; 

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, ShieldCheck, Target, TrendingUp, Activity, Loader2 } from 'lucide-react';
import type { Risk, Goal, Control, LikelihoodImpactLevel } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { getCurrentUprId, getCurrentPeriod, initializeAppContext } from '@/lib/upr-period-context';

const getGoalsStorageKey = (uprId: string, period: string) => `riskwise-upr${uprId}-period${period}-goals`;
const getRisksStorageKey = (uprId: string, period: string, goalId: string) => `riskwise-upr${uprId}-period${period}-goal${goalId}-risks`;
const getControlsStorageKey = (uprId: string, period: string, riskId: string) => `riskwise-upr${uprId}-period${period}-risk${riskId}-controls`;

// Mock data templates - will be filtered/tagged with current UPR/Period if localStorage is empty
const MOCK_GOALS_TEMPLATE: Omit<Goal, 'uprId' | 'period'>[] = [
  { id: 'g1', name: 'Launch New Product (Mock)', description: 'Successfully launch by Q4', createdAt: new Date().toISOString() },
  { id: 'g2', name: 'Expand Market Share (Mock)', description: 'Increase market share by 5%', createdAt: new Date().toISOString() },
];

const MOCK_RISKS_TEMPLATE: Omit<Risk, 'goalId'>[] = [ 
  { id: 'r1', description: 'Supply chain disruption (Mock)', likelihood: 'High', impact: 'Very High', identifiedAt: new Date().toISOString() },
  { id: 'r2', description: 'Competitor launches similar product (Mock)', likelihood: 'Medium', impact: 'High', identifiedAt: new Date().toISOString() },
  { id: 'r3', description: 'Regulatory changes (Mock)', likelihood: 'Low', impact: 'Medium', identifiedAt: new Date().toISOString() },
  { id: 'r4', description: 'Key team member departure (Mock)', likelihood: 'Medium', impact: 'High', identifiedAt: new Date().toISOString()},
  { id: 'r5', description: 'Economic downturn affecting demand (Mock)', likelihood: 'High', impact: 'High', identifiedAt: new Date().toISOString()},
];

const MOCK_CONTROLS_TEMPLATE: Omit<Control, 'riskId'>[] = [ 
  { id: 'c1', description: 'Diversify suppliers (Mock)', effectiveness: 'Medium', status: 'In Progress', createdAt: new Date().toISOString() },
  { id: 'c2', description: 'Accelerate marketing campaign (Mock)', effectiveness: 'High', status: 'Implemented', createdAt: new Date().toISOString() },
];


const getRiskLevel = (likelihood: LikelihoodImpactLevel | null, impact: LikelihoodImpactLevel | null): string => {
  if (!likelihood || !impact) return 'N/A';
  const L = { 'Very Low': 1, 'Low': 2, 'Medium': 3, 'High': 4, 'Very High': 5 };
  const I = { 'Very Low': 1, 'Low': 2, 'Medium': 3, 'High': 4, 'Very High': 5 };
  const score = L[likelihood] * I[impact];

  if (score >= 15) return 'Critical'; 
  if (score >= 10) return 'High';
  if (score >= 5) return 'Medium';
  if (score >=3) return 'Low';
  return 'Very Low';
};

const chartConfig = {
  count: {
    label: "Risks",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export default function DashboardPage() {
  const [currentUprId, setCurrentUprId] = useState('');
  const [currentPeriod, setCurrentPeriod] = useState('');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
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
        // Initialize with mock data if no goals exist for this UPR/Period
        loadedGoals = MOCK_GOALS_TEMPLATE.map(g => ({...g, uprId: uprId, period: period}));
        if (MOCK_GOALS_TEMPLATE.length > 0) {
            localStorage.setItem(goalsStorageKey, JSON.stringify(loadedGoals));
        }
      }
      setGoals(loadedGoals);
      
      let allRisks: Risk[] = [];
      let allControls: Control[] = [];

      loadedGoals.forEach((goal, goalIndex) => {
        const risksStorageKey = getRisksStorageKey(goal.uprId, goal.period, goal.id);
        let goalRisksData = localStorage.getItem(risksStorageKey);
        let goalRisks: Risk[] = [];

        if (goalRisksData) {
          goalRisks = JSON.parse(goalRisksData);
        } else if (MOCK_RISKS_TEMPLATE.length > 0 && goalIndex < MOCK_RISKS_TEMPLATE.length) {
            // Assign some mock risks if none exist for this goal in this UPR/Period
            goalRisks = [ { ...MOCK_RISKS_TEMPLATE[goalIndex % MOCK_RISKS_TEMPLATE.length], goalId: goal.id, id: `mr-${goal.id}-${goalIndex}` } ];
            localStorage.setItem(risksStorageKey, JSON.stringify(goalRisks));
        }
        
        allRisks = [...allRisks, ...goalRisks];

        goalRisks.forEach((risk, riskIndex) => {
          const controlsStorageKey = getControlsStorageKey(goal.uprId, goal.period, risk.id);
          let riskControlsData = localStorage.getItem(controlsStorageKey);
          let riskControls: Control[] = [];

          if (riskControlsData) {
            riskControls = JSON.parse(riskControlsData);
          } else if (MOCK_CONTROLS_TEMPLATE.length > 0 && riskIndex < MOCK_CONTROLS_TEMPLATE.length) {
            riskControls = [ { ...MOCK_CONTROLS_TEMPLATE[riskIndex % MOCK_CONTROLS_TEMPLATE.length], riskId: risk.id, id: `mc-${risk.id}-${riskIndex}` } ];
            localStorage.setItem(controlsStorageKey, JSON.stringify(riskControls));
          }
          allControls = [...allControls, ...riskControls];
        });
      });
      setRisks(allRisks);
      setControls(allControls);

      const chartData = allRisks.reduce((acc, risk) => {
        const level = getRiskLevel(risk.likelihood, risk.impact);
        const existing = acc.find(item => item.name === level);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ name: level, count: 1 });
        }
        return acc;
      }, [] as { name: string; count: number }[]).sort((a,b) => {
        const order = ['Very Low', 'Low', 'Medium', 'High', 'Critical', 'N/A'];
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
        <p className="text-xl text-muted-foreground">Loading dashboard data...</p>
      </div>
    );
  }

  const highPriorityRisks = risks
    .filter(risk => {
        const level = getRiskLevel(risk.likelihood, risk.impact);
        return level === 'Critical' || level === 'High';
    })
    .slice(0, 5);
  
  const totalRisks = risks.length;
  const criticalRisksCount = risks.filter(r => getRiskLevel(r.likelihood, r.impact) === 'Critical').length;
  const controlsImplemented = controls.filter(c => c.status === 'Implemented').length;

  return (
    <div className="space-y-6">
      <PageHeader title={`Risk Dashboard`} description={`Overview of your current risk landscape for UPR: ${currentUprId}, Period: ${currentPeriod}.`} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Goals</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{goals.length}</div>
            <p className="text-xs text-muted-foreground">Tracked objectives for this UPR/Period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Risks</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRisks}</div>
            <p className="text-xs text-muted-foreground">{criticalRisksCount} critical risks</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Controls Implemented</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{controlsImplemented}</div>
            <p className="text-xs text-muted-foreground">Out of {controls.length} total controls</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Risk Trend</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              Stable <TrendingUp className="ml-2 h-5 w-5 text-green-500" />
            </div>
            <p className="text-xs text-muted-foreground">Based on last 30 days (mocked)</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Risk Distribution by Level</CardTitle>
            <CardDescription>Number of risks in each calculated level for this UPR/Period.</CardDescription>
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
              <p className="text-muted-foreground text-center py-10">No risk data available for chart.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>High Priority Risks</CardTitle>
            <CardDescription>Top 5 critical or high-level risks requiring attention for this UPR/Period.</CardDescription>
          </CardHeader>
          <CardContent>
            {highPriorityRisks.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Goal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {highPriorityRisks.map((risk) => {
                    const goal = goals.find(g => g.id === risk.goalId);
                    const level = getRiskLevel(risk.likelihood, risk.impact);
                    return (
                      <TableRow key={risk.id}>
                        <TableCell className="font-medium max-w-xs truncate" title={risk.description}>{risk.description}</TableCell>
                        <TableCell>
                          <Badge variant={
                            level === 'Critical' ? 'destructive' :
                            level === 'High' ? 'destructive' : 
                            level === 'Medium' ? 'secondary' : 
                            'outline'
                          }
                          className={level === 'Medium' ? 'bg-yellow-500 text-black dark:bg-yellow-400 dark:text-black' : 
                                     level === 'Very Low' ? 'bg-sky-500 text-white dark:bg-sky-600' :
                                     level === 'Low' ? 'bg-green-500 text-white dark:bg-green-600' : ''}
                          >
                            {level}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground truncate" title={goal?.name}>{goal?.name || 'N/A'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-10">No high priority risks identified.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
