
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
import type { PotentialRisk, RiskCause, RiskSource } from '@/lib/types';
import { RISK_SOURCES } from '@/lib/types';
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PlusCircle, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

const riskCauseSchema = z.object({
  description: z.string().min(5, "Deskripsi penyebab minimal 5 karakter."),
  source: z.custom<RiskSource>().refine(val => RISK_SOURCES.includes(val), {
    message: "Sumber harus dipilih.",
  }),
});

type RiskCauseFormData = z.infer<typeof riskCauseSchema>;

interface ManageRiskCausesDialogProps {
  potentialRisk: PotentialRisk;
  goalUprId: string;
  goalPeriod: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCausesUpdate: (potentialRiskId: string, updatedCauses: RiskCause[]) => void;
  initialCauses: RiskCause[];
}

export function ManageRiskCausesDialog({
  potentialRisk,
  goalUprId,
  goalPeriod,
  isOpen,
  onOpenChange,
  onCausesUpdate,
  initialCauses
}: ManageRiskCausesDialogProps) {
  const [causes, setCauses] = useState<RiskCause[]>(initialCauses);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RiskCauseFormData>({
    resolver: zodResolver(riskCauseSchema),
    defaultValues: {
      description: "",
      source: "Internal",
    },
  });

  useEffect(() => {
    setCauses(initialCauses);
  }, [initialCauses, isOpen]);

  const getRiskCausesStorageKey = (uprId: string, period: string, pRiskId: string) => 
    `riskwise-upr${uprId}-period${period}-potentialRisk${pRiskId}-causes`;

  const handleAddCause: SubmitHandler<RiskCauseFormData> = (data) => {
    const newCause: RiskCause = {
      id: `rcause_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      potentialRiskId: potentialRisk.id,
      description: data.description,
      source: data.source,
      createdAt: new Date().toISOString(),
    };
    const updatedCauses = [...causes, newCause];
    setCauses(updatedCauses);
    localStorage.setItem(getRiskCausesStorageKey(goalUprId, goalPeriod, potentialRisk.id), JSON.stringify(updatedCauses));
    onCausesUpdate(potentialRisk.id, updatedCauses);
    toast({ title: "Penyebab Risiko Ditambahkan", description: `Penyebab "${newCause.description}" ditambahkan.` });
    reset();
  };

  const handleDeleteCause = (causeId: string) => {
    const causeToDelete = causes.find(c => c.id === causeId);
    if (!causeToDelete) return;
    const updatedCauses = causes.filter(c => c.id !== causeId);
    setCauses(updatedCauses);
    localStorage.setItem(getRiskCausesStorageKey(goalUprId, goalPeriod, potentialRisk.id), JSON.stringify(updatedCauses));
    onCausesUpdate(potentialRisk.id, updatedCauses);
    toast({ title: "Penyebab Risiko Dihapus", description: `Penyebab "${causeToDelete.description}" dihapus.`, variant: "destructive" });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Kelola Penyebab Risiko untuk: {potentialRisk.description}</DialogTitle>
          <DialogDescription>
            Identifikasi dan kelola potensi penyebab risiko ini. UPR: {goalUprId}, Periode: {goalPeriod}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <form onSubmit={handleSubmit(handleAddCause)} className="space-y-4 border p-4 rounded-md">
            <h3 className="text-md font-semibold">Tambah Penyebab Baru</h3>
            <div className="space-y-1.5">
              <Label htmlFor="causeDescription">Deskripsi Penyebab</Label>
              <Textarea
                id="causeDescription"
                {...register("description")}
                className={errors.description ? "border-destructive" : ""}
                rows={2}
                placeholder="Jelaskan potensi penyebab..."
              />
              {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="causeSource">Sumber</Label>
              <Select
                defaultValue="Internal"
                onValueChange={(value) => setValue("source", value as RiskSource, { shouldValidate: true })}
              >
                <SelectTrigger id="causeSource" className={errors.source ? "border-destructive" : ""}>
                  <SelectValue placeholder="Pilih sumber" />
                </SelectTrigger>
                <SelectContent>
                  {RISK_SOURCES.map(src => (
                    <SelectItem key={src} value={src}>{src}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.source && <p className="text-xs text-destructive mt-1">{errors.source.message}</p>}
            </div>
            <Button type="submit" disabled={isSubmitting} size="sm">
              <PlusCircle className="mr-2 h-4 w-4" /> Tambah Penyebab
            </Button>
          </form>

          <div>
            <h3 className="text-md font-semibold mb-2">Penyebab yang Ada ({causes.length})</h3>
            {causes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada penyebab yang teridentifikasi untuk potensi risiko ini.</p>
            ) : (
              <ScrollArea className="h-[200px] border rounded-md p-2">
                <ul className="space-y-2">
                  {causes.map(cause => (
                    <li key={cause.id} className="flex justify-between items-center p-2 rounded hover:bg-muted/50">
                      <div>
                        <p className="text-sm">{cause.description}</p>
                        <Badge variant="outline" className="text-xs">{cause.source}</Badge>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteCause(cause.id)} aria-label="Hapus penyebab">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
