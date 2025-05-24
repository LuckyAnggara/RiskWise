
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
import type { Goal } from '@/lib/types';
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PlusCircle, Pencil } from 'lucide-react';

const goalSchema = z.object({
  name: z.string().min(3, "Goal name must be at least 3 characters long."),
  description: z.string().min(10, "Description must be at least 10 characters long."),
});

type GoalFormData = z.infer<typeof goalSchema>;

interface AddGoalDialogProps {
  onGoalSave: (goal: Goal) => void;
  existingGoal?: Goal | null;
  triggerButton?: React.ReactNode;
  currentUprId: string; // Now passed as prop
  currentPeriod: string; // Now passed as prop
}

export function AddGoalDialog({ onGoalSave, existingGoal, triggerButton, currentUprId, currentPeriod }: AddGoalDialogProps) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  useEffect(() => {
    if (open) { // Reset form when dialog opens or existingGoal changes while open
      if (existingGoal) {
        reset({
          name: existingGoal.name,
          description: existingGoal.description,
        });
      } else {
        reset({ name: "", description: "" });
      }
    }
  }, [existingGoal, open, reset]);

  const onSubmit: SubmitHandler<GoalFormData> = (data) => {
    const newGoal: Goal = {
      id: existingGoal?.id || `goal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ...data,
      createdAt: existingGoal?.createdAt || new Date().toISOString(),
      uprId: currentUprId, // Use passed prop
      period: currentPeriod, // Use passed prop
    };
    onGoalSave(newGoal);
    setOpen(false);
    // reset(); // Reset is handled by useEffect on 'open' state change now
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) { // Ensure reset when dialog is closed externally too
        if (existingGoal) {
          reset({name: existingGoal.name, description: existingGoal.description});
        } else {
          reset({name: "", description: ""});
        }
      }
    }}>
      <DialogTrigger asChild>
        {triggerButton ? (
          React.cloneElement(triggerButton as React.ReactElement, { onClick: () => setOpen(true) })
        ) : (
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> {existingGoal ? "Edit Goal" : "Add New Goal"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{existingGoal ? "Edit Goal" : "Add New Goal"}</DialogTitle>
          <DialogDescription>
            {existingGoal ? "Update the details of your goal." : "Define a new goal to start managing its risks."}
            {` For UPR: ${currentUprId}, Period: ${currentPeriod}`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <div className="col-span-3">
              <Input
                id="name"
                {...register("name")}
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <div className="col-span-3">
              <Textarea
                id="description"
                {...register("description")}
                className={errors.description ? "border-destructive" : ""}
              />
              {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
