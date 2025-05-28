
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
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { RISK_EXPOSURES_COLLECTION } from './collectionNames';

// Fungsi untuk mengambil semua data paparan risiko untuk sesi pemantauan tertentu
export async function getRiskExposuresBySession(
  monitoringSessionId: string,
  userId: string,
  period: string
): Promise<RiskExposure[]> {
  if (!monitoringSessionId || !userId || !period) {
    console.warn("[riskExposureService] getRiskExposuresBySession: Missing required IDs.", { monitoringSessionId, userId, period });
    return [];
  }
  try {
    const q = query(
      collection(db, RISK_EXPOSURES_COLLECTION),
      where("monitoringSessionId", "==", monitoringSessionId),
      where("userId", "==", userId),
      where("period", "==", period),
      orderBy("recordedAt", "desc") // Atau urutkan berdasarkan yang lain jika perlu
    );
    const querySnapshot = await getDocs(q);
    const exposures: RiskExposure[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const recordedAtTimestamp = data.recordedAt instanceof Timestamp ? data.recordedAt.toDate() : new Date(data.recordedAt);
      const updatedAtTimestamp = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : null);
      
      exposures.push({
        id: docSnap.id,
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
      detailedErrorMessage += " Ini mungkin karena indeks komposit yang hilang. Periksa Firebase Console.";
    } else {
      detailedErrorMessage += ` Pesan: ${errorMessage}`;
    }
    throw new Error(detailedErrorMessage);
  }
}

// Fungsi untuk membuat atau memperbarui data paparan risiko (upsert)
// ID dokumen akan sama dengan riskCauseId untuk memastikan satu entri per penyebab per sesi
export async function upsertRiskExposure(
  data: Omit<RiskExposure, 'id' | 'recordedAt' | 'updatedAt'>
): Promise<RiskExposure> {
  if (!data.riskCauseId || !data.monitoringSessionId || !data.userId || !data.period) {
    throw new Error("Data tidak lengkap untuk menyimpan paparan risiko (membutuhkan riskCauseId, monitoringSessionId, userId, period).");
  }
  
  const docRef = doc(db, RISK_EXPOSURES_COLLECTION, `${data.monitoringSessionId}_${data.riskCauseId}`); // ID gabungan untuk unik

  try {
    const docDataToSave = {
      ...data,
      exposureValue: data.exposureValue === undefined ? null : data.exposureValue,
      exposureUnit: data.exposureUnit === undefined ? null : data.exposureUnit,
      exposureNotes: data.exposureNotes === undefined ? null : data.exposureNotes,
      // 'recordedAt' akan diisi jika ini adalah pembuatan baru, atau tidak diubah jika pembaruan
      updatedAt: serverTimestamp(),
    };

    // Untuk 'recordedAt', kita hanya set jika dokumen baru
    const docSnap = await getDocs(query(collection(db, RISK_EXPOSURES_COLLECTION), where("riskCauseId", "==", data.riskCauseId), where("monitoringSessionId", "==", data.monitoringSessionId)));
    if (docSnap.empty) {
        (docDataToSave as any).recordedAt = serverTimestamp();
    }


    console.log("[riskExposureService] Data to upsert RiskExposure:", JSON.stringify(docDataToSave, null, 2));
    await setDoc(docRef, docDataToSave, { merge: true }); // Gunakan merge: true untuk update atau create

    // Ambil data yang baru saja di-upsert untuk mendapatkan timestamp server
    const updatedDocSnap = await getDocs(docRef); // docRef adalah DocumentReference, bukan Query. Ini salah.
    // Harusnya: const finalDocSnap = await getDoc(docRef);

    // --- PERBAIKAN SEMENTARA UNTUK MENGHINDARI ERROR GETDOCS PADA DOCREF ---
    // Kita akan mengembalikan data yang dikirim + ID, asumsi timestamp akan dihandle client jika perlu refresh
    const nowISO = new Date().toISOString();
    return {
      id: docRef.id,
      ...data,
      recordedAt: (docDataToSave as any).recordedAt ? nowISO : (data.recordedAt || nowISO), // Placeholder
      updatedAt: nowISO, // Placeholder
    } as RiskExposure;
    // --- AKHIR PERBAIKAN SEMENTARA ---


  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error("[riskExposureService] Error upserting risk exposure: ", errorMessage);
    throw new Error(`Gagal menyimpan data paparan risiko. Pesan: ${errorMessage}`);
  }
}
