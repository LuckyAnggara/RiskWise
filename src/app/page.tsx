
"use client"; // Required for charts and client-side interactions

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, ShieldCheck, Target, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import type { Risk, Goal, Control, LikelihoodImpactLevel } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

// Mock data - in a real app, this would come from a store or API
const MOCK_GOALS: Goal[] = [
  { id: 'g1', name: 'Launch New Product', description: 'Successfully launch by Q4', createdAt: new Date().toISOString() },
  { id: 'g2', name: 'Expand Market Share', description: 'Increase market share by 5%', createdAt: new Date().toISOString() },
];

const MOCK_RISKS: Risk[] = [
  { id: 'r1', goalId: 'g1', description: 'Supply chain disruption', likelihood: 'High', impact: 'Very High', identifiedAt: new Date().toISOString() },
  { id: 'r2', goalId: 'g1', description: 'Competitor launches similar product', likelihood: 'Medium', impact: 'High', identifiedAt: new Date().toISOString() },
  { id: 'r3', goalId: 'g2', description: 'Regulatory changes', likelihood: 'Low', impact: 'Medium', identifiedAt: new Date().toISOString() },
  { id: 'r4', goalId: 'g1', description: 'Key team member departure', likelihood: 'Medium', impact: 'High', identifiedAt: new Date().toISOString()},
  { id: 'r5', goalId: 'g2', description: 'Economic downturn affecting demand', likelihood: 'High', impact: 'High', identifiedAt: new Date().toISOString()},
];

const MOCK_CONTROLS: Control[] = [
  { id: 'c1', riskId: 'r1', description: 'Diversify suppliers', effectiveness: 'Medium', status: 'In Progress', createdAt: new Date().toISOString() },
  { id: 'c2', riskId: 'r2', description: 'Accelerate marketing campaign', effectiveness: 'High', status: 'Implemented', createdAt: new Date().toISOString() },
];

const getRiskLevel = (likelihood: LikelihoodImpactLevel | null, impact: LikelihoodImpactLevel | null): string => {
  if (!likelihood || !impact) return 'N/A';
  // Simplified risk scoring logic
  const L = { 'Very Low': 1, 'Low': 2, 'Medium': 3, 'High': 4, 'Very High': 5 };
  const I = { 'Very Low': 1, 'Low': 2, 'Medium': 3, 'High': 4, 'Very High': 5 };
  const score = L[likelihood] * I[impact];

  if (score >= 15) return 'Critical';
  if (score >= 10) return 'High';
  if (score >= 5) return 'Medium';
  return 'Low';
};

const riskLevelChartData = MOCK_RISKS.reduce((acc, risk) => {
  const level = getRiskLevel(risk.likelihood, risk.impact);
  const existing = acc.find(item => item.name === level);
  if (existing) {
    existing.count++;
  } else {
    acc.push({ name: level, count: 1 });
  }
  return acc;
}, [] as { name: string; count: number }[]).sort((a,b) => {
  const order = ['Low', 'Medium', 'High', 'Critical', 'N/A'];
  return order.indexOf(a.name) - order.indexOf(b.name);
});

const chartConfig = {
  count: {
    label: "Risks",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export default function DashboardPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [controls, setControls] = useState<Control[]>([]);

  useEffect(() => {
    // Simulate fetching data
    setGoals(MOCK_GOALS);
    setRisks(MOCK_RISKS);
    setControls(MOCK_CONTROLS);
  }, []);

  const highPriorityRisks = risks
    .filter(risk => getRiskLevel(risk.likelihood, risk.impact) === 'Critical' || getRiskLevel(risk.likelihood, risk.impact) === 'High')
    .slice(0, 5);
  
  const totalRisks = risks.length;
  const criticalRisksCount = risks.filter(r => getRiskLevel(r.likelihood, r.impact) === 'Critical').length;
  const controlsImplemented = controls.filter(c => c.status === 'Implemented').length;

  return (
    <div className="space-y-6">
      <PageHeader title="Risk Dashboard" description="Overview of your current risk landscape." />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Goals</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{goals.length}</div>
            <p className="text-xs text-muted-foreground">Currently tracked objectives</p>
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
            <CardDescription>Number of risks in each calculated level.</CardDescription>
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
            <CardDescription>Top 5 critical or high-level risks requiring attention.</CardDescription>
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
                        <TableCell className="font-medium">{risk.description}</TableCell>
                        <TableCell>
                          <Badge variant={
                            level === 'Critical' ? 'destructive' :
                            level === 'High' ? 'destructive' : // Using destructive for high too for visibility
                            level === 'Medium' ? 'secondary' : // Should be noticeable orange/yellow if available
                            'outline' // Low
                          }
                          className={level === 'Medium' ? 'bg-yellow-500 text-black' : ''} // Custom for Medium
                          >
                            {level}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{goal?.name || 'N/A'}</TableCell>
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
