
"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface LikelihoodCriteriaModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const criteriaData = [
  {
    level: "Hampir tidak terjadi (1)",
    percentage: "x ≤ 5%",
    frequency: "Sangat Jarang: <2 kali",
  },
  {
    level: "Jarang terjadi (2)",
    percentage: "5% < x ≤ 10%",
    frequency: "Jarang: 2–5 kali",
  },
  {
    level: "Kadang terjadi (3)",
    percentage: "10% < x ≤ 20%",
    frequency: "Cukup sering: 6–9 kali",
  },
  {
    level: "Sering terjadi (4)",
    percentage: "20% < x ≤ 50%",
    frequency: "Sering: 10–12 kali",
  },
  {
    level: "Hampir pasti terjadi (5)",
    percentage: "x > 50%",
    frequency: "Sangat sering: >12 kali",
  },
];

export function LikelihoodCriteriaModal({ isOpen, onOpenChange }: LikelihoodCriteriaModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Panduan Kriteria Kemungkinan Terjadinya Risiko</DialogTitle>
          <DialogDescription>
            Gunakan tabel ini sebagai panduan untuk menentukan level kemungkinan risiko.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Level Kemungkinan</TableHead>
                <TableHead className="font-semibold">Persentase kemungkinan terjadi dalam 1 tahun</TableHead>
                <TableHead className="font-semibold">Jumlah Frekuensi kemungkinan terjadi dalam 1 tahun</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {criteriaData.map((item) => (
                <TableRow key={item.level}>
                  <TableCell>{item.level}</TableCell>
                  <TableCell>{item.percentage}</TableCell>
                  <TableCell>{item.frequency}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
