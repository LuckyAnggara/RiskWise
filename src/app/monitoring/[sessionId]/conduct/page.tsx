
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { useAppStore } from '@/stores/useAppStore';
import type { RiskCause, ControlMeasure, MonitoringSession, RiskExposure, MonitoredControlMeasureData } from '@/lib/types';
import { ArrowLeft, Loader2, Save, AlertTriangle, CheckCircle2, FileUp, Info } from 'lucide-react';
import { getCalculatedRiskLevel, getRiskLevelColor, getControlGuidance } from '@/app/risk-cause-analysis/[riskCauseId]/page'; // Import shared functions
import { Separator } from '@/components/ui/separator';
import { format, parseISO, isValid as isValidDate } from 'date-fns';
import { id as localeID } from 'date-fns/locale';


interface RiskExposureFormData {
  exposureValue: number | null;
  exposureUnit: string | null;
  exposureNotes?: string | null;
  monitoredControls?: MonitoredControlMeasureData[];
}

interface RiskCauseWithExposure extends RiskCause {
  exposureData?: RiskExposureFormData;
  relatedControls: ControlMeasure[];
}

export default function ConductMonitoringPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  const { currentUser, appUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const store = useAppStore();
  const {
    currentMonitoringSession,
    currentMonitoringSessionLoading,
    riskCauses, // Semua penyebab risiko dari store
    controlMeasures, // Semua tindakan pengendalian dari store
    riskExposures, // Data paparan yang sudah ada untuk sesi ini
    fetchCurrentMonitoringSession,
    fetchRiskExposuresForSession, // Untuk memuat paparan awal
    upsertRiskExposureInState, // Untuk menyimpan/update data paparan
    riskCausesLoading,
    controlMeasuresLoading,
  } = store;

  const [pageIsLoading, setPageIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [riskCausesWithData, setRiskCausesWithData] = useState<RiskCauseWithExposure[]>([]);

  const currentUserId = useMemo(() => currentUser?.uid || null, [currentUser]);
  const currentAppPeriod = useMemo(() => appUser?.activePeriod || null, [appUser]); // Periode aplikasi global
  const uprDisplayName = useMemo(() => appUser?.displayName || 'UPR...', [appUser]);

  // Periode sesi pemantauan diambil dari currentMonitoringSession.period
  const sessionPeriod = useMemo(() => currentMonitoringSession?.period || null, [currentMonitoringSession]);

  useEffect(() => {
    if (sessionId && currentUserId && currentAppPeriod && !authLoading) {
      console.log(`[ConductMonitoringPage] useEffect: Fetching current session (ID: ${sessionId}) and related data.`);
      setPageIsLoading(true);
      fetchCurrentMonitoringSession(sessionId, currentUserId, currentAppPeriod)
        .catch(error => {
          toast({ title: "Gagal Memuat Sesi", description: error.message || "Sesi pemantauan tidak ditemukan.", variant: "destructive" });
          router.push('/monitoring');
        })
        .finally(() => {
          // Cek loading lain sebelum set pageIsLoading false
          // fetchCurrentMonitoringSession sudah memanggil fetchRiskExposuresForSession
        });
    } else if (!authLoading && (!currentUserId || !currentAppPeriod)) {
      toast({ title: "Konteks Pengguna Hilang", description: "Sesi atau periode aktif tidak ditemukan.", variant: "destructive" });
      router.push("/monitoring");
    }
  }, [sessionId, currentUserId, currentAppPeriod, authLoading, fetchCurrentMonitoringSession, router, toast]);


  useEffect(() => {
    if (currentMonitoringSession && riskCauses.length > 0 && controlMeasures.length >= 0 && !riskCausesLoading && !controlMeasuresLoading && !currentMonitoringSessionLoading) {
      console.log("[ConductMonitoringPage] Data dependencies met. Processing riskCausesWithData. RiskCauses count:", riskCauses.length, "ControlMeasures count:", controlMeasures.length);
      const relevantRiskCauses = riskCauses.filter(
        rc => rc.userId === currentUserId && rc.period === sessionPeriod // Filter penyebab berdasarkan periode SESI
      );
      console.log(`[ConductMonitoringPage] Relevant RiskCauses for session period ${sessionPeriod}:`, relevantRiskCauses.length);

      const causesWithDetails = relevantRiskCauses.map(cause => {
        const existingExposure = riskExposures.find(ex => ex.riskCauseId === cause.id && ex.monitoringSessionId === sessionId);
        const relatedControls = controlMeasures.filter(cm => cm.riskCauseId === cause.id);
        
        return {
          ...cause,
          exposureData: existingExposure ? {
            exposureValue: existingExposure.exposureValue,
            exposureUnit: existingExposure.exposureUnit,
            exposureNotes: existingExposure.exposureNotes || '',
            monitoredControls: existingExposure.monitoredControls || relatedControls.map(rc => ({ controlMeasureId: rc.id, realizationKci: null })),
          } : {
            exposureValue: null,
            exposureUnit: cause.keyRiskIndicator ? cause.keyRiskIndicator.split(' ').pop() || null : null, // Coba tebak unit dari KRI
            exposureNotes: '',
            monitoredControls: relatedControls.map(rc => ({ controlMeasureId: rc.id, realizationKci: null })),
          },
          relatedControls: relatedControls,
        };
      });
      setRiskCausesWithData(causesWithDetails);
      setPageIsLoading(false); // Data siap, loading selesai
    } else if (!currentMonitoringSessionLoading && !riskCausesLoading && !controlMeasuresLoading && currentMonitoringSession === null && !authLoading) {
      // Sesi tidak ditemukan atau user tidak punya akses
      setPageIsLoading(false);
    } else if (!authLoading && (riskCausesLoading || controlMeasuresLoading || currentMonitoringSessionLoading)) {
        setPageIsLoading(true); // Masih ada yang loading dari store
    }

  }, [
      currentMonitoringSession, riskCauses, controlMeasures, riskExposures, 
      sessionId, currentUserId, sessionPeriod, riskCausesLoading, 
      controlMeasuresLoading, currentMonitoringSessionLoading, authLoading
    ]);


  const handleExposureDataChange = (riskCauseId: string, field: keyof RiskExposureFormData, value: any) => {
    setRiskCausesWithData(prev =>
      prev.map(rc =>
        rc.id === riskCauseId
          ? { ...rc, exposureData: { ...(rc.exposureData || {}), [field]: value } as RiskExposureFormData }
          : rc
      )
    );
  };
  
  const handleMonitoredControlChange = (riskCauseId: string, controlMeasureId: string, field: keyof MonitoredControlMeasureData, value: any) => {
    setRiskCausesWithData(prev =>
      prev.map(rc => {
        if (rc.id === riskCauseId) {
          const updatedControls = rc.exposureData?.monitoredControls?.map(mc =>
            mc.controlMeasureId === controlMeasureId
              ? { ...mc, [field]: value }
              : mc
          ) || [];
          return { ...rc, exposureData: { ...(rc.exposureData || {}), monitoredControls: updatedControls } as RiskExposureFormData };
        }
        return rc;
      })
    );
  };


  const handleSaveProgress = async () => {
    if (!currentMonitoringSession || !currentUserId || !sessionPeriod) {
      toast({ title: "Konteks Sesi Tidak Lengkap", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    let successCount = 0;
    const errors: string[] = [];

    for (const causeWithData of riskCausesWithData) {
      if (causeWithData.exposureData && (causeWithData.exposureData.exposureValue !== null || causeWithData.exposureData.exposureNotes?.trim() !== '')) {
        const exposurePayload: Omit<RiskExposure, 'id' | 'recordedAt' | 'updatedAt'> = {
          monitoringSessionId: sessionId,
          riskCauseId: causeWithData.id,
          potentialRiskId: causeWithData.potentialRiskId,
          goalId: causeWithData.goalId,
          userId: currentUserId,
          period: sessionPeriod, // Periode sesi pemantauan
          exposureValue: causeWithData.exposureData.exposureValue,
          exposureUnit: causeWithData.exposureData.exposureUnit,
          exposureNotes: causeWithData.exposureData.exposureNotes,
          monitoredControls: causeWithData.exposureData.monitoredControls,
        };
        try {
          await upsertRiskExposureInState(exposurePayload);
          successCount++;
        } catch (error: any) {
          errors.push(`Gagal menyimpan paparan untuk penyebab ${causeWithData.description}: ${error.message}`);
        }
      }
    }
    setIsSaving(false);
    if (errors.length > 0) {
      toast({ title: "Sebagian Gagal Disimpan", description: errors.join("\n"), variant: "destructive", duration: 7000 });
    }
    if (successCount > 0) {
      toast({ title: "Kemajuan Disimpan", description: `${successCount} data paparan risiko berhasil disimpan/diperbarui.` });
      // Muat ulang data paparan untuk mendapatkan timestamp server
      await fetchRiskExposuresForSession(sessionId, currentUserId, sessionPeriod);
    }
  };
  
  const calculatePerformance = (target: string | null, realization: string | number | null, isNegativeTarget: boolean): number | null => {
      if (target === null || realization === null) return null;
      
      const numTarget = parseFloat(String(target).replace(/[^0-9.,-]+/g, '').replace(',', '.'));
      const numRealization = parseFloat(String(realization).replace(/[^0-9.,-]+/g, '').replace(',', '.'));

      if (isNaN(numTarget) || isNaN(numRealization) || numTarget === 0) return null;

      let performance;
      if (isNegativeTarget) { // Target adalah batas atas (semakin kecil semakin baik)
          // Rumus: ((Target KCI − (Realisasi KCI − Target KCI))/Target KCI ) * 100%
          // Disederhanakan: (2 * Target - Realisasi) / Target * 100%
          performance = ((2 * numTarget - numRealization) / numTarget) * 100;
      } else { // Target adalah batas bawah (semakin besar semakin baik)
          performance = (numRealization / numTarget) * 100;
      }
      return Math.max(0, Math.round(performance)); // Tidak boleh negatif, bulatkan
  };

  if (pageIsLoading || authLoading || currentMonitoringSessionLoading || (!currentMonitoringSession && !authLoading && !currentMonitoringSessionLoading) ) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">
          {authLoading ? "Memverifikasi sesi..." : 
           currentMonitoringSessionLoading ? "Memuat detail sesi pemantauan..." :
           riskCausesLoading ? "Memuat penyebab risiko..." :
           controlMeasuresLoading ? "Memuat tindakan pengendalian..." :
           "Menyiapkan data..."
          }
        </p>
      </div>
    );
  }

  if (!currentMonitoringSession) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-xl text-muted-foreground">Sesi Pemantauan tidak ditemukan atau Anda tidak memiliki akses.</p>
        <Button onClick={() => router.push('/monitoring')} variant="outline" className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Daftar Sesi
        </Button>
      </div>
    );
  }

  const { level: prLevel } = getCalculatedRiskLevel(null, null); // Placeholder, level risiko penyebab dihitung per item

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Pelaksanaan Pemantauan: ${currentMonitoringSession.name}`}
        description={`Periode Sesi: ${format(parseISO(currentMonitoringSession.startDate), "dd MMM yyyy", { locale: localeID })} - ${format(parseISO(currentMonitoringSession.endDate), "dd MMM yyyy", { locale: localeID })}. UPR: ${uprDisplayName}, Periode Aplikasi: ${currentAppPeriod}.`}
        actions={
          <div className="flex gap-2">
            <Button onClick={() => router.push('/monitoring')} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Daftar Sesi
            </Button>
            <Button onClick={handleSaveProgress} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Simpan Kemajuan
            </Button>
          </div>
        }
      />

      {riskCausesWithData.length === 0 && !riskCausesLoading && (
        <Card>
          <CardHeader><CardTitle>Tidak Ada Penyebab Risiko</CardTitle></CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Tidak ada penyebab risiko yang ditemukan untuk periode sesi pemantauan ini ({sessionPeriod}). Pastikan penyebab risiko telah diidentifikasi dan dianalisis untuk periode tersebut.</p>
          </CardContent>
        </Card>
      )}

      {riskCausesWithData.map((cause, causeIndex) => {
        const { level: causeRiskLevelText } = getCalculatedRiskLevel(cause.likelihood, cause.impact);
        const numericTolerance = cause.riskTolerance ? parseFloat(cause.riskTolerance.replace(/[^0-9.-]+/g, '')) : NaN;
        const guidance = getControlGuidance(causeRiskLevelText);
        let exposureComparisonGuidance = "";
        if (cause.exposureData?.exposureValue !== null && cause.exposureData?.exposureValue !== undefined && !isNaN(numericTolerance)) {
            if (cause.exposureData.exposureValue >= numericTolerance) {
                exposureComparisonGuidance = "PERHATIAN: Paparan Risiko (Risk Exposure) ≥ Toleransi Risiko. Pertimbangkan Tindakan Mitigasi (RM) dan perbaiki/susun Tindakan Korektif (Crr).";
            } else {
                exposureComparisonGuidance = "INFO: Paparan Risiko < Toleransi Risiko. Lanjutkan pengendalian sesuai rencana. Perbaiki jika perlu.";
            }
        }

        return (
          <Card key={cause.id}>
            <CardHeader>
              <CardTitle className="text-base">
                PC{cause.sequenceNumber}: {cause.description}
                <Badge variant="outline" className="ml-2 text-xs">{cause.source}</Badge>
                <Badge className={`${getRiskLevelColor(causeRiskLevelText)} ml-2 text-xs`}>{causeRiskLevelText}</Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Potensi Risiko Induk: {store.potentialRisks.find(pr => pr.id === cause.potentialRiskId)?.description || 'N/A'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div><strong>KRI:</strong> {cause.keyRiskIndicator || '-'}</div>
                <div><strong>Toleransi Risiko:</strong> {cause.riskTolerance || '-'}</div>
              </div>

              <Separator />
              <h4 className="font-semibold text-sm">Input Data Pemantauan Paparan Risiko</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-1.5">
                  <Label htmlFor={`exposureValue-${cause.id}`}>Nilai Risiko Terjadi (Risk Exposure)</Label>
                  <Input
                    id={`exposureValue-${cause.id}`}
                    type="number"
                    placeholder="Masukkan nilai paparan"
                    value={cause.exposureData?.exposureValue ?? ''}
                    onChange={(e) => handleExposureDataChange(cause.id, 'exposureValue', e.target.value === '' ? null : parseFloat(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`exposureUnit-${cause.id}`}>Satuan Paparan</Label>
                  <Input
                    id={`exposureUnit-${cause.id}`}
                    placeholder="Misal: Kejadian, %, Rp"
                    value={cause.exposureData?.exposureUnit ?? ''}
                    onChange={(e) => handleExposureDataChange(cause.id, 'exposureUnit', e.target.value)}
                  />
                </div>
                 <div className="space-y-1.5 md:col-span-3">
                  <Label htmlFor={`exposureNotes-${cause.id}`}>Catatan Paparan Risiko</Label>
                  <Textarea
                    id={`exposureNotes-${cause.id}`}
                    placeholder="Catatan terkait observasi paparan risiko..."
                    value={cause.exposureData?.exposureNotes ?? ''}
                    onChange={(e) => handleExposureDataChange(cause.id, 'exposureNotes', e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
              {exposureComparisonGuidance && (
                <Alert variant={cause.exposureData?.exposureValue !== null && !isNaN(numericTolerance) && cause.exposureData?.exposureValue >= numericTolerance ? "destructive" : "default"} className="mt-2 text-xs">
                    {cause.exposureData?.exposureValue !== null && !isNaN(numericTolerance) && cause.exposureData?.exposureValue >= numericTolerance ? <AlertTriangle className="h-4 w-4"/> : <Info className="h-4 w-4"/> }
                    <AlertTitle className="font-semibold">Panduan Tindak Lanjut</AlertTitle>
                    <AlertDescription>{exposureComparisonGuidance}</AlertDescription>
                </Alert>
              )}

              <Separator />
              <h4 className="font-semibold text-sm">Pemantauan Tindakan Pengendalian</h4>
              <p className="text-xs text-muted-foreground mb-2">Rekomendasi berdasarkan tingkat risiko penyebab: {guidance}</p>
              
              {cause.relatedControls.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Belum ada tindakan pengendalian yang disusun untuk penyebab risiko ini.</p>
              ) : (
                <Accordion type="multiple" className="w-full text-xs">
                  {cause.relatedControls.map((control, controlIndex) => {
                    const monitoredControlData = cause.exposureData?.monitoredControls?.find(mc => mc.controlMeasureId === control.id) 
                                              || { controlMeasureId: control.id, realizationKci: null };
                    const performance = calculatePerformance(control.target, monitoredControlData.realizationKci, control.keyControlIndicator?.toLowerCase().includes('maksimal') || control.keyControlIndicator?.toLowerCase().includes('maks') || false); // Asumsi target negatif jika mengandung 'maksimal'
                    
                    return (
                      <AccordionItem value={control.id} key={control.id}>
                        <AccordionTrigger className="hover:no-underline py-2">
                          <div className="flex justify-between w-full items-center pr-2">
                            <span className="font-medium">PC{cause.sequenceNumber}.{control.controlType}.{control.sequenceNumber} - {control.description}</span>
                            <Badge variant="outline">{store.getControlTypeName(control.controlType)}</Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-3 pt-1 space-y-3 bg-muted/30 p-3 rounded-md">
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            <div><strong>KCI:</strong> {control.keyControlIndicator || '-'}</div>
                            <div><strong>Target KCI:</strong> {control.target || '-'}</div>
                            <div><strong>Penanggung Jawab:</strong> {control.responsiblePerson || '-'}</div>
                            <div><strong>Waktu:</strong> {control.deadline ? format(parseISO(control.deadline), "dd/MM/yyyy") : '-'}</div>
                            <div className="col-span-2"><strong>Anggaran:</strong> Rp {control.budget?.toLocaleString('id-ID') || '0'}</div>
                          </div>
                          <Separator />
                          <div className="space-y-2 mt-2">
                            <Label htmlFor={`realizationKci-${cause.id}-${control.id}`} className="text-xs font-medium">Realisasi KCI</Label>
                            <Input
                              id={`realizationKci-${cause.id}-${control.id}`}
                              placeholder="Input realisasi KCI"
                              value={monitoredControlData.realizationKci ?? ''}
                              onChange={(e) => handleMonitoredControlChange(cause.id, control.id, 'realizationKci', e.target.value)}
                              className="text-xs h-8"
                            />
                             {performance !== null && (
                                <p className="text-xs mt-1">
                                  <strong>Kinerja Pengendalian: </strong> 
                                  <Badge variant={performance >= 80 ? "default" : performance >=50 ? "secondary" : "destructive"} className="bg-green-500">
                                    {performance}%
                                  </Badge>
                                </p>
                            )}
                          </div>
                           <div className="space-y-2 mt-2">
                            <Label htmlFor={`evidence-${cause.id}-${control.id}`} className="text-xs font-medium">Upload Data Dukung (Opsional)</Label>
                            <Input 
                                id={`evidence-${cause.id}-${control.id}`} 
                                type="file" 
                                className="text-xs h-9 file:text-xs file:font-medium"
                                // onChange={(e) => handleMonitoredControlChange(cause.id, control.id, 'supportingEvidenceUrl', e.target.files ? e.target.files[0] : null)}
                                // Untuk file upload, perlu state & handler khusus, ini placeholder UI
                             />
                             {/* Jika sudah ada URL, tampilkan linknya */}
                             {monitoredControlData.supportingEvidenceUrl && (
                                <a href={monitoredControlData.supportingEvidenceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">Lihat Bukti</a>
                             )}
                          </div>
                          <div className="space-y-2 mt-2">
                            <Label htmlFor={`monitoringNotes-${cause.id}-${control.id}`} className="text-xs font-medium">Catatan Hasil Pemantauan</Label>
                            <Textarea
                              id={`monitoringNotes-${cause.id}-${control.id}`}
                              placeholder="Catatan terkait hasil pemantauan pengendalian ini..."
                              value={monitoredControlData.monitoringResultNotes ?? ''}
                              onChange={(e) => handleMonitoredControlChange(cause.id, control.id, 'monitoringResultNotes', e.target.value)}
                              rows={2}
                              className="text-xs"
                            />
                          </div>
                          <div className="space-y-2 mt-2">
                            <Label htmlFor={`followUpPlan-${cause.id}-${control.id}`} className="text-xs font-medium">Rencana Tindak Lanjut</Label>
                            <Textarea
                              id={`followUpPlan-${cause.id}-${control.id}`}
                              placeholder="Rencana tindak lanjut jika diperlukan..."
                              value={monitoredControlData.followUpPlan ?? ''}
                              onChange={(e) => handleMonitoredControlChange(cause.id, control.id, 'followUpPlan', e.target.value)}
                              rows={2}
                              className="text-xs"
                            />
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )
                  })}
                </Accordion>
              )}
            </CardContent>
          </Card>
        )
      })}
       <div className="flex justify-end mt-6">
            <Button onClick={handleSaveProgress} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Simpan Kemajuan
            </Button>
        </div>
    </div>
  );
}
