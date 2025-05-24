
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
import type { Risk, Goal } from '@/lib/types';
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PlusCircle, Edit } from 'lucide-react';

const riskSchema = z.object({
  description: z.string().min(10, "Risk description must be at least 10 characters long."),
  goalId: z.string().min(1, "A goal must be selected."),
});

type RiskFormData = z.infer<typeof riskSchema>;

interface AddEditRiskDialogProps {
  goals: Goal[]; // These should already be filtered for the current UPR/Period by the parent
  onRiskSave: (risk: Risk, isEditing: boolean) => void;
  existingRisk?: Risk | null;
  triggerButton?: React.ReactNode;
  defaultGoalId?: string;
  currentUprId: string; // Passed to confirm context
  currentPeriod: string; // Passed to confirm context
}

export function AddEditRiskDialog({ goals, onRiskSave, existingRisk, triggerButton, defaultGoalId, currentUprId, currentPeriod }: AddEditRiskDialogProps) {
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

  const selectedGoalId = watch("goalId");

  useEffect(() => {
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
    if (!parentGoal) {
      // This should ideally not happen if goals are correctly filtered
      console.error("Selected parent goal not found or not in current context.");
      return; 
    }
    // Double-check context, though parentGoal should already be from current context
    if(parentGoal.uprId !== currentUprId || parentGoal.period !== currentPeriod) {
        console.error("Attempting to save risk to a goal outside the current UPR/Period context.");
        return;
    }

    const riskData: Risk = {
      id: existingRisk?.id || `risk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      goalId: data.goalId, // This goal inherently has the uprId and period
      description: data.description,
      likelihood: existingRisk?.likelihood || null,
      impact: existingRisk?.impact || null,
      identifiedAt: existingRisk?.identifiedAt || new Date().toISOString(),
      analysisCompletedAt: existingRisk?.analysisCompletedAt,
    };
    onRiskSave(riskData, isEditing);
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
            {isEditing ? "Edit Risk" : "Add New Risk"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Risk" : "Add New Risk"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the details of this risk." : "Define a new risk and associate it with a goal."}
            {` For UPR: ${currentUprId}, Period: ${currentPeriod}`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="goalId">Associated Goal</Label>
            <Select
              value={selectedGoalId}
              onValueChange={(value) => setValue("goalId", value, { shouldValidate: true })}
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
                  <SelectItem value="no-goals" disabled>No goals available in this UPR/Period. Create a goal first.</SelectItem>
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
