
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Control, PotentialRisk } from '@/lib/types';
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const controlSchema = z.object({
  description: z.string().min(5, "Deskripsi kontrol minimal 5 karakter."),
  effectiveness: z.enum(['Low', 'Medium', 'High'], { message: "Efektivitas harus dipilih."}),
  status: z.enum(['Planned', 'In Progress', 'Implemented', 'Ineffective'], { message: "Status harus dipilih."}),
});

type ControlFormData = z.infer<typeof controlSchema>;

interface RiskControlModalProps {
  potentialRisk: PotentialRisk | null;
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
      description: "",
      effectiveness: 'Medium',
      status: 'Planned',
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
      potentialRiskId: potentialRisk.id,
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
          <DialogTitle>{existingControl ? "Edit Kontrol" : "Tambah Kontrol Baru"}</DialogTitle>
          <DialogDescription>
            Definisikan tindakan kontrol untuk potensi risiko: <span className="font-semibold">{potentialRisk.description}</span>.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="space-y-1">
            <Label htmlFor="controlDescription">Deskripsi</Label>
            <Textarea
              id="controlDescription"
              {...register("description")}
              className={errors.description ? "border-destructive" : ""}
            />
            {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="effectiveness">Efektivitas</Label>
            <Select
              defaultValue={existingControl?.effectiveness || "Medium"}
              onValueChange={(value) => setValue("effectiveness", value as 'Low'|'Medium'|'High')}
            >
              <SelectTrigger id="effectiveness" className={errors.effectiveness ? "border-destructive" : ""}>
                <SelectValue placeholder="Pilih efektivitas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">Rendah</SelectItem>
                <SelectItem value="Medium">Sedang</SelectItem>
                <SelectItem value="High">Tinggi</SelectItem>
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
                <SelectValue placeholder="Pilih status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Planned">Direncanakan</SelectItem>
                <SelectItem value="In Progress">Sedang Berjalan</SelectItem>
                <SelectItem value="Implemented">Diterapkan</SelectItem>
                <SelectItem value="Ineffective">Tidak Efektif</SelectItem>
              </SelectContent>
            </Select>
            {errors.status && <p className="text-xs text-destructive mt-1">{errors.status.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : (existingControl ? "Simpan Perubahan" : "Tambah Kontrol")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
