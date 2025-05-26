
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
import { addGoal, getGoals, updateGoal, deleteGoal, type GoalsResult } from '@/services/goalService'; // Import GoalsResult
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [currentUprId, setCurrentUprId] = useState('');
  const [currentPeriod, setCurrentPeriod] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const router = useRouter();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);

  const loadGoals = useCallback(async () => {
    if (!currentUser || !currentUprId || !currentPeriod) {
      setGoals([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const result: GoalsResult = await getGoals(currentUprId, currentPeriod);
      if (result.success && result.goals) {
        setGoals(result.goals);
      } else if (!result.success && result.code === 'NO_UPRID' && result.message) {
        toast({ title: "Informasi", description: result.message, variant: "default", duration: 7000 });
        setGoals([]);
      } else {
        toast({ title: "Kesalahan", description: result.message || "Gagal memuat daftar sasaran.", variant: "destructive" });
        setGoals([]);
      }
    } catch (error) {
      console.error("Gagal memuat sasaran:", error);
      toast({ title: "Kesalahan Fatal", description: "Terjadi kesalahan fatal saat memuat sasaran.", variant: "destructive" });
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
        const newGoal = await addGoal(goalData, currentUprId, currentPeriod, currentUser.uid, goals);
        toast({ title: "Sasaran Ditambahkan", description: `Sasaran baru "${newGoal.name}" (${newGoal.code}) telah berhasil ditambahkan.` });
      }
      loadGoals(); 
    } catch (error: any) {
      console.error("Gagal menyimpan sasaran:", error);
      toast({ title: "Kesalahan", description: error.message || "Gagal menyimpan sasaran.", variant: "destructive" });
    }
  };

  const confirmDelete = async () => {
    if (!goalToDelete || !currentUprId || !currentPeriod || !currentUser) return;
    try {
      await deleteGoal(goalToDelete.id, currentUprId, currentPeriod);
      toast({ title: "Sasaran Dihapus", description: `Sasaran "${goalToDelete.name}" (${goalToDelete.code}) dan semua data terkait telah dihapus.`, variant: "destructive" });
      setGoalToDelete(null);
      setIsDeleteDialogOpen(false);
      loadGoals(); 
    } catch (error: any) {
      console.error("Gagal menghapus sasaran:", error);
      toast({ title: "Kesalahan", description: error.message || "Gagal menghapus sasaran.", variant: "destructive" });
      setGoalToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };
  
  const handleDeleteGoal = (goal: Goal) => {
    setGoalToDelete(goal);
    setIsDeleteDialogOpen(true);
  };


  const filteredGoals = useMemo(() => {
    let sortedGoals = Array.isArray(goals) ? [...goals] : [];
    if (!searchTerm) {
      return sortedGoals;
    }
    return sortedGoals.filter(goal => 
      goal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      goal.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (goal.code && goal.code.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [goals, searchTerm]);
  
  if (isLoading && !currentUser) { // Initial check before context might be ready
     return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memverifikasi sesi...</p>
      </div>
    );
  }

  if (!currentUser && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Target className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-xl font-medium">Akses Dibatasi</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Silakan login untuk mengakses halaman Sasaran.
        </p>
        <Button onClick={() => router.push('/login')} className="mt-6">
            Ke Halaman Login
        </Button>
      </div>
    );
  }
  
  if (isLoading) {
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
            existingGoals={goals} // Pass existing goals to help with code generation
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
              existingGoals={goals}
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
              onDeleteGoal={() => handleDeleteGoal(goal)}
            />
          ))}
        </div>
      )}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus Sasaran</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus sasaran "{goalToDelete?.name}" ({goalToDelete?.code})? Semua potensi risiko, penyebab, dan rencana pengendalian terkait juga akan dihapus. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {setIsDeleteDialogOpen(false); setGoalToDelete(null);}}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    