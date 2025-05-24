
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PotentialRisk, Goal } from '@/lib/types'; // PotentialRisk
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PlusCircle, Edit } from 'lucide-react';

// This file is being replaced by add-edit-potential-risk-dialog.tsx
// This is a placeholder to avoid breaking existing imports if any, but should be removed.
// The functionality has been moved and enhanced in add-edit-potential-risk-dialog.tsx

const riskSchema = z.object({
  description: z.string().min(10, "Risk description must be at least 10 characters long."),
  goalId: z.string().min(1, "A goal must be selected."),
});

type RiskFormData = z.infer<typeof riskSchema>;

interface AddEditRiskDialogProps {
  goals: Goal[];
  onRiskSave: (risk: any, isNew: boolean) => void; // Using 'any' as this component is deprecated
  existingRisk?: any | null;
  triggerButton?: React.ReactNode;
  defaultGoalId?: string;
  currentUprId: string; 
  currentPeriod: string;
}

export function AddEditRiskDialog({ 
  goals, 
  onRiskSave, 
  existingRisk, 
  triggerButton, 
  defaultGoalId,
  currentUprId, 
  currentPeriod 
}: AddEditRiskDialogProps) {
  const [open, setOpen] = useState(false);
  const isEditing = !!existingRisk;

   const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RiskFormData>({
    resolver: zodResolver(riskSchema),
    defaultValues: {
      description: "",
      goalId: "",
    },
  });

  useEffect(() => {
    console.warn("AddEditRiskDialog is deprecated. Use AddEditPotentialRiskDialog instead.");
    if (open) {
      if (existingRisk) {
        reset({
          description: existingRisk.description,
          goalId: existingRisk.goalId,
        });
      } else {
        reset({
          description: "",
          goalId: defaultGoalId || (goals.length > 0 ? goals[0].id : ""), 
        });
      }
    }
  }, [existingRisk, open, reset, defaultGoalId, goals]);

  const onSubmit: SubmitHandler<RiskFormData> = (data) => {
    const parentGoal = goals.find(g => g.id === data.goalId);
    if (!parentGoal || parentGoal.uprId !== currentUprId || parentGoal.period !== currentPeriod) {
      return; 
    }

    const riskData = { // Simplified as this is deprecated
      id: existingRisk?.id || `risk_${Date.now()}`,
      goalId: data.goalId,
      description: data.description,
      identifiedAt: existingRisk?.identifiedAt || new Date().toISOString(),
    };
    onRiskSave(riskData, !isEditing);
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
            {isEditing ? "Edit Risk (Deprecated)" : "Add New Risk (Deprecated)"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Risk (Deprecated)" : "Add New Risk (Deprecated)"}</DialogTitle>
          <DialogDescription>
            This component is deprecated. Please use the new Potential Risk dialog.
            {` For UPR: ${currentUprId}, Period: ${currentPeriod}`}
          </DialogDescription>
        </DialogHeader>
         <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="goalId">Associated Goal</Label>
            <Select
              value={watch("goalId")}
              onValueChange={(value) => setValue("goalId", value, { shouldValidate: true })}
              disabled={goals.length === 0}
            >
              <SelectTrigger id="goalId" className={errors.goalId ? "border-destructive" : ""}>
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
            <Label htmlFor="description">Risk Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              className={errors.description ? "border-destructive" : ""}
              rows={3}
              placeholder="Describe the potential risk..."
            />
            {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || (goals.length === 0 && !isEditing) }>
              {isSubmitting ? "Saving..." : (isEditing ? "Save Changes" : "Add Risk")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
