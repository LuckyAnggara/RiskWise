
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
import { ScrollArea } from '@/components/ui/scroll-area';

interface ImpactCriteriaModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const impactCriteriaData = [
  {
    no: "1",
    areaDampak: "Fraud Non Kerugian Keuangan Negara",
    tidakSignifikan: "-", // Updated from "Tidak Signifikan"
    minor: "-", // Updated from "Minor"
    moderat: "-", // Updated from "Moderat"
    signifikan: "≤100jt", // Updated from "Signifikan"
    sangatSignifikan: ">100jt", // Updated from "Sangat Signifikan"
  },
  {
    no: "",
    areaDampak: "Fraud Kerugian Keuangan Negara",
    tidakSignifikan: "≤0,01% dari total anggaran non belanja Pegawai pada UPR",
    minor: ">0,01% s.d 0,1% dari total anggaran non belanja Pegawai pada UPR",
    moderat: ">0,1% s.d 1% dari total anggaran non belanja Pegawai pada UPR",
    signifikan: ">1% s.d 5% dari total anggaran non belanja Pegawai pada UPR",
    sangatSignifikan: ">5% dari total anggaran non belanja Pegawai pada UPR",
  },
  {
    no: "2",
    areaDampak: "Penurunan Reputasi",
    tidakSignifikan: "Jumlah pengaduan dari internal (Pegawai) dan eksternal (masyarakat/stakeholder) ≤ 5",
    minor: "Jumlah pengaduan dari internal (Pegawai) dan eksternal (masyarakat/stakeholder) sebanyak 6 s.d 10",
    moderat: "Jumlah pengaduan dari internal (Pegawai) dan eksternal (masyarakat/stakeholder) > 10",
    signifikan: "Pemberitaan negatif yang sesuai fakta",
    sangatSignifikan: "Pemberitaan negatif yang menjadi trending topik (viral) nasional dan atau internasional",
  },
  {
    no: "3",
    areaDampak: "Realisasi Capaian Kinerja",
    tidakSignifikan: "Capaian kinerja >90% s.d <100%",
    minor: "Capaian kinerja >85% s.d 90%",
    moderat: "Capaian kinerja >80% s.d 85%",
    signifikan: "Capaian kinerja ≥ 75% s.d 80%",
    sangatSignifikan: "Capaian kinerja <75%",
  },
  {
    no: "4",
    areaDampak: "Temuan Hasil Pemeriksaan BPK dan Hasil Pengawasan Inspektorat",
    tidakSignifikan: "Tidak ada temuan hasil pemeriksaaan",
    minor: "Ada temuan administratif",
    moderat: "Ada temuan pengembalian uang ke kas negara dan/atau penyimpangan s.d 0,1% dari total anggaran",
    signifikan: "Ada temuan pengembalian uang ke kas negara dan/atau penyimpangan >0,1% s.d 1% dari total anggaran",
    sangatSignifikan: "Ada temuan pengembalian uang ke kas negara dan/atau penyimpangan >1% dari total anggaran",
  },
  {
    no: "5",
    areaDampak: "Gangguan terhadap layanan organisasi",
    tidakSignifikan: "Gangguan operasional layanan sampai dengan 1 jam",
    minor: "Gangguan operasional layanan >1 s.d 3 jam",
    moderat: "Gangguan operasional layanan >3 s.d 6 jam",
    signifikan: "Gangguan operasional layanan >6 s.d 12 jam",
    sangatSignifikan: "Gangguan operasional layanan lebih dari 12 jam",
  },
];

export function ImpactCriteriaModal({ isOpen, onOpenChange }: ImpactCriteriaModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl text-xs">
        <DialogHeader>
          <DialogTitle>Panduan Kriteria Dampak Risiko</DialogTitle>
          <DialogDescription>
            Gunakan tabel ini sebagai panduan untuk menentukan level dampak risiko.
          </DialogDescription>
        </DialogHeader>
        <div className="h-[70vh] w-full overflow-auto rounded-md border text-xs">
          <div className="py-4 "> 
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[5%] font-semibold">No</TableHead>
                  <TableHead className="w-[15%] font-semibold">Area Dampak</TableHead>
                  <TableHead className="w-[16%] font-semibold">Tidak Signifikan (1)</TableHead>
                  <TableHead className="w-[16%] font-semibold">Minor (2)</TableHead>
                  <TableHead className="w-[16%] font-semibold">Moderat (3)</TableHead>
                  <TableHead className="w-[16%] font-semibold">Signifikan (4)</TableHead>
                  <TableHead className="w-[16%] font-semibold">Sangat Signifikan (5)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {impactCriteriaData.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.no}</TableCell>
                    <TableCell className="whitespace-normal">{item.areaDampak}</TableCell> 
                    <TableCell className="whitespace-normal">{item.tidakSignifikan}</TableCell>
                    <TableCell className="whitespace-normal">{item.minor}</TableCell>
                    <TableCell className="whitespace-normal">{item.moderat}</TableCell>
                    <TableCell className="whitespace-normal">{item.signifikan}</TableCell>
                    <TableCell className="whitespace-normal">{item.sangatSignifikan}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
