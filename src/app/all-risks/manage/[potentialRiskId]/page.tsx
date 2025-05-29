
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams, usePathname } from 'next/navigation'; 
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { PotentialRisk, Goal, RiskCategory, RiskCause, RiskSource, AppUser } from '@/lib/types';
import { RISK_CATEGORIES, RISK_SOURCES } from '@/lib/types'; // Removed LIKELIHOOD_LEVELS_DESC_MAP, IMPACT_LEVELS_DESC_MAP, CalculatedRiskLevelCategory
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, PlusCircle, Trash2, Loader2, Save, BarChart3, Wand2, Settings2, LayoutGrid, List, ChevronDown } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import { BrainstormContextModal } from '@/components/risks/brainstorm-context-modal';
import { BrainstormSuggestionsModal, type AISuggestionItem as AICSuggestionItem } from '@/components/risks/brainstorm-suggestions-modal'; 

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RiskCauseCardItem } from '@/components/risks/risk-cause-card-item';
// Import getCalculatedRiskLevel, getRiskLevelColor from types.ts or a shared util
import { getCalculatedRiskLevel, getRiskLevelColor } from '@/lib/types'; // Assuming they are moved here or a shared util

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

import { useAuth } from '@/contexts/auth-context';
import { useAppStore } from '@/stores/useAppStore';


const potentialRiskFormSchema = z.object({
  description: z.string().min(10, "Deskripsi potensi risiko minimal 10 karakter."),
  goalId: z.string().min(1, "Sasaran harus dipilih."),
  category: z.custom<RiskCategory>().nullable().refine(val => val === null || RISK_CATEGORIES.includes(val as RiskCategory), {
    message: "Kategori risiko tidak valid.",
  }),
  owner: z.string().nullable(),
});

type PotentialRiskFormData = z.infer<typeof potentialRiskFormSchema>;

const riskCauseFormSchema = z.object({
  causeDescription: z.string().min(5, "Deskripsi penyebab minimal 5 karakter."),
  causeSource: z.custom<RiskSource>().refine(val => RISK_SOURCES.includes(val as RiskSource), {
    message: "Sumber harus dipilih.",
  }),
});
type RiskCauseFormData = z.infer<typeof riskCauseFormSchema>;

const NO_CATEGORY_SENTINEL = "__NONE__";


export default function ManagePotentialRiskPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const potentialRiskIdParam = params.potentialRiskId as string;
  const isCreatingNew = potentialRiskIdParam === 'new';
  
  const { currentUser, appUser, loading: authLoading, profileLoading, isProfileComplete } = useAuth();
  const store = useAppStore();
  
  const [pageIsLoading, setPageIsLoading] = useState(true);
  const [isSavingPR, setIsSavingPR] = useState(false);
  
  const [allGoals, setAllGoals] = useState<Goal[]>([]); 
  const [currentPotentialRisk, setCurrentPotentialRisk] = useState<PotentialRisk | null>(null);
  
  const [causeToDelete, setCauseToDelete] = useState<RiskCause | null>(null);
  const [isDeleteCauseAlertOpen, setIsDeleteCauseAlertOpen] = useState(false);

  const [isBrainstormCausesContextModalOpen, setIsBrainstormCausesContextModalOpen] = useState(false);
  const [isBrainstormCausesSuggestionsModalOpen, setIsBrainstormCausesSuggestionsModalOpen] = useState(false);
  const [aiCauseSuggestions, setAICauseSuggestions] = useState<AICSuggestionItem[]>([]);

  const currentUserIdFromAuth = useMemo(() => appUser?.uid || null, [appUser]);
  const currentPeriodFromAuth = useMemo(() => appUser?.activePeriod || null, [appUser]);
  const uprDisplayName = useMemo(() => appUser?.displayName || 'UPR...', [appUser]);

  const displayedRiskCauses = useMemo(() => {
    if (currentPotentialRisk && currentUserIdFromAuth && currentPeriodFromAuth) {
      return store.riskCauses.filter(rc =>
        rc.potentialRiskId === currentPotentialRisk.id &&
        rc.userId === currentUserIdFromAuth &&
        rc.period === currentPeriodFromAuth
      ).sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0));
    }
    return [];
  }, [store.riskCauses, currentPotentialRisk, currentUserIdFromAuth, currentPeriodFromAuth]);


  const goalIdFromQuery = searchParams.get('goalId');
  const returnPath = useMemo(() => {
    const fromQuery = searchParams.get('from');
    if (fromQuery) return fromQuery;
    if (currentPotentialRisk?.goalId) return `/risks/${currentPotentialRisk.goalId}`;
    if (isCreatingNew && goalIdFromQuery) return `/risks/${goalIdFromQuery}`;
    return `/all-risks`;
  }, [searchParams, currentPotentialRisk?.goalId, isCreatingNew, goalIdFromQuery]);

  const [causeViewMode, setCauseViewMode] = useState<'table' | 'card'>('table');


  const {
    register: registerPotentialRisk,
    handleSubmit: handleSubmitPotentialRisk,
    reset: resetPotentialRiskForm,
    setValue: setPotentialRiskValue,
    control: potentialRiskControl,
    getValues: getPotentialRiskValues,
    formState: { errors: potentialRiskErrors },
  } = useForm<PotentialRiskFormData>({
    resolver: zodResolver(potentialRiskFormSchema),
    defaultValues: { description: "", goalId: "", category: null, owner: "" },
  });

  const {
    register: registerRiskCause,
    handleSubmit: handleSubmitRiskCause,
    reset: resetRiskCauseForm,
    control: riskCauseControl,
    formState: { errors: riskCauseErrors, isSubmitting: isAddingCause },
  } = useForm<RiskCauseFormData>({
    resolver: zodResolver(riskCauseFormSchema),
    defaultValues: { causeDescription: "", causeSource: "Internal" },
  });

  const { toast } = useToast();

  useEffect(() => {
    const loadPageData = async () => {
      let isActive = true;
      const currentUserId = currentUserIdFromAuth;
      const currentPeriod = currentPeriodFromAuth;
      
      console.log(`[ManagePRPage] loadPageData called. isCreatingNew: ${isCreatingNew}, potentialRiskIdParam: ${potentialRiskIdParam}, UserID: ${currentUserId}, Period: ${currentPeriod}`);
      setPageIsLoading(true);
      
      setCurrentPotentialRisk(null);
      resetPotentialRiskForm({ description: "", goalId: "", category: null, owner: "" });

      if (!currentUserId || !currentPeriod || !isProfileComplete || authLoading || profileLoading) {
        if (!authLoading && !profileLoading && isActive) {
          setPageIsLoading(false);
        }
        console.log("[ManagePRPage] loadPageData: Pre-conditions not met or auth/profile still loading.", { currentUserId, currentPeriod, isProfileComplete, authLoading, profileLoading });
        return;
      }

      try {
        let fetchedGoals: Goal[] = store.goals;
        if (fetchedGoals.length === 0 && !store.goalsLoading) {
          console.log("[ManagePRPage] Goals not in store, fetching goals from service...");
          await store.fetchGoals(currentUserId, currentPeriod); // This will update store.goals
          if (!isActive) return;
          fetchedGoals = store.goals; // Re-access from store after fetch
        }
        
        const sortedGoals = [...fetchedGoals].filter(g => g.userId === currentUserId && g.period === currentPeriod)
                                             .sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' }));
        
        if (isActive) {
          setAllGoals(sortedGoals);
          console.log("[ManagePRPage] Total relevant goals fetched/from store:", sortedGoals.length);
        }

        const initialGoalIdForNew = goalIdFromQuery || (sortedGoals.length > 0 ? sortedGoals[0].id : "");

        if (isCreatingNew) {
          if (isActive) {
            setPotentialRiskValue("goalId", initialGoalIdForNew);
            console.log("[ManagePRPage] Creating new PR. Set goalId to:", initialGoalIdForNew);
            if (sortedGoals.length === 0 && !goalIdFromQuery) {
              toast({ title: "Perhatian", description: "Tidak ada sasaran yang tersedia. Harap buat sasaran terlebih dahulu.", variant: "warning", duration: 7000 });
            }
          }
        } else if (potentialRiskIdParam) {
          console.log(`[ManagePRPage] Editing existing PR. Fetching PR ID: ${potentialRiskIdParam}`);
          
          // Try from store first, then service
          let risk = store.potentialRisks.find(p => p.id === potentialRiskIdParam && p.userId === currentUserId && p.period === currentPeriod);
          if (!risk && !store.potentialRisksLoading) { // if not in store and store is not already loading them
            console.log(`[ManagePRPage] PR ${potentialRiskIdParam} not in store or store not loading, fetching PR from service.`);
            risk = await store.getPotentialRiskById(potentialRiskIdParam, currentUserId, currentPeriod);
          }
          
          if (!isActive) return;
          if (risk) {
            console.log("[ManagePRPage] PR found:", {id: risk.id, desc: risk.description});
            if (isActive) {
              setCurrentPotentialRisk(risk);
              resetPotentialRiskForm({
                description: risk.description,
                goalId: risk.goalId,
                category: risk.category,
                owner: risk.owner || "",
              });
              // Ensure risk causes for this PR are loaded
              const causesForThisPRInStore = store.riskCauses.filter(rc => rc.potentialRiskId === risk.id && rc.userId === currentUserId && rc.period === currentPeriod);
              if (causesForThisPRInStore.length === 0 && !store.riskCausesLoading) {
                 console.log(`[ManagePRPage] RiskCauses for PR ${risk.id} not in store, fetching...`);
                 await store.fetchRiskCauses(currentUserId, currentPeriod, risk.id); // Fetch specific to PR
              } else {
                 console.log(`[ManagePRPage] RiskCauses for PR ${risk.id} already in store or loading: ${causesForThisPRInStore.length} found.`);
              }
            }
          } else {
            console.warn(`[ManagePRPage] PR with ID ${potentialRiskIdParam} not found or context mismatch.`);
            if (isActive) {
                toast({ title: "Kesalahan", description: "Potensi Risiko tidak ditemukan atau tidak cocok konteks.", variant: "destructive" });
                router.push(returnPath);
            }
          }
        }
      } catch (error: any) {
        if (!isActive) return;
        const errorMessage = error.message || String(error);
        console.error("[ManagePRPage] Error during loadPageData:", errorMessage);
        if (isActive) {
            toast({ title: "Gagal Memuat Data Halaman", description: errorMessage, variant: "destructive" });
            router.push(returnPath);
        }
      } finally {
        if (isActive) {
          setPageIsLoading(false);
          console.log("[ManagePRPage] loadPageData finished.");
        }
      }
    };
    
    // Using currentUserIdFromAuth and currentPeriodFromAuth in dependency array
    if (currentUserIdFromAuth && currentPeriodFromAuth && isProfileComplete && !authLoading && !profileLoading) {
        loadPageData();
    } else if (!authLoading && !profileLoading) {
        // If auth context is resolved but user/period is still not available (e.g. profile incomplete)
        setPageIsLoading(false);
    }
    
    return () => { 
      // isActive = false; // This logic was problematic
      console.log("[ManagePRPage] Main useEffect cleanup.");
    };
  }, [
      potentialRiskIdParam, 
      isCreatingNew,
      currentUserIdFromAuth, // Use memoized primitive value
      currentPeriodFromAuth, // Use memoized primitive value
      isProfileComplete, 
      authLoading, 
      profileLoading,
      store, // store object reference should be stable
      resetPotentialRiskForm, 
      setPotentialRiskValue, 
      router, 
      toast, 
      searchParams, // from next/navigation, stable
      pathname, // from next/navigation, stable
      goalIdFromQuery,
      returnPath // from useMemo, should be stable if its deps are
  ]);


  const onPotentialRiskSubmit: SubmitHandler<PotentialRiskFormData> = async (formData) => {
    setIsSavingPR(true);
    
    const userIdForService = currentUser?.uid; 
    const periodForService = appUser?.activePeriod;

    if (!currentUser || typeof userIdForService !== 'string' || !userIdForService.trim() || typeof periodForService !== 'string' || !periodForService.trim()) {
        toast({ title: "Kesalahan Kritis", description: "User ID atau Periode tidak valid. Harap coba lagi atau segarkan halaman.", variant: "destructive" });
        setIsSavingPR(false);
        return;
    }
    
    const parentGoal = allGoals.find(g => g.id === formData.goalId && g.userId === userIdForService && g.period === periodForService);
    if (!parentGoal) {
      toast({ title: "Kesalahan", description: "Sasaran induk yang dipilih tidak valid atau tidak cocok dengan konteks.", variant: "destructive" });
      setIsSavingPR(false);
      return;
    }
    
    try {
      let savedPotentialRisk: PotentialRisk | null = null;
      const pRiskDataPayload: Omit<PotentialRisk, 'id' | 'identifiedAt' | 'userId' | 'period' | 'sequenceNumber' | 'goalId'> = {
        description: formData.description,
        category: formData.category === NO_CATEGORY_SENTINEL ? null : formData.category as RiskCategory,
        owner: formData.owner || null,
      };

      if (isCreatingNew) {
        const existingPRsForGoal = store.potentialRisks.filter(pr => pr.goalId === parentGoal.id && pr.userId === userIdForService && pr.period === periodForService);
        const newSequenceNumber = (existingPRsForGoal.reduce((max, pr) => Math.max(max, pr.sequenceNumber || 0), 0)) + 1;
        
        savedPotentialRisk = await store.addPotentialRisk(pRiskDataPayload, parentGoal.id, userIdForService, periodForService, newSequenceNumber);
        if (savedPotentialRisk) {
          const toastDescription = `Potensi Risiko "${savedPotentialRisk.description}" (Kode: ${parentGoal.code || '?'}.PR${savedPotentialRisk.sequenceNumber}) dibuat. Anda sekarang dapat menambahkan penyebabnya.`;
          toast({ title: "Sukses", description: toastDescription });
          // router.replace(`/all-risks/manage/${savedPotentialRisk.id}?from=${encodeURIComponent(returnPath)}`); 
          // Replace with pathname to avoid full reload if already on manage page, just update the ID
          router.replace(`${pathname.substring(0, pathname.lastIndexOf('/'))}/${savedPotentialRisk.id}?from=${encodeURIComponent(returnPath)}`);
        } else {
          throw new Error("Gagal membuat potensi risiko baru melalui store.");
        }
      } else if (currentPotentialRisk) {
        const updateData: Partial<Omit<PotentialRisk, 'id' | 'userId' | 'period' | 'identifiedAt' | 'sequenceNumber' | 'updatedAt'>> & { goalId?: string } = { 
            description: formData.description,
            category: formData.category === NO_CATEGORY_SENTINEL ? null : formData.category as RiskCategory,
            owner: formData.owner || null,
        };
        
        if (currentPotentialRisk.goalId !== formData.goalId) {
            updateData.goalId = formData.goalId;
        }
        
        savedPotentialRisk = await store.updatePotentialRisk(currentPotentialRisk.id, updateData);
        if (savedPotentialRisk) {
          const updatedParentGoal = allGoals.find(g => g.id === savedPotentialRisk!.goalId);
          const toastDescription = `Potensi Risiko "${savedPotentialRisk.description}" (Kode: ${updatedParentGoal?.code || '?'}.PR${savedPotentialRisk.sequenceNumber}) diperbarui.`;
          toast({ title: "Sukses", description: toastDescription });
          setCurrentPotentialRisk(savedPotentialRisk); 
        } else {
          throw new Error("Gagal memperbarui potensi risiko melalui store.");
        }
      } else {
        toast({ title: "Kesalahan", description: "Tidak dapat menyimpan. Data potensi risiko tidak lengkap.", variant: "destructive" });
        setIsSavingPR(false);
        return;
      }
    } catch (error: any) {
        const errorMessage = error.message || String(error);
        console.error("[ManagePRPage] Error saving potential risk:", errorMessage);
        toast({ title: "Gagal Menyimpan", description: `Terjadi kesalahan saat menyimpan potensi risiko: ${errorMessage}`, variant: "destructive" });
    } finally {
        setIsSavingPR(false);
    }
  };

  const onRiskCauseSubmit: SubmitHandler<RiskCauseFormData> = async (data) => {
    const userIdForService = currentUser?.uid;
    const periodForService = appUser?.activePeriod;

    if (!userIdForService || !periodForService) {
        toast({ title: "Konteks Pengguna/Periode Hilang", variant: "destructive" });
        return;
    }
    if (!currentPotentialRisk) {
        toast({ title: "Kesalahan", description: "Konteks potensi risiko induk tidak ditemukan.", variant: "destructive" });
        return;
    }
    
    try {
      const existingCausesForPR = displayedRiskCauses; 
      const newSequenceNumber = (existingCausesForPR.reduce((max, rc) => Math.max(max, rc.sequenceNumber || 0), 0)) + 1;

      const newCauseData: Omit<RiskCause, 'id' | 'createdAt' | 'userId' | 'period' | 'potentialRiskId' | 'goalId' | 'sequenceNumber' > = {
          description: data.causeDescription,
          source: data.causeSource,
          keyRiskIndicator: null, riskTolerance: null, likelihood: null, impact: null,
      };
      
      const newCause = await store.addRiskCause(newCauseData, currentPotentialRisk.id, currentPotentialRisk.goalId, userIdForService, periodForService, newSequenceNumber);
      
      if (newCause) {
        const parentGoal = allGoals.find(g => g.id === currentPotentialRisk.goalId);
        const potentialRiskCodePart = `${parentGoal?.code || 'S?'}.PR${currentPotentialRisk.sequenceNumber || '?'}`;
        const toastDescription = `Penyebab "${newCause.description}" (Kode: ${potentialRiskCodePart}.PC${newCause.sequenceNumber}) ditambahkan.`;
        toast({ title: "Penyebab Risiko Ditambahkan", description: toastDescription });
        resetRiskCauseForm();
      } else {
        throw new Error("Gagal membuat penyebab risiko baru melalui store.");
      }
    } catch (error: any) {
        const errorMessage = error.message || String(error);
        console.error("[ManagePRPage] Error adding risk cause:", errorMessage);
        toast({ title: "Gagal Menambah Penyebab", description: `Terjadi kesalahan: ${errorMessage}`, variant: "destructive" });
    }
  };

  const handleDeleteRiskCauseSubmit = async () => {
    const userIdForService = currentUser?.uid;
    const periodForService = appUser?.activePeriod;
    
    if (!userIdForService || !periodForService) {
        toast({ title: "Konteks Pengguna/Periode Hilang", variant: "destructive" });
        setIsDeleteCauseAlertOpen(false); setCauseToDelete(null); return;
    }
     if (!currentPotentialRisk || !causeToDelete || !causeToDelete.id) {
        toast({ title: "Data Tidak Lengkap", variant: "destructive" });
        setIsDeleteCauseAlertOpen(false); setCauseToDelete(null); return;
    }
    
    try {
      await store.deleteRiskCause(causeToDelete.id, userIdForService, periodForService); 
      const parentGoal = allGoals.find(g => g.id === currentPotentialRisk.goalId);
      const potentialRiskCodePart = `${parentGoal?.code || 'S?'}.PR${currentPotentialRisk.sequenceNumber || '?'}`;
      const toastDescription = `Penyebab "${causeToDelete.description}" (Kode: ${potentialRiskCodePart}.PC${causeToDelete.sequenceNumber || '?'}) dan data terkait telah dihapus.`;
      toast({ title: "Penyebab Risiko Dihapus", description: toastDescription, variant: "destructive" });
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      console.error("[ManagePRPage] Error deleting risk cause:", errorMessage);
      toast({ title: "Gagal Menghapus", description: `Terjadi kesalahan: ${errorMessage}`, variant: "destructive" });
    } finally {
        setIsDeleteCauseAlertOpen(false);
        setCauseToDelete(null);
    }
  };

  const handleOpenDeleteCauseAlert = (cause: RiskCause) => {
    setCauseToDelete(cause);
    setIsDeleteCauseAlertOpen(true);
  };

  const handleAISuggestionsReady = (suggestions: AICSuggestionItem[]) => {
    const userIdForService = currentUser?.uid; 
    const periodForService = appUser?.activePeriod;

    if (!currentPotentialRisk || !userIdForService || !periodForService) {
      toast({ title: "Konteks Hilang", description: "Tidak dapat memproses saran AI tanpa konteks potensi risiko yang aktif.", variant: "warning" });
      return;
    }
    if (suggestions.length === 0) {
      toast({ title: "Tidak Ada Saran Penyebab", description: "AI tidak menghasilkan saran penyebab.", variant: "default" });
      setIsBrainstormCausesContextModalOpen(false);
      return;
    }
    setAICauseSuggestions(suggestions);
    setIsBrainstormCausesContextModalOpen(false);
    setIsBrainstormCausesSuggestionsModalOpen(true);
  };

  const handleSaveAISelectedCauses = async (selectedItems: AICSuggestionItem[]) => {
    const userIdForService = currentUser?.uid;
    const periodForService = appUser?.activePeriod;

    if (!userIdForService || !periodForService) {
        toast({ title: "Konteks Pengguna/Periode Hilang", variant: "destructive" });
        setIsBrainstormCausesSuggestionsModalOpen(false); return;
    }
    if (!currentPotentialRisk) {
      toast({ title: "Konteks Potensi Risiko Hilang", variant: "destructive" });
      setIsBrainstormCausesSuggestionsModalOpen(false); return;
    }

    try {
      let currentSequence = displayedRiskCauses.reduce((max, rc) => Math.max(max, rc.sequenceNumber || 0), 0);
      const createdCausesPromises: Promise<RiskCause | null>[] = [];

      for (const item of selectedItems) {
        currentSequence++;
        const newCauseData: Omit<RiskCause, 'id' | 'createdAt' | 'userId' | 'period' | 'potentialRiskId' | 'goalId' | 'sequenceNumber' > = {
            description: item.description,
            source: item.source || "Internal", 
            keyRiskIndicator: null, riskTolerance: null, likelihood: null, impact: null,
        };
        createdCausesPromises.push(
          store.addRiskCause(newCauseData, currentPotentialRisk.id, currentPotentialRisk.goalId, userIdForService, periodForService, currentSequence)
        );
      }
      
      const createdCauses = (await Promise.all(createdCausesPromises)).filter(Boolean) as RiskCause[];
      
      if (createdCauses.length > 0) {
        toast({ title: "Saran Penyebab Disimpan", description: `${createdCauses.length} penyebab risiko baru dari AI telah ditambahkan.` });
      }
      if (selectedItems.length !== createdCauses.length) {
         toast({ title: "Sebagian Gagal Disimpan", description: "Beberapa saran penyebab dari AI gagal disimpan.", variant: "warning" });
      }
    } catch (error: any) {
        const errorMessage = error.message || String(error);
        console.error("[ManagePRPage] Error saving AI suggested causes:", errorMessage);
        toast({ title: "Gagal Menyimpan", description: `Terjadi kesalahan: ${errorMessage}`, variant: "destructive" });
    } finally {
      setIsBrainstormCausesSuggestionsModalOpen(false);
    }
  };


  const isLoadingPageContext = authLoading || profileLoading || pageIsLoading;

  if (isLoadingPageContext) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat data potensi risiko...</p>
         <Link href={returnPath} passHref>
            <Button variant="outline" className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
            </Button>
          </Link>
      </div>
    );
  }
  
  if (!currentUser || !isProfileComplete) { 
    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-xl text-muted-foreground">Mengarahkan atau menunggu profil lengkap...</p>
            <Link href={returnPath} passHref>
                <Button variant="outline" className="mt-4">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
                </Button>
            </Link>
        </div>
    );
  }
  if (!isCreatingNew && !currentPotentialRisk && !pageIsLoading && appUser?.uid){
     return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-xl text-muted-foreground">Potensi risiko tidak ditemukan atau Anda tidak memiliki akses.</p>
         <Link href={returnPath} passHref>
            <Button variant="outline" className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
            </Button>
          </Link>
      </div>
    );
  }

  const parentGoalForDisplay = allGoals.find(g => g.id === (currentPotentialRisk ? currentPotentialRisk.goalId : (isCreatingNew ? getPotentialRiskValues("goalId") : '')));
  const goalCodeForPR = parentGoalForDisplay?.code || 'S?';
  const potentialRiskCode = currentPotentialRisk?.sequenceNumber ? `${goalCodeForPR}.PR${currentPotentialRisk.sequenceNumber}` : (isCreatingNew ? "PR Baru" : "PR...");


  return (
    <div className="space-y-6">
      <PageHeader
        title={isCreatingNew ? "Tambah Potensi Risiko Baru" : `Edit Potensi Risiko (${potentialRiskCode})`}
        description={`Kelola detail dan penyebab potensi risiko. UPR: ${uprDisplayName}, Periode: ${appUser?.activePeriod || '...'}.`}
        actions={
          <Link href={returnPath} passHref>
            <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
            </Button>
          </Link>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Detail Potensi Risiko</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitPotentialRisk(onPotentialRiskSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="goalIdPotentialRisk">Sasaran Terkait</Label>
              <Controller
                name="goalId"
                control={potentialRiskControl}
                render={({ field }) => (
                    <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={(allGoals.length === 0) || isSavingPR}
                    >
                        <SelectTrigger id="goalIdPotentialRisk" className={potentialRiskErrors.goalId ? "border-destructive" : ""}>
                        <SelectValue placeholder="Pilih sasaran" />
                        </SelectTrigger>
                        <SelectContent>
                        {allGoals.length > 0 ? (
                            allGoals.map(goal => (
                            <SelectItem key={goal.id} value={goal.id}>{(goal.code || '[Tanpa Kode]') + ' - ' + goal.name}</SelectItem>
                            ))
                        ) : (
                            <SelectItem value="no-goals" disabled>Tidak ada sasaran di UPR/Periode ini. Harap buat sasaran terlebih dahulu.</SelectItem>
                        )}
                        </SelectContent>
                    </Select>
                )}
              />
              {potentialRiskErrors.goalId && <p className="text-xs text-destructive mt-1">{potentialRiskErrors.goalId.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="descriptionPotentialRisk">Deskripsi Potensi Risiko</Label>
              <Textarea
                id="descriptionPotentialRisk"
                {...registerPotentialRisk("description")}
                className={potentialRiskErrors.description ? "border-destructive" : ""}
                rows={3}
                placeholder="Jelaskan potensi risiko..."
                disabled={isSavingPR}
              />
              {potentialRiskErrors.description && <p className="text-xs text-destructive mt-1">{potentialRiskErrors.description.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label htmlFor="categoryPotentialRisk">Kategori Risiko</Label>
                    <Controller
                        name="category"
                        control={potentialRiskControl}
                        render={({ field }) => (
                            <Select
                                value={field.value || NO_CATEGORY_SENTINEL}
                                onValueChange={(value) => field.onChange(value === NO_CATEGORY_SENTINEL ? null : value as RiskCategory)}
                                disabled={isSavingPR}
                            >
                                <SelectTrigger id="categoryPotentialRisk" className={potentialRiskErrors.category ? "border-destructive" : ""}>
                                <SelectValue placeholder="Pilih kategori (opsional)" />
                                </SelectTrigger>
                                <SelectContent>
                                <SelectItem value={NO_CATEGORY_SENTINEL}>_Tanpa Kategori_</SelectItem>
                                {RISK_CATEGORIES.map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {potentialRiskErrors.category && <p className="text-xs text-destructive mt-1">{potentialRiskErrors.category.message}</p>}
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="ownerPotentialRisk">Pemilik Risiko (Opsional)</Label>
                    <Input
                    id="ownerPotentialRisk"
                    {...registerPotentialRisk("owner")}
                    placeholder="Contoh: Kepala Operasional, Departemen TI"
                    className={potentialRiskErrors.owner ? "border-destructive" : ""}
                    disabled={isSavingPR}
                    />
                    {potentialRiskErrors.owner && <p className="text-xs text-destructive mt-1">{potentialRiskErrors.owner.message}</p>}
                </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSavingPR || (allGoals.length === 0 && isCreatingNew) || !currentUser}>
                {isSavingPR ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isCreatingNew ? "Buat Potensi Risiko" : "Simpan Perubahan"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {!isCreatingNew && currentPotentialRisk && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div className="flex-grow">
                    <CardTitle>Penyebab Risiko untuk: ({potentialRiskCode})</CardTitle>
                    <CardDescription className="mt-1 line-clamp-2" title={currentPotentialRisk.description}>{currentPotentialRisk.description}</CardDescription>
                </div>
                 <div className="flex items-center gap-2 flex-shrink-0">
                     <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsBrainstormCausesContextModalOpen(true)}
                        disabled={!currentPotentialRisk || !parentGoalForDisplay || !currentUser || store.riskCausesLoading}
                        className="text-xs h-8"
                    >
                        {store.riskCausesLoading ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <Wand2 className="mr-1.5 h-3 w-3" />}
                         Brainstorm Penyebab (AI)
                    </Button>
                     <div className="flex items-center space-x-1 border p-0.5 rounded-md">
                        <Button
                            variant={causeViewMode === 'table' ? 'secondary' : 'ghost'}
                            size="icon"
                            onClick={() => setCauseViewMode('table')}
                            aria-label="Tampilan Tabel Penyebab"
                            className="h-7 w-7"
                            disabled={store.riskCausesLoading}
                        >
                            <List className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={causeViewMode === 'card' ? 'secondary' : 'ghost'}
                            size="icon"
                            onClick={() => setCauseViewMode('card')}
                            aria-label="Tampilan Kartu Penyebab"
                            className="h-7 w-7" 
                            disabled={store.riskCausesLoading}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmitRiskCause(onRiskCauseSubmit)} className="space-y-4 border p-4 rounded-md shadow">
                <h3 className="text-lg font-semibold">Tambah Penyebab Baru (Manual)</h3>
                <div className="space-y-1.5">
                  <Label htmlFor="causeDescription">Deskripsi Penyebab</Label>
                  <Textarea
                    id="causeDescription"
                    {...registerRiskCause("causeDescription")}
                    className={riskCauseErrors.causeDescription ? "border-destructive" : ""}
                    rows={2}
                    placeholder="Jelaskan penyebab spesifik..."
                    disabled={isAddingCause}
                  />
                  {riskCauseErrors.causeDescription && <p className="text-xs text-destructive mt-1">{riskCauseErrors.causeDescription.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="causeSource">Sumber Penyebab</Label>
                  <Controller
                    name="causeSource"
                    control={riskCauseControl}
                    defaultValue="Internal"
                    render={({ field }) => (
                        <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={isAddingCause}
                        >
                            <SelectTrigger id="causeSource" className={riskCauseErrors.causeSource ? "border-destructive" : ""}>
                            <SelectValue placeholder="Pilih sumber" />
                            </SelectTrigger>
                            <SelectContent>
                            {RISK_SOURCES.map(src => (
                                <SelectItem key={src} value={src}>{src}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                    )}
                  />
                  {riskCauseErrors.causeSource && <p className="text-xs text-destructive mt-1">{riskCauseErrors.causeSource.message}</p>}
                </div>
                <Button type="submit" disabled={isAddingCause || !currentUser} size="sm">
                  {isAddingCause ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                  Tambah Penyebab (Manual)
                </Button>
              </form>

              <div>
                <h3 className="text-lg font-semibold mb-2">Penyebab yang Ada ({displayedRiskCauses.length})</h3>
                {(store.riskCausesLoading && displayedRiskCauses.length === 0 && currentPotentialRisk) && <div className="flex items-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Memuat penyebab risiko...</div>}
                
                {(!store.riskCausesLoading || (currentPotentialRisk && displayedRiskCauses.length > 0) ) && displayedRiskCauses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada penyebab yang teridentifikasi untuk potensi risiko ini.</p>
                ) : causeViewMode === 'table' ? (
                  <div className="border rounded-md overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">Kode PC</TableHead>
                          <TableHead className="min-w-[250px]">Deskripsi</TableHead>
                          <TableHead className="min-w-[100px]">Sumber</TableHead>
                          <TableHead className="min-w-[150px]">KRI</TableHead>
                          <TableHead className="min-w-[150px]">Toleransi</TableHead>
                          <TableHead className="min-w-[150px]">Tingkat Risiko</TableHead>
                          <TableHead className="text-right min-w-[100px]">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayedRiskCauses.map(cause => {
                            const {level: causeRiskLevelText, score: causeRiskScore} = getCalculatedRiskLevel(cause.likelihood, cause.impact);
                            const returnPathAnalysis = `/all-risks/manage/${currentPotentialRisk.id}?from=${encodeURIComponent(returnPath)}`;
                            const causeDisplayCode = `PC${cause.sequenceNumber || '?'}`;
                            return (
                              <TableRow key={cause.id}>
                                <TableCell className="font-mono text-xs">{causeDisplayCode}</TableCell>
                                <TableCell className="text-xs max-w-sm truncate" title={cause.description}>{cause.description}</TableCell>
                                <TableCell><Badge variant="outline" className="text-xs">{cause.source}</Badge></TableCell>
                                <TableCell className="text-xs max-w-[150px] truncate" title={cause.keyRiskIndicator || ''}>{cause.keyRiskIndicator || '-'}</TableCell>
                                <TableCell className="text-xs max-w-[150px] truncate" title={cause.riskTolerance || ''}>{cause.riskTolerance || '-'}</TableCell>
                                <TableCell>
                                   <Badge className={`${getRiskLevelColor(causeRiskLevelText as CalculatedRiskLevelCategory)} text-xs`}>
                                      {causeRiskLevelText === 'N/A' ? 'N/A' : `${causeRiskLevelText} (${causeRiskScore ?? 'N/A'})`}
                                   </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7">
                                        <Settings2 className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem asChild>
                                        <Link href={`/risk-cause-analysis/${cause.id}?from=${encodeURIComponent(returnPathAnalysis)}`}>
                                          <BarChart3 className="mr-2 h-4 w-4" />
                                          Analisis Detail
                                        </Link>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleOpenDeleteCauseAlert(cause)}
                                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                        disabled={!currentUser}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Hapus
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : ( 
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {displayedRiskCauses.map(cause => (
                      <RiskCauseCardItem
                        key={cause.id}
                        riskCause={cause}
                        potentialRiskFullCode={potentialRiskCode} 
                        returnPath={`/all-risks/manage/${currentPotentialRisk.id}?from=${encodeURIComponent(returnPath)}`}
                        canDelete={!!currentUser}
                        onDeleteClick={() => handleOpenDeleteCauseAlert(cause)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
      {currentPotentialRisk && parentGoalForDisplay && isBrainstormCausesContextModalOpen && (
        <BrainstormContextModal
            isOpen={isBrainstormCausesContextModalOpen}
            onOpenChange={setIsBrainstormCausesContextModalOpen}
            potentialRisk={currentPotentialRisk}
            goalDescription={parentGoalForDisplay.description} 
            onSuggestionsReady={handleAISuggestionsReady}
        />
      )}
      {isBrainstormCausesSuggestionsModalOpen && currentPotentialRisk && (
        <BrainstormSuggestionsModal
            isOpen={isBrainstormCausesSuggestionsModalOpen}
            onOpenChange={setIsBrainstormCausesSuggestionsModalOpen}
            suggestions={aiCauseSuggestions}
            onSaveSelectedCauses={handleSaveAISelectedCauses} 
        />
      )}
      <AlertDialog open={isDeleteCauseAlertOpen} onOpenChange={setIsDeleteCauseAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus Penyebab</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus penyebab "{causeToDelete?.description}" (PC{causeToDelete?.sequenceNumber || '?'})? Semua rencana pengendalian terkait juga akan dihapus. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setIsDeleteCauseAlertOpen(false); setCauseToDelete(null); }}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRiskCauseSubmit} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
