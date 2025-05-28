
"use server";

import { db } from '@/lib/firebase/config';
import type { RiskExposure } from '@/lib/types';
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  setDoc, // Untuk upsert
  getDoc, // Digunakan untuk mengambil satu dokumen
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { RISK_EXPOSURES_COLLECTION } from './collectionNames';

// Fungsi untuk mengambil semua data paparan risiko untuk sesi pemantauan tertentu
export async function getRiskExposuresBySession(
  monitoringSessionId: string,
  userId: string,
  period: string // Periode sesi pemantauan itu sendiri
): Promise<RiskExposure[]> {
  if (!monitoringSessionId || !userId || !period) {
    console.warn("[riskExposureService] getRiskExposuresBySession: Missing required IDs.", { monitoringSessionId, userId, period });
    return [];
  }
  try {
    console.log(`[riskExposureService] Fetching exposures for session: ${monitoringSessionId}, user: ${userId}, sessionPeriod: ${period}`);
    const q = query(
      collection(db, RISK_EXPOSURES_COLLECTION),
      where("monitoringSessionId", "==", monitoringSessionId),
      where("userId", "==", userId),
      where("period", "==", period), // period di sini adalah periode sesi
      orderBy("riskCauseId", "asc") // Atau urutkan berdasarkan yang lain jika perlu, misal sequenceNumber penyebab
    );
    const querySnapshot = await getDocs(q);
    const exposures: RiskExposure[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const recordedAtTimestamp = data.recordedAt instanceof Timestamp ? data.recordedAt.toDate() : (data.recordedAt ? new Date(data.recordedAt) : new Date());
      const updatedAtTimestamp = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : null);
      
      exposures.push({
        id: docSnap.id, // id dokumen adalah gabungan sessionId_riskCauseId
        ...data,
        recordedAt: recordedAtTimestamp.toISOString(),
        updatedAt: updatedAtTimestamp ? updatedAtTimestamp.toISOString() : undefined,
      } as RiskExposure);
    });
    console.log(`[riskExposureService] Fetched ${exposures.length} risk exposures for session ${monitoringSessionId}.`);
    return exposures;
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error("[riskExposureService] Error getting risk exposures from Firestore: ", errorMessage, error.code, error);
    let detailedErrorMessage = "Gagal mengambil data paparan risiko.";
    if (error.code === 'failed-precondition') {
      detailedErrorMessage += " Ini mungkin karena indeks komposit yang hilang. Periksa Firebase Console (Firestore Database > Indexes) dan buat indeks yang disarankan jika ada.";
    } else {
      detailedErrorMessage += ` Pesan: ${errorMessage}`;
    }
    throw new Error(detailedErrorMessage);
  }
}

// Fungsi untuk membuat atau memperbarui data paparan risiko (upsert)
// ID dokumen akan sama dengan monitoringSessionId_riskCauseId untuk memastikan satu entri per penyebab per sesi
export async function upsertRiskExposure(
  data: Omit<RiskExposure, 'id' | 'recordedAt' | 'updatedAt'>
): Promise<RiskExposure> {
  if (!data.riskCauseId || !data.monitoringSessionId || !data.userId || !data.period) {
    throw new Error("Data tidak lengkap untuk menyimpan paparan risiko (membutuhkan riskCauseId, monitoringSessionId, userId, period sesi).");
  }
  
  const docId = `${data.monitoringSessionId}_${data.riskCauseId}`; // ID gabungan untuk unik
  const docRef = doc(db, RISK_EXPOSURES_COLLECTION, docId);

  try {
    let recordedAtTimestampToSet: any = serverTimestamp(); // Default untuk pembuatan baru

    // Cek apakah dokumen sudah ada untuk menentukan apakah ini create atau update
    const existingDocSnap = await getDoc(docRef);
    if (existingDocSnap.exists()) {
      // Jika dokumen ada, jangan set ulang recordedAt, biarkan nilai yang ada
      recordedAtTimestampToSet = existingDocSnap.data().recordedAt || serverTimestamp(); // Gunakan yang ada atau fallback
    }
    
    const docDataToSave = {
      ...data,
      exposureValue: data.exposureValue === undefined ? null : data.exposureValue,
      exposureUnit: data.exposureUnit === undefined ? null : data.exposureUnit,
      exposureNotes: data.exposureNotes === undefined ? null : data.exposureNotes,
      monitoredControls: Array.isArray(data.monitoredControls) ? data.monitoredControls.map(mc => ({
        ...mc,
        realizationKci: mc.realizationKci === undefined ? null : mc.realizationKci,
        performancePercentage: mc.performancePercentage === undefined ? null : mc.performancePercentage,
        supportingEvidenceUrl: mc.supportingEvidenceUrl === undefined ? null : mc.supportingEvidenceUrl,
        monitoringResultNotes: mc.monitoringResultNotes === undefined ? '' : mc.monitoringResultNotes,
        followUpPlan: mc.followUpPlan === undefined ? '' : mc.followUpPlan,
      })) : [],
      recordedAt: recordedAtTimestampToSet,
      updatedAt: serverTimestamp(),
    };

    console.log("[riskExposureService] Data to upsert RiskExposure (ID: " + docId + "):", JSON.stringify(docDataToSave, null, 2));
    await setDoc(docRef, docDataToSave, { merge: true }); // Gunakan merge: true untuk update atau create

    // Ambil data yang baru saja di-upsert untuk mendapatkan timestamp server yang benar
    const finalDocSnap = await getDoc(docRef);
    if (!finalDocSnap.exists()) {
        console.error("[riskExposureService] Document not found after upsert:", docId);
        throw new Error("Dokumen paparan risiko tidak ditemukan setelah operasi simpan/perbarui.");
    }
    const finalData = finalDocSnap.data();
    
    const recordedAt = finalData.recordedAt instanceof Timestamp 
                       ? finalData.recordedAt.toDate().toISOString() 
                       : (finalData.recordedAt ? new Date(finalData.recordedAt).toISOString() : new Date().toISOString());
    const updatedAt = finalData.updatedAt instanceof Timestamp 
                      ? finalData.updatedAt.toDate().toISOString() 
                      : new Date().toISOString(); // updatedAt pasti ada setelah serverTimestamp()

    return {
      id: finalDocSnap.id,
      ...finalData,
      recordedAt,
      updatedAt,
    } as RiskExposure;

  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error("[riskExposureService] Error upserting risk exposure: ", errorMessage);
    throw new Error(`Gagal menyimpan data paparan risiko. Pesan: ${errorMessage}`);
  }
}

    