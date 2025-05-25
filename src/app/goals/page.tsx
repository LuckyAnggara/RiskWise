
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { GoalCard } from '@/components/goals/goal-card';
import { AddGoalDialog } from '@/components/goals/add-goal-dialog';
import type { Goal } from '@/lib/types';
import { PlusCircle, Target, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUprId, getCurrentPeriod, initializeAppContext } from '@/lib/upr-period-context';
import { useAuth } from '@/contexts/auth-context';
import { addGoal, getGoals, updateGoal, deleteGoal } from '@/services/goalService';

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [currentUprId, setCurrentUprId] = useState('');
  const [currentPeriod, setCurrentPeriod] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const loadGoals = useCallback(async () => {
    if (!currentUser || !currentUprId || !currentPeriod) {
      setGoals([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const fetchedGoals = await getGoals(currentUprId, currentPeriod);
      setGoals(fetchedGoals);
    } catch (error) {
      console.error("Gagal memuat sasaran:", error);
      toast({ title: "Kesalahan", description: "Gagal memuat daftar sasaran.", variant: "destructive" });
      setGoals([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUprId, currentPeriod, currentUser, toast]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const context = initializeAppContext();
      setCurrentUprId(context.uprId);
      setCurrentPeriod(context.period);
    }
  }, []);

  useEffect(() => {
    if (currentUprId && currentPeriod && currentUser) {
      loadGoals();
    } else if (!currentUser) {
      setIsLoading(false); 
      setGoals([]);
    }
  }, [currentUprId, currentPeriod, currentUser, loadGoals]);

  const handleGoalSave = async (goalData: Omit<Goal, 'id' | 'code' | 'createdAt' | 'uprId' | 'period' | 'userId'>, existingGoalId?: string) => {
    if (!currentUser || !currentUprId || !currentPeriod) {
      toast({ title: "Autentikasi Diperlukan", description: "Anda harus login untuk menyimpan sasaran.", variant: "destructive" });
      return;
    }

    try {
      if (existingGoalId) {
        await updateGoal(existingGoalId, goalData);
        const editedGoal = goals.find(g => g.id === existingGoalId);
        toast({ title: "Sasaran Diperbarui", description: `Sasaran "${goalData.name}" (${editedGoal?.code}) telah berhasil diperbarui.` });
      } else {
        const newGoal = await addGoal(goalData, currentUprId, currentPeriod, currentUser.uid);
        toast({ title: "Sasaran Ditambahkan", description: `Sasaran baru "${newGoal.name}" (${newGoal.code}) telah berhasil ditambahkan.` });
      }
      loadGoals(); 
    } catch (error: any) {
      console.error("Gagal menyimpan sasaran:", error);
      toast({ title: "Kesalahan", description: error.message || "Gagal menyimpan sasaran.", variant: "destructive" });
    }
  };

  const handleGoalDelete = async (goalId: string) => {
    const goalToDelete = goals.find(g => g.id === goalId);
    if (!goalToDelete || !currentUprId || !currentPeriod) return;

    const confirmed = window.confirm(`Apakah Anda yakin ingin menghapus sasaran "${goalToDelete.name}" (${goalToDelete.code})? Semua potensi risiko, penyebab, dan rencana pengendalian terkait juga akan dihapus.`);
    if (!confirmed) return;

    try {
      await deleteGoal(goalId, currentUprId, currentPeriod);
      toast({ title: "Sasaran Dihapus", description: `Sasaran "${goalToDelete.name}" (${goalToDelete.code}) dan semua data terkait telah dihapus.`, variant: "destructive" });
      loadGoals(); 
    } catch (error: any) {
      console.error("Gagal menghapus sasaran:", error);
      toast({ title: "Kesalahan", description: error.message || "Gagal menghapus sasaran.", variant: "destructive" });
    }
  };

  const filteredGoals = useMemo(() => {
    let sortedGoals = [...goals]; 
    if (!searchTerm) {
      return sortedGoals;
    }
    return sortedGoals.filter(goal => 
      goal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      goal.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (goal.code && goal.code.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [goals, searchTerm]);
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat data sasaran...</p>
      </div>
    );
  }
   if (!currentUser && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Target className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-xl font-medium">Akses Dibatasi</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Silakan login untuk mengakses halaman ini.
        </p>
        <Button onClick={() => router.push('/login')} className="mt-6">
            Ke Halaman Login
        </Button>
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
            triggerButton={
              <Button disabled={!currentUser}>
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
                <Button disabled={!currentUser}>
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
