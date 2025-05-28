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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { useAppStore } from '@/stores/useAppStore';
import type { RiskCause, ControlMeasure, MonitoringSession, RiskExposure, MonitoredControlMeasureData, CalculatedRiskLevelCategory } from '@/lib/types';
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
    riskCauses, 
    controlMeasures, 
    riskExposures, 
    fetchCurrentMonitoringSession,
    fetchRiskExposuresForSession, 
    upsertRiskExposureInState, 
    riskCausesLoading,
    controlMeasuresLoading,
    fetchGoals, // Ensure goals and subsequent data are fetched if not already
    fetchPotentialRisks,
    fetchRiskCauses,
    fetchControlMeasures,
  } = store;

  const [pageIsLoading, setPageIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [riskCausesWithData, setRiskCausesWithData] = useState<RiskCauseWithExposure[]>([]);

  const currentUserId = useMemo(() => currentUser?.uid || null, [currentUser]);
  const currentAppPeriod = useMemo(() => appUser?.activePeriod || null, [appUser]); 
  const uprDisplayName = useMemo(() => appUser?.displayName || 'UPR...', [appUser]);
  const sessionPeriod = useMemo(() => currentMonitoringSession?.period || null, [currentMonitoringSession]);

  const ensureBaseDataFetched = useCallback(async () => {
    if (!currentUserId || !currentAppPeriod) return false;
    if (store.goals.length === 0 && !store.goalsLoading) {
      await fetchGoals(currentUserId, currentAppPeriod); // This chains other fetches in store
      return true; // Indicated a fetch was started
    }
    if (store.potentialRisks.length === 0 && !store.potentialRisksLoading && store.goals.length > 0) {
        await fetchPotentialRisks(currentUserId, currentAppPeriod);
        return true;
    }
    if (store.riskCauses.length === 0 && !store.riskCausesLoading && store.potentialRisks.length > 0) {
        await fetchRiskCauses(currentUserId, currentAppPeriod);
        return true;
    }
    if (store.controlMeasures.length === 0 && !store.controlMeasuresLoading && store.riskCauses.length > 0) {
        await fetchControlMeasures(currentUserId, currentAppPeriod);
        return true;
    }
    return false; // No base data fetch started
  }, [currentUserId, currentAppPeriod, store.goals.length, store.goalsLoading, store.potentialRisks.length, store.potentialRisksLoading, store.riskCauses.length, store.riskCausesLoading, store.controlMeasures.length, store.controlMeasuresLoading, fetchGoals, fetchPotentialRisks, fetchRiskCauses, fetchControlMeasures]);


  useEffect(() => {
    const initializePage = async () => {
      if (sessionId && currentUserId && currentAppPeriod && !authLoading) {
        console.log(`[ConductMonitoringPage] useEffect: Initializing page. SessionID: ${sessionId}`);
        setPageIsLoading(true);
        
        // Ensure base data (goals, PRs, RCs, CMs) for the current app period is available
        const fetchStarted = await ensureBaseDataFetched();
        if (fetchStarted) {
            // If base data fetching started, we'll wait for store loading flags to resolve
            // The effect below that depends on store loading flags will handle processing
            return;
        }

        // If base data is already there, proceed to fetch session specific data
        try {
          await fetchCurrentMonitoringSession(sessionId, currentUserId, currentAppPeriod);
          // fetchCurrentMonitoringSession already calls fetchRiskExposuresForSession
        } catch (error: any) {
          toast({ title: "Gagal Memuat Sesi", description: error.message || "Sesi pemantauan tidak ditemukan.", variant: "destructive" });
          router.push('/monitoring');
        }
        // Page loading will be set to false by the next useEffect when data is processed
      } else if (!authLoading && (!currentUserId || !currentAppPeriod)) {
        toast({ title: "Konteks Pengguna Hilang", description: "Sesi atau periode aktif tidak ditemukan.", variant: "destructive" });
        router.push("/monitoring");
        setPageIsLoading(false);
      }
    };
    initializePage();
  }, [sessionId, currentUserId, currentAppPeriod, authLoading, ensureBaseDataFetched, fetchCurrentMonitoringSession, router, toast]);


  useEffect(() => {
    if (currentMonitoringSession && riskCauses.length > 0 && !riskCausesLoading && !controlMeasuresLoading && !currentMonitoringSessionLoading && !store.riskExposuresLoading) {
      console.log("[ConductMonitoringPage] Data dependencies met. Processing riskCausesWithData. RiskCauses count:", riskCauses.length, "ControlMeasures count:", controlMeasures.length);
      
      // Filter risk causes based on the *session's period*, not the current app period
      const relevantRiskCauses = riskCauses.filter(
        rc => rc.userId === currentUserId && rc.period === sessionPeriod 
      );
      console.log(`[ConductMonitoringPage] Relevant RiskCauses for session period ${sessionPeriod}:`, relevantRiskCauses.length);

      const causesWithDetails = relevantRiskCauses.map(cause => {
        const existingExposure = riskExposures.find(ex => ex.riskCauseId === cause.id && ex.monitoringSessionId === sessionId);
        const relatedControls = controlMeasures.filter(cm => cm.riskCauseId === cause.id && cm.userId === currentUserId && cm.period === sessionPeriod);
        
        const initialMonitoredControls = relatedControls.map(rc => {
            const existingMonitoredControl = existingExposure?.monitoredControls?.find(mc => mc.controlMeasureId === rc.id);
            return { 
                controlMeasureId: rc.id, 
                realizationKci: existingMonitoredControl?.realizationKci ?? null,
                performancePercentage: existingMonitoredControl?.performancePercentage ?? null,
                supportingEvidenceUrl: existingMonitoredControl?.supportingEvidenceUrl ?? null,
                monitoringResultNotes: existingMonitoredControl?.monitoringResultNotes ?? '',
                followUpPlan: existingMonitoredControl?.followUpPlan ?? '',
            };
        });

        return {
          ...cause,
          exposureData: existingExposure ? {
            exposureValue: existingExposure.exposureValue,
            exposureUnit: existingExposure.exposureUnit,
            exposureNotes: existingExposure.exposureNotes || '',
            monitoredControls: initialMonitoredControls.length > 0 ? initialMonitoredControls : relatedControls.map(rc => ({ controlMeasureId: rc.id, realizationKci: null })),
          } : {
            exposureValue: null,
            exposureUnit: cause.keyRiskIndicator ? cause.keyRiskIndicator.split(' ').pop() || null : null, 
            exposureNotes: '',
            monitoredControls: relatedControls.map(rc => ({ controlMeasureId: rc.id, realizationKci: null })),
          },
          relatedControls: relatedControls,
        };
      });
      setRiskCausesWithData(causesWithDetails);
      setPageIsLoading(false);
    } else if (!authLoading && !currentMonitoringSessionLoading && !riskCausesLoading && !controlMeasuresLoading && !store.riskExposuresLoading && currentMonitoringSession === null) {
      setPageIsLoading(false);
    } else if (!authLoading && (riskCausesLoading || controlMeasuresLoading || currentMonitoringSessionLoading || store.riskExposuresLoading)) {
        setPageIsLoading(true); 
    }

  }, [
      currentMonitoringSession, riskCauses, controlMeasures, riskExposures, 
      sessionId, currentUserId, sessionPeriod, riskCausesLoading, 
      controlMeasuresLoading, currentMonitoringSessionLoading, store.riskExposuresLoading, authLoading
    ]);


  const handleExposureDataChange = (riskCauseId: string, field: keyof RiskExposureFormData, value: any) => {
    setRiskCausesWithData(prev =>
      prev.map(rc =>
        rc.id === riskCauseId
          ? { ...rc, exposureData: { ...(rc.exposureData || {monitoredControls: []}), [field]: value } as RiskExposureFormData }
          : rc
      )
    );
  };
  
  const handleMonitoredControlChange = (riskCauseId: string, controlMeasureId: string, field: keyof MonitoredControlMeasureData, value: any) => {
    setRiskCausesWithData(prev =>
      prev.map(rc => {
        if (rc.id === riskCauseId) {
          const currentExposureData = rc.exposureData || { monitoredControls: rc.relatedControls.map(ctrl => ({ controlMeasureId: ctrl.id, realizationKci: null})) };
          const updatedControls = currentExposureData.monitoredControls?.map(mc =>
            mc.controlMeasureId === controlMeasureId
              ? { ...mc, [field]: value }
              : mc
          ) || [];
          return { ...rc, exposureData: { ...currentExposureData, monitoredControls: updatedControls } as RiskExposureFormData };
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
      if (causeWithData.exposureData && (causeWithData.exposureData.exposureValue !== null || (causeWithData.exposureData.exposureNotes && causeWithData.exposureData.exposureNotes.trim() !== '') || causeWithData.exposureData.monitoredControls?.some(mc => mc.realizationKci !== null || (mc.monitoringResultNotes && mc.monitoringResultNotes.trim() !== '')))) {
        const exposurePayload: Omit<RiskExposure, 'id' | 'recordedAt' | 'updatedAt'> = {
          monitoringSessionId: sessionId,
          riskCauseId: causeWithData.id,
          potentialRiskId: causeWithData.potentialRiskId,
          goalId: causeWithData.goalId,
          userId: currentUserId,
          period: sessionPeriod, 
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
      if (currentMonitoringSession) { // Pastikan session ada
        await fetchRiskExposuresForSession(currentMonitoringSession.id, currentUserId, sessionPeriod);
      }
    } else if (errors.length === 0 && successCount === 0) {
        toast({ title: "Tidak Ada Perubahan", description: "Tidak ada data baru atau perubahan untuk disimpan.", variant: "default"});
    }
  };
  
  const calculatePerformance = useCallback((target: string | null, realization: string | number | null, kciText: string | null): number | null => {
      if (target === null || target.trim() === '' || realization === null || String(realization).trim() === '') return null;
      
      const numTarget = parseFloat(String(target).replace(/[^0-9.,-]+/g, '').replace(',', '.'));
      const numRealization = parseFloat(String(realization).replace(/[^0-9.,-]+/g, '').replace(',', '.'));

      if (isNaN(numTarget) || isNaN(numRealization) || numTarget === 0) return null;
      
      // Heuristik sederhana untuk menentukan target negatif berdasarkan teks KCI
      const isNegativeTarget = kciText?.toLowerCase().includes('maksimal') || 
                                kciText?.toLowerCase().includes('maks') || 
                                kciText?.toLowerCase().includes('tidak lebih dari') ||
                                kciText?.toLowerCase().includes('kurang dari atau sama dengan') ||
                                kciText?.toLowerCase().includes('turun') ||
                                kciText?.toLowerCase().includes('penurunan');


      let performance;
      if (isNegativeTarget) { 
          performance = ((2 * numTarget - numRealization) / numTarget) * 100;
      } else { 
          performance = (numRealization / numTarget) * 100;
      }
      return Math.max(0, Math.round(performance)); 
  },[]);

  useEffect(() => {
    // Recalculate performance when realizationKci changes
    setRiskCausesWithData(prev => prev.map(rc => {
        if (rc.exposureData?.monitoredControls) {
            const updatedMonitoredControls = rc.exposureData.monitoredControls.map(mc => {
                const controlDetail = rc.relatedControls.find(ctrl => ctrl.id === mc.controlMeasureId);
                const performance = calculatePerformance(controlDetail?.target || null, mc.realizationKci, controlDetail?.keyControlIndicator || null);
                return { ...mc, performancePercentage: performance };
            });
            return { ...rc, exposureData: { ...rc.exposureData, monitoredControls: updatedMonitoredControls } };
        }
        return rc;
    }));
  }, [calculatePerformance]); // Re-run when realizationKci in any control changes, or when calculatePerformance changes.

  if (pageIsLoading || authLoading || currentMonitoringSessionLoading || (!currentMonitoringSession && !authLoading && !currentMonitoringSessionLoading) ) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">
          {authLoading ? "Memverifikasi sesi..." : 
           currentMonitoringSessionLoading ? "Memuat detail sesi pemantauan..." :
           riskCausesLoading ? "Memuat penyebab risiko..." :
           controlMeasuresLoading ? "Memuat tindakan pengendalian..." :
           store.riskExposuresLoading ? "Memuat data paparan..." :
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


  return (
    <div className="space-y-6">
      <PageHeader
        title={`Pelaksanaan Pemantauan: ${currentMonitoringSession.name}`}
        description={`Periode Sesi: ${format(parseISO(currentMonitoringSession.startDate), "dd MMM yyyy", { locale: localeID })} - ${format(parseISO(currentMonitoringSession.endDate), "dd MMM yyyy", { locale: localeID })}. UPR: ${uprDisplayName}, Periode Sesi: ${sessionPeriod}.`}
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

      {riskCausesWithData.map((cause) => {
        const { level: causeRiskLevelText } = getCalculatedRiskLevel(cause.likelihood, cause.impact);
        const numericTolerance = cause.riskTolerance ? parseFloat(cause.riskTolerance.replace(/[^0-9.,-]+/g, '').replace(',', '.')) : NaN;
        
        let exposureComparisonGuidance = "";
        if (cause.exposureData?.exposureValue !== null && cause.exposureData?.exposureValue !== undefined && !isNaN(numericTolerance)) {
            if (cause.exposureData.exposureValue >= numericTolerance) {
                exposureComparisonGuidance = "PERHATIAN: Paparan Risiko (Risk Exposure) ≥ Toleransi Risiko. Pertimbangkan Tindakan Mitigasi (RM) dan perbaiki/susun Tindakan Korektif (Crr).";
            } else {
                exposureComparisonGuidance = "INFO: Paparan Risiko < Toleransi Risiko. Lanjutkan pengendalian sesuai rencana. Perbaiki jika perlu.";
            }
        }
        const causeFullCode = `${store.goals.find(g=>g.id === cause.goalId)?.code || 'G?'}.PR${store.potentialRisks.find(pr=>pr.id === cause.potentialRiskId)?.sequenceNumber || '?'}.PC${cause.sequenceNumber || '?'}`;

        return (
          <Card key={cause.id}>
            <CardHeader>
              <CardTitle className="text-base">
                {causeFullCode}: {cause.description}
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
                  <Label htmlFor={`exposureValue-${cause.id}`} className="text-xs">Nilai Risiko Terjadi (Risk Exposure)</Label>
                  <Input
                    id={`exposureValue-${cause.id}`}
                    type="number"
                    placeholder="Masukkan nilai paparan"
                    value={cause.exposureData?.exposureValue ?? ''}
                    onChange={(e) => handleExposureDataChange(cause.id, 'exposureValue', e.target.value === '' ? null : parseFloat(e.target.value))}
                    className="text-xs h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`exposureUnit-${cause.id}`} className="text-xs">Satuan Paparan</Label>
                  <Input
                    id={`exposureUnit-${cause.id}`}
                    placeholder="Misal: Kejadian, %, Rp"
                    value={cause.exposureData?.exposureUnit ?? ''}
                    onChange={(e) => handleExposureDataChange(cause.id, 'exposureUnit', e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
                 <div className="space-y-1.5 md:col-span-3">
                  <Label htmlFor={`exposureNotes-${cause.id}`} className="text-xs">Catatan Paparan Risiko</Label>
                  <Textarea
                    id={`exposureNotes-${cause.id}`}
                    placeholder="Catatan terkait observasi paparan risiko..."
                    value={cause.exposureData?.exposureNotes ?? ''}
                    onChange={(e) => handleExposureDataChange(cause.id, 'exposureNotes', e.target.value)}
                    rows={2}
                    className="text-xs"
                  />
                </div>
              </div>
              {exposureComparisonGuidance && (
                <Alert variant={cause.exposureData?.exposureValue !== null && !isNaN(numericTolerance) && cause.exposureData?.exposureValue >= numericTolerance ? "destructive" : "default"} className="mt-2 text-xs">
                    {cause.exposureData?.exposureValue !== null && !isNaN(numericTolerance) && cause.exposureData?.exposureValue >= numericTolerance ? <AlertTriangle className="h-4 w-4"/> : <Info className="h-4 w-4"/> }
                    <AlertTitle className="font-semibold text-xs">Panduan Tindak Lanjut</AlertTitle>
                    <AlertDescription className="text-xs">{exposureComparisonGuidance}</AlertDescription>
                </Alert>
              )}

              <Separator />
              <h4 className="font-semibold text-sm">Pemantauan Tindakan Pengendalian</h4>
              <p className="text-xs text-muted-foreground mb-2">Rekomendasi berdasarkan tingkat risiko penyebab: {getControlGuidance(causeRiskLevelText as CalculatedRiskLevelCategory)}</p>
              
              {cause.relatedControls.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Belum ada tindakan pengendalian yang disusun untuk penyebab risiko ini.</p>
              ) : (
                <Accordion type="multiple" className="w-full text-xs">
                  {cause.relatedControls.map((control) => {
                    const monitoredControlData = cause.exposureData?.monitoredControls?.find(mc => mc.controlMeasureId === control.id) 
                                              || { controlMeasureId: control.id, realizationKci: null };
                    const performance = monitoredControlData.performancePercentage; 
                    const controlFullCode = `${causeFullCode}.${control.controlType}.${control.sequenceNumber}`;
                    
                    return (
                      <AccordionItem value={control.id} key={control.id}>
                        <AccordionTrigger className="hover:no-underline py-2 text-xs">
                          <div className="flex justify-between w-full items-center pr-2">
                            <span className="font-medium">{controlFullCode} - {control.description}</span>
                            <Badge variant="outline">{store.getControlTypeName(control.controlType)}</Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-3 pt-1 space-y-3 bg-muted/10 p-3 rounded-md">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                            <div><strong>KCI:</strong> {control.keyControlIndicator || '-'}</div>
                            <div><strong>Target KCI:</strong> {control.target || '-'}</div>
                            <div><strong>Penanggung Jawab:</strong> {control.responsiblePerson || '-'}</div>
                            <div><strong>Waktu:</strong> {control.deadline && isValidDate(parseISO(control.deadline)) ? format(parseISO(control.deadline), "dd/MM/yyyy", { locale: localeID }) : '-'}</div>
                            <div className="col-span-1 sm:col-span-2"><strong>Anggaran:</strong> Rp {(control.budget || 0).toLocaleString('id-ID')}</div>
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
                             {performance !== null && performance !== undefined && (
                                <p className="text-xs mt-1">
                                  <strong>Kinerja Pengendalian: </strong> 
                                  <Badge variant={performance >= 80 ? "default" : performance >=50 ? "secondary" : "destructive"} 
                                         className={`${performance >= 80 ? 'bg-green-500' : performance >= 50 ? 'bg-yellow-500 text-black' : 'bg-red-500'} text-white`}>
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
                             />
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

    