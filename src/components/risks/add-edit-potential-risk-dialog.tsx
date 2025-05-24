
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PotentialRisk, Goal, RiskCategory } from '@/lib/types';
import { RISK_CATEGORIES } from '@/lib/types';
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PlusCircle, Edit } from 'lucide-react';

const potentialRiskSchema = z.object({
  description: z.string().min(10, "Potential risk description must be at least 10 characters long."),
  goalId: z.string().min(1, "A goal must be selected."),
  category: z.custom<RiskCategory>().nullable().refine(val => val === null || RISK_CATEGORIES.includes(val), {
    message: "Invalid risk category.",
  }),
  owner: z.string().nullable(),
});

type PotentialRiskFormData = z.infer<typeof potentialRiskSchema>;

interface AddEditPotentialRiskDialogProps {
  goals: Goal[];
  onPotentialRiskSave: (potentialRisk: PotentialRisk, isNew: boolean) => void;
  existingPotentialRisk?: PotentialRisk | null;
  triggerButton?: React.ReactNode;
  defaultGoalId?: string;
  currentUprId: string;
  currentPeriod: string;
}

const NO_CATEGORY_SENTINEL = "__NONE__"; // Sentinel value for "No Category"

export function AddEditPotentialRiskDialog({ 
  goals, 
  onPotentialRiskSave, 
  existingPotentialRisk, 
  triggerButton, 
  defaultGoalId,
  currentUprId, 
  currentPeriod 
}: AddEditPotentialRiskDialogProps) {
  const [open, setOpen] = useState(false);
  const isEditing = !!existingPotentialRisk;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control, // for Select component
    formState: { errors, isSubmitting },
  } = useForm<PotentialRiskFormData>({
    resolver: zodResolver(potentialRiskSchema),
    defaultValues: {
      description: "",
      goalId: "",
      category: null,
      owner: "",
    },
  });

  const selectedGoalId = watch("goalId");
  const selectedCategory = watch("category");

  useEffect(() => {
    if (open) {
      if (existingPotentialRisk) {
        reset({
          description: existingPotentialRisk.description,
          goalId: existingPotentialRisk.goalId,
          category: existingPotentialRisk.category,
          owner: existingPotentialRisk.owner || "",
        });
      } else {
        reset({
          description: "",
          goalId: defaultGoalId || (goals.length > 0 ? goals[0].id : ""),
          category: null,
          owner: "",
        });
      }
    }
  }, [existingPotentialRisk, open, reset, defaultGoalId, goals]);

  const onSubmit: SubmitHandler<PotentialRiskFormData> = (data) => {
    const parentGoal = goals.find(g => g.id === data.goalId);
    if (!parentGoal || parentGoal.uprId !== currentUprId || parentGoal.period !== currentPeriod) {
      console.error("Selected parent goal not found or not in current UPR/Period context.");
      return; 
    }

    const potentialRiskData: PotentialRisk = {
      id: existingPotentialRisk?.id || `prisk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      goalId: data.goalId,
      description: data.description,
      category: data.category, // This will be null if "_No Category_" was selected
      owner: data.owner || null, // Ensure owner is null if empty string
      likelihood: existingPotentialRisk?.likelihood || null,
      impact: existingPotentialRisk?.impact || null,
      identifiedAt: existingPotentialRisk?.identifiedAt || new Date().toISOString(),
      analysisCompletedAt: existingPotentialRisk?.analysisCompletedAt,
    };
    onPotentialRiskSave(potentialRiskData, !isEditing);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton ? (
          React.cloneElement(triggerButton as React.ReactElement, { onClick: () => setOpen(true) })
        ) : (
          <Button>
            {isEditing ? <Edit className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            {isEditing ? "Edit Potential Risk" : "Add New Potential Risk"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Potential Risk" : "Add New Potential Risk"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the details of this potential risk." : "Define a new potential risk and associate it with a goal."}
            {` For UPR: ${currentUprId}, Period: ${currentPeriod}`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="goalIdPotentialRisk">Associated Goal</Label>
            <Select
              value={selectedGoalId}
              onValueChange={(value) => setValue("goalId", value, { shouldValidate: true })}
              disabled={goals.length === 0}
            >
              <SelectTrigger id="goalIdPotentialRisk" className={errors.goalId ? "border-destructive" : ""}>
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
            {errors.goalId && <p className="text-xs text-destructive mt-1">{errors.goalId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="descriptionPotentialRisk">Potential Risk Description</Label>
            <Textarea
              id="descriptionPotentialRisk"
              {...register("description")}
              className={errors.description ? "border-destructive" : ""}
              rows={3}
              placeholder="Describe the potential risk..."
            />
            {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="categoryPotentialRisk">Risk Category</Label>
            <Select
              value={selectedCategory || ""} // If selectedCategory is null, Select value is "", showing placeholder
              onValueChange={(value) => {
                if (value === NO_CATEGORY_SENTINEL) {
                  setValue("category", null, { shouldValidate: true });
                } else {
                  setValue("category", value as RiskCategory, { shouldValidate: true });
                }
              }}
            >
              <SelectTrigger id="categoryPotentialRisk" className={errors.category ? "border-destructive" : ""}>
                <SelectValue placeholder="Select category (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CATEGORY_SENTINEL}>_No Category_</SelectItem>
                {RISK_CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && <p className="text-xs text-destructive mt-1">{errors.category.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ownerPotentialRisk">Risk Owner (Optional)</Label>
            <Input
              id="ownerPotentialRisk"
              {...register("owner")}
              placeholder="e.g., Head of Operations, IT Department"
              className={errors.owner ? "border-destructive" : ""}
            />
            {errors.owner && <p className="text-xs text-destructive mt-1">{errors.owner.message}</p>}
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || (goals.length === 0 && !isEditing) }>
              {isSubmitting ? "Saving..." : (isEditing ? "Save Changes" : "Add Potential Risk")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
