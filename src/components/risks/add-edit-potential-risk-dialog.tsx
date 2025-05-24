
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
  description: z.string().min(10, "Deskripsi potensi risiko minimal 10 karakter."),
  goalId: z.string().min(1, "Sasaran harus dipilih."),
  category: z.custom<RiskCategory>().nullable().refine(val => val === null || RISK_CATEGORIES.includes(val), {
    message: "Kategori risiko tidak valid.",
  }),
  owner: z.string().nullable(),
});

type PotentialRiskFormData = z.infer<typeof potentialRiskSchema>;

const NO_CATEGORY_SENTINEL = "__NONE__"; 

interface AddEditPotentialRiskDialogProps {
  goals: Goal[];
  onPotentialRiskSave: (potentialRisk: PotentialRisk, isNew: boolean) => void;
  existingPotentialRisk?: PotentialRisk | null;
  triggerButton?: React.ReactNode;
  defaultGoalId?: string;
  currentUprId: string;
  currentPeriod: string;
  isOpen?: boolean; 
  onOpenChange?: (open: boolean) => void; 
}

export function AddEditPotentialRiskDialog({ 
  goals, 
  onPotentialRiskSave, 
  existingPotentialRisk, 
  triggerButton, 
  defaultGoalId,
  currentUprId, 
  currentPeriod,
  isOpen: isOpenProp,
  onOpenChange: onOpenChangeProp,
}: AddEditPotentialRiskDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isEditing = !!existingPotentialRisk;

  const isControlled = isOpenProp !== undefined && onOpenChangeProp !== undefined;
  
  const open = isControlled ? isOpenProp! : uncontrolledOpen;
  const setOpenState = (newOpenState: boolean) => {
    if (isControlled) {
      onOpenChangeProp!(newOpenState);
    } else {
      setUncontrolledOpen(newOpenState);
    }
  };

   useEffect(() => {
    console.warn("AddEditPotentialRiskDialog sudah tidak digunakan untuk CRUD utama Potensi Risiko. Gunakan halaman /all-risks/manage.");
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
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
      console.error("Sasaran induk yang dipilih tidak ditemukan atau tidak dalam konteks UPR/Periode saat ini.");
      return; 
    }

    const potentialRiskData: PotentialRisk = {
      id: existingPotentialRisk?.id || `prisk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      goalId: data.goalId,
      description: data.description,
      category: data.category === NO_CATEGORY_SENTINEL ? null : data.category,
      owner: data.owner || null,
      likelihood: existingPotentialRisk?.likelihood || null,
      impact: existingPotentialRisk?.impact || null,
      identifiedAt: existingPotentialRisk?.identifiedAt || new Date().toISOString(),
      analysisCompletedAt: existingPotentialRisk?.analysisCompletedAt,
    };
    onPotentialRiskSave(potentialRiskData, !isEditing);
    setOpenState(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpenState}>
      {triggerButton ? (
        <DialogTrigger asChild>
          {React.cloneElement(triggerButton as React.ReactElement, { onClick: () => setOpenState(true) })}
        </DialogTrigger>
      ) : !isControlled ? (
        <DialogTrigger asChild>
          <Button onClick={() => setOpenState(true)} variant="outline" size="sm" className="text-muted-foreground">
            {isEditing ? <Edit className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            {isEditing ? "Edit (Dialog - Deprecated)" : "Tambah (Dialog - Deprecated)"}
          </Button>
        </DialogTrigger>
      ) : null }
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Potensi Risiko (Dialog - Deprecated)" : "Tambah Potensi Risiko Baru (Dialog - Deprecated)"}</DialogTitle>
          <DialogDescription>
            Dialog ini dalam proses penggantian. Harap gunakan halaman manajemen khusus.
            {` Untuk UPR: ${currentUprId}, Periode: ${currentPeriod}`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="goalIdPotentialRiskDialog">Sasaran Terkait</Label>
            <Select
              value={selectedGoalId}
              onValueChange={(value) => setValue("goalId", value, { shouldValidate: true })}
              disabled={goals.length === 0}
            >
              <SelectTrigger id="goalIdPotentialRiskDialog" className={errors.goalId ? "border-destructive" : ""}>
                <SelectValue placeholder="Pilih sasaran" />
              </SelectTrigger>
              <SelectContent>
                {goals.length > 0 ? (
                  goals.map(goal => (
                    <SelectItem key={goal.id} value={goal.id}>{goal.name}</SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-goals" disabled>Tidak ada sasaran di UPR/Periode ini.</SelectItem>
                )}
              </SelectContent>
            </Select>
            {errors.goalId && <p className="text-xs text-destructive mt-1">{errors.goalId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="descriptionPotentialRiskDialog">Deskripsi Potensi Risiko</Label>
            <Textarea
              id="descriptionPotentialRiskDialog"
              {...register("description")}
              className={errors.description ? "border-destructive" : ""}
              rows={3}
              placeholder="Jelaskan potensi risiko..."
            />
            {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="categoryPotentialRiskDialog">Kategori Risiko</Label>
            <Select
              value={selectedCategory || NO_CATEGORY_SENTINEL} 
              onValueChange={(value) => {
                if (value === NO_CATEGORY_SENTINEL) {
                  setValue("category", null, { shouldValidate: true });
                } else {
                  setValue("category", value as RiskCategory, { shouldValidate: true });
                }
              }}
            >
              <SelectTrigger id="categoryPotentialRiskDialog" className={errors.category ? "border-destructive" : ""}>
                <SelectValue placeholder="Pilih kategori (opsional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CATEGORY_SENTINEL}>_Tanpa Kategori_</SelectItem>
                {RISK_CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && <p className="text-xs text-destructive mt-1">{errors.category.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ownerPotentialRiskDialog">Pemilik Risiko (Opsional)</Label>
            <Input
              id="ownerPotentialRiskDialog"
              {...register("owner")}
              placeholder="Contoh: Kepala Operasional, Departemen TI"
              className={errors.owner ? "border-destructive" : ""}
            />
            {errors.owner && <p className="text-xs text-destructive mt-1">{errors.owner.message}</p>}
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpenState(false)}>Batal</Button>
            <Button type="submit" disabled={isSubmitting || (goals.length === 0 && !isEditing && !defaultGoalId) }>
              {isSubmitting ? "Menyimpan..." : (isEditing ? "Simpan Perubahan" : "Tambah Potensi Risiko")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
