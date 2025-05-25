
"use client";

import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ControlMeasure, RiskCause, ControlMeasureTypeKey } from '@/lib/types';
import { CONTROL_MEASURE_TYPES, CONTROL_MEASURE_TYPE_KEYS } from '@/lib/types';
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Calendar as CalendarIcon, Loader2, Save } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

const controlMeasureSchema = z.object({
  controlType: z.custom<ControlMeasureTypeKey>((val) => CONTROL_MEASURE_TYPE_KEYS.includes(val as ControlMeasureTypeKey), {
    message: "Tipe pengendalian harus dipilih.",
  }),
  description: z.string().min(5, "Deskripsi pengendalian minimal 5 karakter."),
  keyControlIndicator: z.string().nullable(),
  target: z.string().nullable(),
  responsiblePerson: z.string().nullable(),
  deadline: z.date().nullable(),
  budget: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
    z.number().positive("Anggaran harus angka positif jika diisi.").nullable()
  ),
});

type ControlMeasureFormData = z.infer<typeof controlMeasureSchema>;

interface AddEditControlMeasureModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (controlMeasure: ControlMeasure, isNew: boolean) => void;
  riskCause: RiskCause;
  potentialRiskId: string;
  goalId: string;
  uprId: string;
  period: string;
  existingControlMeasure?: ControlMeasure | null;
  existingControlsForCause: ControlMeasure[]; // To calculate next sequence number
}

export function AddEditControlMeasureModal({
  isOpen,
  onOpenChange,
  onSave,
  riskCause,
  potentialRiskId,
  goalId,
  uprId,
  period,
  existingControlMeasure,
  existingControlsForCause,
}: AddEditControlMeasureModalProps) {
  const isEditing = !!existingControlMeasure;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ControlMeasureFormData>({
    resolver: zodResolver(controlMeasureSchema),
    defaultValues: {
      controlType: 'Prv',
      description: "",
      keyControlIndicator: "",
      target: "",
      responsiblePerson: "",
      deadline: null,
      budget: null,
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (existingControlMeasure) {
        reset({
          controlType: existingControlMeasure.controlType,
          description: existingControlMeasure.description,
          keyControlIndicator: existingControlMeasure.keyControlIndicator || "",
          target: existingControlMeasure.target || "",
          responsiblePerson: existingControlMeasure.responsiblePerson || "",
          deadline: existingControlMeasure.deadline ? parseISO(existingControlMeasure.deadline) : null,
          budget: existingControlMeasure.budget,
        });
      } else {
        reset({
          controlType: 'Prv',
          description: "",
          keyControlIndicator: "",
          target: "",
          responsiblePerson: "",
          deadline: null,
          budget: null,
        });
      }
    }
  }, [existingControlMeasure, isOpen, reset]);

  const onSubmit: SubmitHandler<ControlMeasureFormData> = (data) => {
    const nextSequenceNumber = isEditing 
      ? existingControlMeasure.sequenceNumber 
      : (existingControlsForCause.filter(c => c.controlType === data.controlType).length) + 1;

    const controlMeasureData: ControlMeasure = {
      id: existingControlMeasure?.id || `ctrlm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      riskCauseId: riskCause.id,
      potentialRiskId: potentialRiskId,
      goalId: goalId,
      uprId: uprId,
      period: period,
      controlType: data.controlType,
      sequenceNumber: nextSequenceNumber,
      description: data.description,
      keyControlIndicator: data.keyControlIndicator || null,
      target: data.target || null,
      responsiblePerson: data.responsiblePerson || null,
      deadline: data.deadline ? data.deadline.toISOString() : null,
      budget: data.budget,
      createdAt: existingControlMeasure?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSave(controlMeasureData, !isEditing);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Rencana Pengendalian" : "Tambah Rencana Pengendalian Baru"}</DialogTitle>
          <DialogDescription>
            Untuk penyebab risiko: {riskCause.description}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
          <div className="space-y-1.5">
            <Label htmlFor="controlType">Tipe Pengendalian</Label>
            <Controller
              name="controlType"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger id="controlType" className={errors.controlType ? "border-destructive" : ""}>
                    <SelectValue placeholder="Pilih tipe pengendalian" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTROL_MEASURE_TYPE_KEYS.map(typeKey => (
                      <SelectItem key={typeKey} value={typeKey}>{CONTROL_MEASURE_TYPES[typeKey]} ({typeKey})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.controlType && <p className="text-xs text-destructive mt-1">{errors.controlType.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="controlDescription">Deskripsi Pengendalian Risiko</Label>
            <Textarea
              id="controlDescription"
              {...register("description")}
              className={errors.description ? "border-destructive" : ""}
              rows={3}
              placeholder="Jelaskan tindakan pengendalian..."
            />
            {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="keyControlIndicator">Indikator Pengendalian Risiko (KCI)</Label>
            <Input
              id="keyControlIndicator"
              {...register("keyControlIndicator")}
              placeholder="Contoh: Persentase penyelesaian pelatihan"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="target">Target KCI</Label>
            <Input
              id="target"
              {...register("target")}
              placeholder="Contoh: 100% pegawai mengikuti pelatihan"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="responsiblePerson">Penanggung Jawab</Label>
            <Input
              id="responsiblePerson"
              {...register("responsiblePerson")}
              placeholder="Contoh: Manajer SDM, Kepala Divisi TI"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deadline">Waktu (Deadline)</Label>
             <Controller
                name="deadline"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP") : <span>Pilih tanggal</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="budget">Anggaran (Rp)</Label>
            <Input
              id="budget"
              type="number"
              {...register("budget")}
              placeholder="Contoh: 5000000"
              className={errors.budget ? "border-destructive" : ""}
            />
            {errors.budget && <p className="text-xs text-destructive mt-1">{errors.budget.message}</p>}
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isEditing ? "Simpan Perubahan" : "Tambah Pengendalian"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
