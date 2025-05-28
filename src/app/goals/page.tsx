
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
import { useAuth } from '@/contexts/auth-context';
// Hapus impor goalService karena akan menggunakan store
// import { addGoal, getGoals, updateGoal, deleteGoal, type GoalsResult } from '@/services/goalService';
import { useAppStore } from '@/stores/useAppStore'; // Impor store Zustand
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function GoalsPage() {
  // Gunakan state dari Zustand store
  const goals = useAppStore(state => state.goals);
  const isLoading = useAppStore(state => state.goalsLoading);
  const fetchGoals = useAppStore(state => state.fetchGoals);
  const addGoal = useAppStore(state => state.addGoal);
  const updateGoal = useAppStore(state => state.updateGoal);
  const deleteGoal = useAppStore(state => state.deleteGoal);

  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const { currentUser, appUser, loading: authLoading } = useAuth();
  const router = useRouter();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);

  const currentUserId = useMemo(() => currentUser?.uid || null, [currentUser]);
  const currentPeriod = useMemo(() => appUser?.activePeriod || null, [appUser]);
  const uprDisplayName = useMemo(() => appUser?.displayName || 'UPR...', [appUser]);

  useEffect(() => {
    if (currentUserId && currentPeriod && !authLoading) {
      console.log("[GoalsPage] Fetching goals for user:", currentUserId, "period:", currentPeriod);
      fetchGoals(currentUserId, currentPeriod);
    } else if (!authLoading && (!currentUser || !currentUserId || !currentPeriod)) {
      console.warn("[GoalsPage] Cannot fetch goals, user context not ready.");
      // Mungkin set goals ke array kosong jika tidak ada user/konteks
      useAppStore.setState({ goals: [], goalsLoading: false });
    }
  }, [currentUserId, currentPeriod, authLoading, fetchGoals, currentUser]);


  const handleGoalSave = async (
    goalData: Omit<Goal, 'id' | 'code' | 'createdAt' | 'userId' | 'period'>, 
    existingGoalId?: string
  ) => {
    if (!currentUserId || !currentPeriod) {
      toast({ title: "Konteks Tidak Lengkap", description: "UPR, Periode, atau Pengguna tidak ditemukan untuk menyimpan sasaran.", variant: "destructive" });
      return;
    }

    try {
      if (existingGoalId) {
        await updateGoal(existingGoalId, goalData);
        const editedGoal = goals.find(g => g.id === existingGoalId); // Ambil dari state saat ini untuk toast
        toast({ title: "Sasaran Diperbarui", description: `Sasaran "${goalData.name}" (${editedGoal?.code || '...'}) telah berhasil diperbarui.` });
      } else {
        const newGoal = await addGoal(goalData, currentUserId, currentPeriod);
        if (newGoal) {
          toast({ title: "Sasaran Ditambahkan", description: `Sasaran baru "${newGoal.name}" (${newGoal.code}) telah berhasil ditambahkan.` });
        } else {
          throw new Error("Gagal membuat sasaran baru atau newGoal adalah null.");
        }
      }
      // Fetch ulang atau update state di store sudah ditangani oleh action di store
    } catch (error: any) {
      console.error("Gagal menyimpan sasaran. Pesan:", error.message);
      toast({ title: "Kesalahan", description: (error instanceof Error ? error.message : "Gagal menyimpan sasaran."), variant: "destructive" });
    }
  };

  const confirmDelete = async () => {
    if (!goalToDelete || !currentUserId || !currentPeriod) return;
    try {
      await deleteGoal(goalToDelete.id, currentUserId, currentPeriod);
      toast({ title: "Sasaran Dihapus", description: `Sasaran "${goalToDelete.name}" (${goalToDelete.code}) dan semua data terkait telah dihapus.`, variant: "destructive" });
      setGoalToDelete(null);
      setIsDeleteDialogOpen(false);
      // Fetch ulang sudah ditangani oleh action di store
    } catch (error: any) {
      console.error("Gagal menghapus sasaran. Pesan:", error.message);
      toast({ title: "Kesalahan", description: (error instanceof Error ? error.message : "Gagal menghapus sasaran."), variant: "destructive" });
      setGoalToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };
  
  const handleDeleteGoalClick = (goal: Goal) => {
    setGoalToDelete(goal);
    setIsDeleteDialogOpen(true);
  };


  const filteredGoals = useMemo(() => {
    let sortedGoals = Array.isArray(goals) ? [...goals] : [];
    sortedGoals.sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' }));
    
    if (!searchTerm) {
      return sortedGoals;
    }
    return sortedGoals.filter(goal => 
      goal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      goal.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (goal.code && goal.code.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [goals, searchTerm]);
  
  if (authLoading || (!currentUser && !authLoading)) { // Tunggu auth selesai
     return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat data pengguna...</p>
      </div>
    );
  }
  
  if (!currentUser && !authLoading) {
    // AppLayout seharusnya sudah mengarahkan ke /login
    return null; 
  }
  
  return (
    <div className="space-y-6">
      <PageHeader
        title="Sasaran"
        description={`Definisikan dan kelola tujuan strategis Anda untuk UPR: ${uprDisplayName}, Periode: ${currentPeriod || '...'}.`}
        actions={
          <AddGoalDialog 
            onGoalSave={handleGoalSave}
            // existingGoals (untuk generate code) sekarang dikelola di store jika perlu, atau logika dipindah ke backend/service
            currentUprId={currentUserId || ''} // Tetap diperlukan untuk konteks dialog jika ada
            currentPeriod={currentPeriod || ''} // Tetap diperlukan untuk konteks dialog jika ada
            triggerButton={
              <Button disabled={!currentUser || !currentUserId || !currentPeriod || isLoading}>
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
            disabled={isLoading}
          />
        </div>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-10">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
          <p className="text-muted-foreground">Memuat daftar sasaran...</p>
        </div>
      )}

      {!isLoading && filteredGoals.length === 0 && goals.length > 0 && searchTerm && (
        <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
          <Search className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-lg font-medium">Tidak ada sasaran ditemukan</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Tidak ada sasaran yang cocok dengan kata kunci pencarian Anda: "{searchTerm}".
          </p>
        </div>
      )}

      {!isLoading && goals.length === 0 && !searchTerm && (
        <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
          <Target className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-lg font-medium">Belum ada sasaran untuk UPR/Periode ini</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Mulailah dengan menambahkan sasaran pertama Anda.
          </p>
          <div className="mt-6">
            <AddGoalDialog 
              onGoalSave={handleGoalSave} 
              currentUprId={currentUserId || ''}
              currentPeriod={currentPeriod || ''}
              triggerButton={
                <Button disabled={!currentUser || !currentUserId || !currentPeriod || isLoading}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Tambah Sasaran Baru
                </Button>
              }
            />
          </div>
        </div>
      )}

      {!isLoading && filteredGoals.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredGoals.map((goal) => (
            <GoalCard 
              key={goal.id} 
              goal={goal} 
              onEditGoal={(editedGoalData) => handleGoalSave(editedGoalData, goal.id)} 
              onDeleteGoal={() => handleDeleteGoalClick(goal)}
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
