
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { GoalCard } from '@/components/goals/goal-card';
import { AddGoalDialog } from '@/components/goals/add-goal-dialog';
import type { Goal, PotentialRisk } from '@/lib/types';
import { PlusCircle, Target, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUprId, getCurrentPeriod, initializeAppContext } from '@/lib/upr-period-context';

const INITIAL_GOALS_TEMPLATE: Omit<Goal, 'uprId' | 'period'>[] = [
  { id: 'g1', code: 'L1', name: 'Luncurkan Produk X Baru', description: 'Berhasil mengembangkan dan meluncurkan Produk X pada Q4 untuk meraih 5% pangsa pasar dalam tahun pertama.', createdAt: '2023-10-15T10:00:00Z' },
  { id: 'g2', code: 'T1', name: 'Tingkatkan Kepuasan Pelanggan', description: 'Naikkan skor kepuasan pelanggan (CSAT) dari 80% menjadi 90% pada akhir tahun melalui peningkatan dukungan dan kegunaan produk.', createdAt: '2023-11-01T14:30:00Z' },
  { id: 'g3', code: 'E1', name: 'Ekspansi ke Pasar Baru', description: 'Membangun kehadiran pasar di setidaknya 3 wilayah baru utama pada pertengahan tahun depan, mencapai target penjualan awal.', createdAt: '2024-01-20T09:15:00Z' },
];

const getGoalsStorageKey = (uprId: string, period: string) => `riskwise-upr${uprId}-period${period}-goals`;
const getPotentialRisksStorageKey = (uprId: string, period: string, goalId: string) => `riskwise-upr${uprId}-period${period}-goal${goalId}-potentialRisks`;
const getControlsStorageKey = (uprId: string, period: string, potentialRiskId: string) => `riskwise-upr${uprId}-period${period}-potentialRisk${potentialRiskId}-controls`;
const getRiskCausesStorageKey = (uprId: string, period: string, potentialRiskId: string) => `riskwise-upr${uprId}-period${period}-potentialRisk${potentialRiskId}-causes`;


export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [currentUprId, setCurrentUprId] = useState('');
  const [currentPeriod, setCurrentPeriod] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const context = initializeAppContext();
      const uprId = context.uprId;
      const period = context.period;
      setCurrentUprId(uprId);
      setCurrentPeriod(period);

      const storageKey = getGoalsStorageKey(uprId, period);
      const storedGoalsData = localStorage.getItem(storageKey);
    
      if (storedGoalsData) {
        setGoals(JSON.parse(storedGoalsData));
      } else {
        const initialGoalsWithContext = INITIAL_GOALS_TEMPLATE.map(g => ({
          ...g,
          uprId: uprId,
          period: period,
        }));
        setGoals(initialGoalsWithContext);
        localStorage.setItem(storageKey, JSON.stringify(initialGoalsWithContext));
      }
      setIsLoading(false);
    }
  }, []);

  const updateLocalStorage = (updatedGoals: Goal[]) => {
    if (typeof window !== 'undefined' && currentUprId && currentPeriod) {
      const storageKey = getGoalsStorageKey(currentUprId, currentPeriod);
      localStorage.setItem(storageKey, JSON.stringify(updatedGoals.sort((a, b) => a.code.localeCompare(b.code))));
    }
  };

  const handleGoalSave = (goalData: Omit<Goal, 'id' | 'code' | 'createdAt' | 'uprId' | 'period'>, existingGoalId?: string) => {
    setGoals(prevGoals => {
      let updatedGoals;
      if (existingGoalId) { // Editing existing goal
        updatedGoals = prevGoals.map(g => 
          g.id === existingGoalId 
          ? { ...g, name: goalData.name, description: goalData.description } 
          : g
        );
        const editedGoal = updatedGoals.find(g => g.id === existingGoalId);
        toast({ title: "Sasaran Diperbarui", description: `Sasaran "${editedGoal?.name}" (${editedGoal?.code}) telah berhasil diperbarui.` });
      } else { // Adding new goal
        const firstLetter = goalData.name.charAt(0).toUpperCase();
        // Basic validation for a letter, default to 'X' if not.
        const prefix = /^[A-Z]$/.test(firstLetter) ? firstLetter : 'X';
        
        const goalsWithSamePrefix = prevGoals.filter(g => g.code.startsWith(prefix));
        let maxNum = 0;
        goalsWithSamePrefix.forEach(g => {
          const numPart = parseInt(g.code.substring(prefix.length), 10);
          if (!isNaN(numPart) && numPart > maxNum) {
            maxNum = numPart;
          }
        });
        const newNumericPart = maxNum + 1;
        const newGoalCode = `${prefix}${newNumericPart}`;

        const newGoal: Goal = {
          id: `goal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: goalData.name,
          description: goalData.description,
          code: newGoalCode,
          createdAt: new Date().toISOString(),
          uprId: currentUprId,
          period: currentPeriod,
        };
        updatedGoals = [newGoal, ...prevGoals];
        toast({ title: "Sasaran Ditambahkan", description: `Sasaran baru "${newGoal.name}" (${newGoal.code}) telah berhasil ditambahkan.` });
      }
      updateLocalStorage(updatedGoals);
      return updatedGoals;
    });
  };

  const handleGoalDelete = (goalId: string) => {
    const goalToDelete = goals.find(g => g.id === goalId);
    if (!goalToDelete || !currentUprId || !currentPeriod) return;

    setGoals(prevGoals => {
      const updatedGoals = prevGoals.filter(g => g.id !== goalId);
      updateLocalStorage(updatedGoals);
      toast({ title: "Sasaran Dihapus", description: `Sasaran "${goalToDelete.name}" (${goalToDelete.code}) telah dihapus.`, variant: "destructive" });
      
      if (typeof window !== 'undefined') {
        const potentialRisksStorageKey = getPotentialRisksStorageKey(currentUprId, currentPeriod, goalId);
        const storedPotentialRisks = localStorage.getItem(potentialRisksStorageKey);
        if (storedPotentialRisks) {
          localStorage.removeItem(potentialRisksStorageKey);
          const pRisks: PotentialRisk[] = JSON.parse(storedPotentialRisks);
          pRisks.forEach(pRisk => {
            localStorage.removeItem(getControlsStorageKey(currentUprId, currentPeriod, pRisk.id));
            localStorage.removeItem(getRiskCausesStorageKey(currentUprId, currentPeriod, pRisk.id));
          });
        }
      }
      return updatedGoals;
    });
  };

  const filteredGoals = useMemo(() => {
    let sortedGoals = [...goals].sort((a, b) => a.code.localeCompare(b.code, undefined, {numeric: true}));
    if (!searchTerm) {
      return sortedGoals;
    }
    return sortedGoals.filter(goal => 
      goal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      goal.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      goal.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [goals, searchTerm]);
  
  if (isLoading || !currentUprId || !currentPeriod) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat data sasaran...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sasaran"
        description={`Definisikan dan kelola tujuan strategis Anda untuk UPR: ${currentUprId}, Periode: ${currentPeriod}.`}
        actions={
          <AddGoalDialog 
            onGoalSave={handleGoalSave}
            // Pass all current goals for code generation logic if it were inside the dialog
            // For now, logic is in handleGoalSave here
            triggerButton={
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Tambah Sasaran Baru
              </Button>
            }
          />
        }
      />

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cari sasaran berdasarkan kode, nama, atau deskripsi..."
            className="pl-10 w-full md:w-1/2 lg:w-1/3"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredGoals.length === 0 && goals.length > 0 && searchTerm && (
        <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
          <Search className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-lg font-medium">Tidak ada sasaran ditemukan</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Tidak ada sasaran yang cocok dengan kata kunci pencarian Anda: "{searchTerm}".
          </p>
        </div>
      )}

      {filteredGoals.length === 0 && (goals.length === 0 || !searchTerm) && (
        <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
          <Target className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-lg font-medium">Belum ada sasaran untuk UPR/Periode ini</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Mulailah dengan menambahkan sasaran pertama Anda.
          </p>
          <div className="mt-6">
            <AddGoalDialog 
              onGoalSave={handleGoalSave} 
              triggerButton={
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" /> Tambah Sasaran Baru
                </Button>
              }
            />
          </div>
        </div>
      )}

      {filteredGoals.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredGoals.map((goal) => (
            <GoalCard 
              key={goal.id} 
              goal={goal} 
              onEditGoal={(editedGoalData) => handleGoalSave(editedGoalData, goal.id)} 
              onDeleteGoal={handleGoalDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

