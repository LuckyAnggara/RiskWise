
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { PotentialRisk, Goal, RiskCategory, RiskCause, RiskSource } from '@/lib/types';
import { RISK_CATEGORIES, RISK_SOURCES } from '@/lib/types';
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, PlusCircle, Trash2, Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUprId, getCurrentPeriod, initializeAppContext } from '@/lib/upr-period-context';
import { Separator } from '@/components/ui/separator';

const potentialRiskFormSchema = z.object({
  description: z.string().min(10, "Potential risk description must be at least 10 characters long."),
  goalId: z.string().min(1, "A goal must be selected."),
  category: z.custom<RiskCategory>().nullable().refine(val => val === null || RISK_CATEGORIES.includes(val), {
    message: "Invalid risk category.",
  }),
  owner: z.string().nullable(),
});

type PotentialRiskFormData = z.infer<typeof potentialRiskFormSchema>;

const riskCauseFormSchema = z.object({
  causeDescription: z.string().min(5, "Cause description must be at least 5 characters."),
  causeSource: z.custom<RiskSource>().refine(val => RISK_SOURCES.includes(val), {
    message: "A source must be selected.",
  }),
});
type RiskCauseFormData = z.infer<typeof riskCauseFormSchema>;

const NO_CATEGORY_SENTINEL = "__NONE__";

const getGoalsStorageKey = (uprId: string, period: string) => `riskwise-upr${uprId}-period${period}-goals`;
const getPotentialRisksStorageKeyForGoal = (uprId: string, period: string, goalId: string) => `riskwise-upr${uprId}-period${period}-goal${goalId}-potentialRisks`;
const getRiskCausesStorageKey = (uprId: string, period: string, potentialRiskId: string) => `riskwise-upr${uprId}-period${period}-potentialRisk${potentialRiskId}-causes`;

export default function ManagePotentialRiskPage() {
  const router = useRouter();
  const params = useParams();
  const potentialRiskIdParam = params.potentialRiskId as string;
  const isCreatingNew = potentialRiskIdParam === 'new';

  const [currentUprId, setCurrentUprId] = useState('');
  const [currentPeriod, setCurrentPeriod] = useState('');
  
  const [pageIsLoading, setPageIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [currentPotentialRisk, setCurrentPotentialRisk] = useState<PotentialRisk | null>(null);
  const [riskCauses, setRiskCauses] = useState<RiskCause[]>([]);

  const { toast } = useToast();

  const {
    register: registerPotentialRisk,
    handleSubmit: handleSubmitPotentialRisk,
    reset: resetPotentialRiskForm,
    setValue: setPotentialRiskValue,
    control: potentialRiskControl, // for Select component
    formState: { errors: potentialRiskErrors },
  } = useForm<PotentialRiskFormData>({
    resolver: zodResolver(potentialRiskFormSchema),
    defaultValues: { description: "", goalId: "", category: null, owner: "" },
  });

  const {
    register: registerRiskCause,
    handleSubmit: handleSubmitRiskCause,
    reset: resetRiskCauseForm,
    setValue: setRiskCauseValue,
    formState: { errors: riskCauseErrors, isSubmitting: isAddingCause },
  } = useForm<RiskCauseFormData>({
    resolver: zodResolver(riskCauseFormSchema),
    defaultValues: { causeDescription: "", causeSource: "Internal" },
  });

  const loadAllGoals = useCallback((uprId: string, period: string) => {
    const goalsStorageKey = getGoalsStorageKey(uprId, period);
    const storedGoalsData = localStorage.getItem(goalsStorageKey);
    const loadedGoals: Goal[] = storedGoalsData ? JSON.parse(storedGoalsData) : [];
    setGoals(loadedGoals);
    if (loadedGoals.length > 0 && isCreatingNew) {
        setPotentialRiskValue("goalId", loadedGoals[0].id);
    }
    return loadedGoals;
  }, [isCreatingNew, setPotentialRiskValue]);

  const loadPotentialRiskAndCauses = useCallback(async (uprId: string, period: string, allGoals: Goal[]) => {
    if (isCreatingNew) {
      setCurrentPotentialRisk(null);
      setRiskCauses([]);
      resetPotentialRiskForm({ description: "", goalId: allGoals.length > 0 ? allGoals[0].id : "", category: null, owner: "" });
      setPageIsLoading(false);
      return;
    }

    // Find the potential risk across all goals for the current UPR/Period
    let foundPotentialRisk: PotentialRisk | null = null;
    let parentGoalForRisk: Goal | null = null;

    for (const goal of allGoals) {
        const potentialRisksStorageKey = getPotentialRisksStorageKeyForGoal(goal.uprId, goal.period, goal.id);
        const storedPotentialRisksData = localStorage.getItem(potentialRisksStorageKey);
        if (storedPotentialRisksData) {
            const goalPotentialRisks: PotentialRisk[] = JSON.parse(storedPotentialRisksData);
            const risk = goalPotentialRisks.find(pr => pr.id === potentialRiskIdParam);
            if (risk) {
                foundPotentialRisk = risk;
                parentGoalForRisk = goal;
                break;
            }
        }
    }
    
    setCurrentPotentialRisk(foundPotentialRisk);

    if (foundPotentialRisk && parentGoalForRisk) {
      resetPotentialRiskForm({
        description: foundPotentialRisk.description,
        goalId: foundPotentialRisk.goalId,
        category: foundPotentialRisk.category,
        owner: foundPotentialRisk.owner || "",
      });
      const causesStorageKey = getRiskCausesStorageKey(parentGoalForRisk.uprId, parentGoalForRisk.period, foundPotentialRisk.id);
      const storedCausesData = localStorage.getItem(causesStorageKey);
      setRiskCauses(storedCausesData ? JSON.parse(storedCausesData) : []);
    } else if (!isCreatingNew) {
      toast({ title: "Error", description: "Potential Risk not found.", variant: "destructive" });
      router.push('/all-risks'); // Redirect if risk not found for editing
    }
    setPageIsLoading(false);
  }, [isCreatingNew, potentialRiskIdParam, resetPotentialRiskForm, router, toast]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const context = initializeAppContext();
      setCurrentUprId(context.uprId);
      setCurrentPeriod(context.period);
      setPageIsLoading(true);
      const loadedGoals = loadAllGoals(context.uprId, context.period);
      loadPotentialRiskAndCauses(context.uprId, context.period, loadedGoals);
    }
  }, [loadAllGoals, loadPotentialRiskAndCauses]);


  const onPotentialRiskSubmit: SubmitHandler<PotentialRiskFormData> = async (data) => {
    setIsSaving(true);
    const parentGoal = goals.find(g => g.id === data.goalId);
    if (!parentGoal || parentGoal.uprId !== currentUprId || parentGoal.period !== currentPeriod) {
      toast({ title: "Error", description: "Selected parent goal not valid for current UPR/Period.", variant: "destructive" });
      setIsSaving(false);
      return;
    }

    let pRiskToSave: PotentialRisk;
    let successMessage = "";

    if (isCreatingNew) {
      pRiskToSave = {
        id: `prisk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        goalId: data.goalId,
        description: data.description,
        category: data.category === NO_CATEGORY_SENTINEL ? null : data.category,
        owner: data.owner || null,
        likelihood: null,
        impact: null,
        identifiedAt: new Date().toISOString(),
      };
      successMessage = `Potential Risk "${pRiskToSave.description}" created. You can now add its causes.`;

      const goalPotentialRisksKey = getPotentialRisksStorageKeyForGoal(parentGoal.uprId, parentGoal.period, parentGoal.id);
      const storedPotentialRisks = localStorage.getItem(goalPotentialRisksKey);
      const currentGoalPotentialRisks: PotentialRisk[] = storedPotentialRisks ? JSON.parse(storedPotentialRisks) : [];
      currentGoalPotentialRisks.push(pRiskToSave);
      localStorage.setItem(goalPotentialRisksKey, JSON.stringify(currentGoalPotentialRisks.sort((a,b)=>a.description.localeCompare(b.description))));
      
      // Update currentPotentialRisk state and navigate to edit mode for the new risk
      setCurrentPotentialRisk(pRiskToSave);
      router.replace(`/all-risks/manage/${pRiskToSave.id}`); // Change URL to edit mode without adding to history

    } else if (currentPotentialRisk) {
      // Editing existing
      pRiskToSave = {
        ...currentPotentialRisk,
        description: data.description,
        category: data.category === NO_CATEGORY_SENTINEL ? null : data.category,
        owner: data.owner || null,
        // goalId change needs careful handling if we allow it:
        // - remove from old goal's list, add to new goal's list.
        // - For now, let's assume goalId doesn't change in edit or handle simply.
        // - If goalId changes, causes and controls would need to be "moved" (conceptually their storage keys depend on goal context).
        // - Simpler: if goalId changes, delete old record and create new.
        // - Best for now: If goalId is part of the form, and it changes, we must update the storage for BOTH old and new goal.
      };

      if (currentPotentialRisk.goalId !== data.goalId) {
        // Remove from old goal's list
        const oldParentGoal = goals.find(g => g.id === currentPotentialRisk.goalId);
        if (oldParentGoal) {
            const oldGoalPRKey = getPotentialRisksStorageKeyForGoal(oldParentGoal.uprId, oldParentGoal.period, oldParentGoal.id);
            let oldGoalPRs: PotentialRisk[] = JSON.parse(localStorage.getItem(oldGoalPRKey) || '[]');
            oldGoalPRs = oldGoalPRs.filter(pr => pr.id !== currentPotentialRisk.id);
            localStorage.setItem(oldGoalPRKey, JSON.stringify(oldGoalPRs));
        }
        // Add to new goal's list
        const newGoalPRKey = getPotentialRisksStorageKeyForGoal(parentGoal.uprId, parentGoal.period, data.goalId);
        let newGoalPRs: PotentialRisk[] = JSON.parse(localStorage.getItem(newGoalPRKey) || '[]');
        newGoalPRs.push({...pRiskToSave, goalId: data.goalId}); // ensure goalId is updated
        localStorage.setItem(newGoalPRKey, JSON.stringify(newGoalPRs.sort((a,b)=>a.description.localeCompare(b.description))));
        pRiskToSave.goalId = data.goalId; // Update the pRiskToSave object itself
      } else {
        // GoalId hasn't changed, just update in its current list
        const goalPotentialRisksKey = getPotentialRisksStorageKeyForGoal(parentGoal.uprId, parentGoal.period, parentGoal.id);
        const storedPotentialRisks = localStorage.getItem(goalPotentialRisksKey);
        let currentGoalPotentialRisks: PotentialRisk[] = storedPotentialRisks ? JSON.parse(storedPotentialRisks) : [];
        currentGoalPotentialRisks = currentGoalPotentialRisks.map(pr => pr.id === pRiskToSave.id ? pRiskToSave : pr);
        localStorage.setItem(goalPotentialRisksKey, JSON.stringify(currentGoalPotentialRisks.sort((a,b)=>a.description.localeCompare(b.description))));
      }
      setCurrentPotentialRisk(pRiskToSave); // Update local state
      successMessage = `Potential Risk "${pRiskToSave.description}" updated.`;
    } else {
      toast({ title: "Error", description: "Cannot save. Potential risk data is missing.", variant: "destructive" });
      setIsSaving(false);
      return;
    }
    
    toast({ title: "Success", description: successMessage });
    setIsSaving(false);
  };

  const onRiskCauseSubmit: SubmitHandler<RiskCauseFormData> = (data) => {
    if (!currentPotentialRisk || !currentUprId || !currentPeriod) {
        toast({ title: "Error", description: "Cannot add cause. Parent potential risk context is missing.", variant: "destructive" });
        return;
    }
    const parentPotentialRiskGoal = goals.find(g => g.id === currentPotentialRisk.goalId);
     if (!parentPotentialRiskGoal) {
        toast({ title: "Error", description: "Cannot add cause. Parent goal for potential risk not found.", variant: "destructive" });
        return;
    }


    const newCause: RiskCause = {
      id: `rcause_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      potentialRiskId: currentPotentialRisk.id,
      description: data.causeDescription,
      source: data.causeSource,
      createdAt: new Date().toISOString(),
    };
    const updatedCauses = [...riskCauses, newCause];
    setRiskCauses(updatedCauses);
    localStorage.setItem(getRiskCausesStorageKey(parentPotentialRiskGoal.uprId, parentPotentialRiskGoal.period, currentPotentialRisk.id), JSON.stringify(updatedCauses));
    toast({ title: "Risk Cause Added", description: `Cause "${newCause.description}" added.` });
    resetRiskCauseForm();
  };

  const handleDeleteRiskCause = (causeId: string) => {
    if (!currentPotentialRisk || !currentUprId || !currentPeriod) return;
    const parentPotentialRiskGoal = goals.find(g => g.id === currentPotentialRisk.goalId);
    if (!parentPotentialRiskGoal) return;

    const causeToDelete = riskCauses.find(c => c.id === causeId);
    if (!causeToDelete) return;
    const updatedCauses = riskCauses.filter(c => c.id !== causeId);
    setRiskCauses(updatedCauses);
    localStorage.setItem(getRiskCausesStorageKey(parentPotentialRiskGoal.uprId, parentPotentialRiskGoal.period, currentPotentialRisk.id), JSON.stringify(updatedCauses));
    toast({ title: "Risk Cause Deleted", description: `Cause "${causeToDelete.description}" deleted.`, variant: "destructive" });
  };

  if (pageIsLoading || !currentUprId || !currentPeriod) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Loading potential risk data...</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <PageHeader
        title={isCreatingNew ? "Add New Potential Risk" : "Edit Potential Risk"}
        description={`Manage the details and causes for a potential risk. UPR: ${currentUprId}, Period: ${currentPeriod}.`}
        actions={
          <Button onClick={() => router.push('/all-risks')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Risks
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Potential Risk Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitPotentialRisk(onPotentialRiskSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="goalIdPotentialRisk">Associated Goal</Label>
              <Controller
                name="goalId"
                control={potentialRiskControl}
                render={({ field }) => (
                    <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={goals.length === 0 || isSaving}
                    >
                        <SelectTrigger id="goalIdPotentialRisk" className={potentialRiskErrors.goalId ? "border-destructive" : ""}>
                        <SelectValue placeholder="Select a goal" />
                        </SelectTrigger>
                        <SelectContent>
                        {goals.length > 0 ? (
                            goals.map(goal => (
                            <SelectItem key={goal.id} value={goal.id}>{goal.name}</SelectItem>
                            ))
                        ) : (
                            <SelectItem value="no-goals" disabled>No goals in this UPR/Period.</SelectItem>
                        )}
                        </SelectContent>
                    </Select>
                )}
              />
              {potentialRiskErrors.goalId && <p className="text-xs text-destructive mt-1">{potentialRiskErrors.goalId.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="descriptionPotentialRisk">Potential Risk Description</Label>
              <Textarea
                id="descriptionPotentialRisk"
                {...registerPotentialRisk("description")}
                className={potentialRiskErrors.description ? "border-destructive" : ""}
                rows={3}
                placeholder="Describe the potential risk..."
                disabled={isSaving}
              />
              {potentialRiskErrors.description && <p className="text-xs text-destructive mt-1">{potentialRiskErrors.description.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label htmlFor="categoryPotentialRisk">Risk Category</Label>
                    <Controller
                        name="category"
                        control={potentialRiskControl}
                        render={({ field }) => (
                            <Select
                                value={field.value || NO_CATEGORY_SENTINEL}
                                onValueChange={(value) => field.onChange(value === NO_CATEGORY_SENTINEL ? null : value as RiskCategory)}
                                disabled={isSaving}
                            >
                                <SelectTrigger id="categoryPotentialRisk" className={potentialRiskErrors.category ? "border-destructive" : ""}>
                                <SelectValue placeholder="Select category (optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                <SelectItem value={NO_CATEGORY_SENTINEL}>_No Category_</SelectItem>
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
                    <Label htmlFor="ownerPotentialRisk">Risk Owner (Optional)</Label>
                    <Input
                    id="ownerPotentialRisk"
                    {...registerPotentialRisk("owner")}
                    placeholder="e.g., Head of Operations, IT Department"
                    className={potentialRiskErrors.owner ? "border-destructive" : ""}
                    disabled={isSaving}
                    />
                    {potentialRiskErrors.owner && <p className="text-xs text-destructive mt-1">{potentialRiskErrors.owner.message}</p>}
                </div>
            </div>
            
            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving || (goals.length === 0 && isCreatingNew)}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isCreatingNew ? "Create Potential Risk" : "Save Changes"}
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
              <CardTitle>Risk Causes for: {currentPotentialRisk.description}</CardTitle>
              <CardDescription>Identify and manage specific causes contributing to this potential risk.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmitRiskCause(onRiskCauseSubmit)} className="space-y-4 border p-4 rounded-md shadow">
                <h3 className="text-lg font-semibold">Add New Cause</h3>
                <div className="space-y-1.5">
                  <Label htmlFor="causeDescription">Cause Description</Label>
                  <Textarea
                    id="causeDescription"
                    {...registerRiskCause("causeDescription")}
                    className={riskCauseErrors.causeDescription ? "border-destructive" : ""}
                    rows={2}
                    placeholder="Describe the specific cause..."
                    disabled={isAddingCause}
                  />
                  {riskCauseErrors.causeDescription && <p className="text-xs text-destructive mt-1">{riskCauseErrors.causeDescription.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="causeSource">Source of Cause</Label>
                  <Controller
                    name="causeSource"
                    control={riskCauseFormSchema} // Should be riskCauseControl
                    defaultValue="Internal"
                    render={({ field }) => (
                        <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={isAddingCause}
                        >
                            <SelectTrigger id="causeSource" className={riskCauseErrors.causeSource ? "border-destructive" : ""}>
                            <SelectValue placeholder="Select source" />
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
                <Button type="submit" disabled={isAddingCause} size="sm">
                  {isAddingCause ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />} 
                  Add Cause
                </Button>
              </form>

              <div>
                <h3 className="text-lg font-semibold mb-2">Existing Causes ({riskCauses.length})</h3>
                {riskCauses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No causes identified yet for this potential risk.</p>
                ) : (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[60%]">Description</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {riskCauses.map(cause => (
                          <TableRow key={cause.id}>
                            <TableCell>{cause.description}</TableCell>
                            <TableCell><Badge variant="outline">{cause.source}</Badge></TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteRiskCause(cause.id)} aria-label="Delete cause">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}


    