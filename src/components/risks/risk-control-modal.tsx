
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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Control, PotentialRisk } from '@/lib/types';
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const controlSchema = z.object({
  description: z.string().min(5, "Control description must be at least 5 characters."),
  effectiveness: z.enum(['Low', 'Medium', 'High']),
  status: z.enum(['Planned', 'In Progress', 'Implemented', 'Ineffective']),
});

type ControlFormData = z.infer<typeof controlSchema>;

interface RiskControlModalProps {
  potentialRisk: PotentialRisk | null; // Changed from Risk to PotentialRisk
  existingControl?: Control | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (control: Control) => void;
}

export function RiskControlModal({ potentialRisk, existingControl, isOpen, onOpenChange, onSave }: RiskControlModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ControlFormData>({
    resolver: zodResolver(controlSchema),
    defaultValues: {
      description: existingControl?.description || "",
      effectiveness: existingControl?.effectiveness || 'Medium',
      status: existingControl?.status || 'Planned',
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (existingControl) {
        reset({
          description: existingControl.description,
          effectiveness: existingControl.effectiveness || 'Medium',
          status: existingControl.status || 'Planned',
        });
      } else {
        reset({ description: "", effectiveness: 'Medium', status: 'Planned' });
      }
    }
  }, [existingControl, reset, isOpen]);

  const onSubmit: SubmitHandler<ControlFormData> = (data) => {
    if (!potentialRisk) return;

    const newControl: Control = {
      id: existingControl?.id || `ctrl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      potentialRiskId: potentialRisk.id, // Updated to potentialRiskId
      description: data.description,
      effectiveness: data.effectiveness as 'Low' | 'Medium' | 'High',
      status: data.status as 'Planned' | 'In Progress' | 'Implemented' | 'Ineffective',
      createdAt: existingControl?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSave(newControl);
    onOpenChange(false);
  };
  
  if (!potentialRisk) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{existingControl ? "Edit Control" : "Add New Control"}</DialogTitle>
          <DialogDescription>
            Define a control measure for the potential risk: <span className="font-semibold">{potentialRisk.description}</span>.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="space-y-1">
            <Label htmlFor="controlDescription">Description</Label>
            <Textarea
              id="controlDescription"
              {...register("description")}
              className={errors.description ? "border-destructive" : ""}
            />
            {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="effectiveness">Effectiveness</Label>
            <Select
              defaultValue={existingControl?.effectiveness || "Medium"}
              onValueChange={(value) => setValue("effectiveness", value as 'Low'|'Medium'|'High')}
            >
              <SelectTrigger id="effectiveness" className={errors.effectiveness ? "border-destructive" : ""}>
                <SelectValue placeholder="Select effectiveness" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
              </SelectContent>
            </Select>
            {errors.effectiveness && <p className="text-xs text-destructive mt-1">{errors.effectiveness.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="status">Status</Label>
            <Select
              defaultValue={existingControl?.status || "Planned"}
              onValueChange={(value) => setValue("status", value as 'Planned' | 'In Progress' | 'Implemented' | 'Ineffective')}
            >
              <SelectTrigger id="status" className={errors.status ? "border-destructive" : ""}>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Planned">Planned</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Implemented">Implemented</SelectItem>
                <SelectItem value="Ineffective">Ineffective</SelectItem>
              </SelectContent>
            </Select>
            {errors.status && <p className="text-xs text-destructive mt-1">{errors.status.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : (existingControl ? "Save Changes" : "Add Control")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
