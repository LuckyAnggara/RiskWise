
"use server";

import { db } from '@/lib/firebase/config';
import type { RiskCause } from '@/lib/types';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  serverTimestamp,
  getDoc,
  writeBatch,
  type WriteBatch
} from 'firebase/firestore';
import { RISK_CAUSES_COLLECTION, CONTROL_MEASURES_COLLECTION } from './collectionNames';
import { deleteControlMeasure } from './controlMeasureService'; // Untuk cascading delete

export async function addRiskCause(
  data: Omit<RiskCause, 'id' | 'createdAt' | 'userId' | 'period' | 'potentialRiskId' | 'goalId' | 'sequenceNumber' >,
  potentialRiskId: string,
  goalId: string,
  userId: string,
  period: string,
  sequenceNumber: number
): Promise<RiskCause> {
  if (!userId || !period || !potentialRiskId || !goalId) {
    throw new Error("Konteks ID (pengguna, periode, potensi risiko, atau sasaran) tidak valid untuk menambah penyebab risiko.");
  }
  try {
    const docDataToSave = {
      ...data,
      potentialRiskId,
      goalId,
      userId,
      period,
      sequenceNumber,
      keyRiskIndicator: data.keyRiskIndicator || null,
      riskTolerance: data.riskTolerance || null,
      likelihood: data.likelihood || null,
      impact: data.impact || null,
      createdAt: serverTimestamp(),
      analysisUpdatedAt: data.analysisUpdatedAt ? Timestamp.fromDate(new Date(data.analysisUpdatedAt)) : null,
    };
    const docRef = await addDoc(collection(db, RISK_CAUSES_COLLECTION), docDataToSave);
    
    const newDocSnap = await getDoc(docRef);
    if (!newDocSnap.exists()) {
        throw new Error("Gagal mengambil dokumen penyebab risiko yang baru dibuat.");
    }
    const newDocData = newDocSnap.data();
    const createdAtTimestamp = newDocData.createdAt instanceof Timestamp ? newDocData.createdAt.toDate() : new Date();
    const analysisUpdatedAtTimestamp = newDocData.analysisUpdatedAt instanceof Timestamp ? newDocData.analysisUpdatedAt.toDate() : (newDocData.analysisUpdatedAt ? new Date(newDocData.analysisUpdatedAt) : null);

    return {
      id: docRef.id,
      ...data,
      potentialRiskId,
      goalId,
      userId,
      period,
      sequenceNumber,
      createdAt: createdAtTimestamp.toISOString(),
      analysisUpdatedAt: analysisUpdatedAtTimestamp ? analysisUpdatedAtTimestamp.toISOString() : undefined,
    } as RiskCause;
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error("[riskCauseService] Error adding risk cause to Firestore: ", errorMessage);
    throw new Error(`Gagal menambahkan penyebab risiko ke database. Pesan: ${errorMessage}`);
  }
}

export async function getRiskCausesByPotentialRiskId(potentialRiskId: string, userId: string, period: string): Promise<RiskCause[]> {
  if (!userId || !period || !potentialRiskId) {
    console.warn("[riskCauseService] getRiskCausesByPotentialRiskId: Missing required IDs.", { userId, period, potentialRiskId });
    return [];
  }
  try {
    const q = query(
      collection(db, RISK_CAUSES_COLLECTION),
      where("potentialRiskId", "==", potentialRiskId),
      where("userId", "==", userId),
      where("period", "==", period),
      orderBy("sequenceNumber", "asc")
    );
    const querySnapshot = await getDocs(q);
    const riskCauses: RiskCause[] = [];
    querySnapshot.forEach((docSnap) => { // Renamed doc to docSnap
      const data = docSnap.data();
      const createdAtISO = data.createdAt instanceof Timestamp
                           ? data.createdAt.toDate().toISOString()
                           : (data.createdAt && typeof data.createdAt === 'string' ? new Date(data.createdAt).toISOString() : new Date().toISOString());
      const analysisUpdatedAtISO = data.analysisUpdatedAt instanceof Timestamp
                           ? data.analysisUpdatedAt.toDate().toISOString()
                           : (data.analysisUpdatedAt && typeof data.analysisUpdatedAt === 'string' ? new Date(data.analysisUpdatedAt).toISOString() : undefined);
      
      riskCauses.push({ 
        id: docSnap.id, 
        ...data, 
        createdAt: createdAtISO, 
        analysisUpdatedAt: analysisUpdatedAtISO,
        keyRiskIndicator: data.keyRiskIndicator || null,
        riskTolerance: data.riskTolerance || null,
        likelihood: data.likelihood || null,
        impact: data.impact || null,
      } as RiskCause);
    });
    return riskCauses;
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error("[riskCauseService] Error getting risk causes from Firestore: ", errorMessage, error.code, error);
    let detailedErrorMessage = "Gagal mengambil daftar penyebab risiko dari database.";
    if (error.code === 'failed-precondition') {
        detailedErrorMessage += " Ini seringkali disebabkan oleh indeks komposit yang hilang di Firestore. Silakan periksa Firebase Console Anda (Firestore Database > Indexes) untuk membuat indeks yang diperlukan. Link untuk membuat indeks mungkin ada di log error server/konsol browser Anda.";
    } else {
        detailedErrorMessage += ` Pesan Asli: ${errorMessage}`;
    }
    throw new Error(detailedErrorMessage);
  }
}

export async function getRiskCauseById(id: string, userId: string, period: string): Promise<RiskCause | null> {
   if (!id || !userId || !period) {
    console.warn(`[riskCauseService] getRiskCauseById: ID, userId, or period is missing.`, {id, userId, period});
    return null;
  }
  try {
    const docRef = doc(db, RISK_CAUSES_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.userId !== userId || data.period !== period) {
        console.warn(`[riskCauseService] RiskCause ${id} found, but does not match current user/period context. Expected User: ${userId}, Period: ${period}. Found: User: ${data.userId}, Period: ${data.period}`);
        return null;
      }

      const createdAtISO = data.createdAt instanceof Timestamp
                           ? data.createdAt.toDate().toISOString()
                           : (data.createdAt && typeof data.createdAt === 'string' ? new Date(data.createdAt).toISOString() : new Date().toISOString());
      const analysisUpdatedAtISO = data.analysisUpdatedAt instanceof Timestamp
                           ? data.analysisUpdatedAt.toDate().toISOString()
                           : (data.analysisUpdatedAt && typeof data.analysisUpdatedAt === 'string' ? new Date(data.analysisUpdatedAt).toISOString() : undefined);
      return { 
        id: docSnap.id, 
        ...data, 
        createdAt: createdAtISO, 
        analysisUpdatedAt: analysisUpdatedAtISO,
        keyRiskIndicator: data.keyRiskIndicator || null,
        riskTolerance: data.riskTolerance || null,
        likelihood: data.likelihood || null,
        impact: data.impact || null,
      } as RiskCause;
    }
    console.warn(`[riskCauseService] RiskCause with ID ${id} not found.`);
    return null;
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error("[riskCauseService] Error getting risk cause by ID from Firestore: ", errorMessage);
    throw new Error(`Gagal mengambil detail penyebab risiko dari database. Pesan: ${errorMessage}`);
  }
}

export async function updateRiskCause(id: string, data: Partial<Omit<RiskCause, 'id' | 'potentialRiskId' | 'goalId' | 'userId' | 'period' | 'createdAt' | 'sequenceNumber'>>): Promise<RiskCause | null> {
  if (!id) {
    throw new Error("ID Penyebab Risiko tidak valid untuk pembaruan.");
  }
  try {
    const docRef = doc(db, RISK_CAUSES_COLLECTION, id);
    const updateData = {
        ...data,
        keyRiskIndicator: data.keyRiskIndicator === undefined ? undefined : (data.keyRiskIndicator || null),
        riskTolerance: data.riskTolerance === undefined ? undefined : (data.riskTolerance || null),
        likelihood: data.likelihood === undefined ? undefined : (data.likelihood || null),
        impact: data.impact === undefined ? undefined : (data.impact || null),
        analysisUpdatedAt: serverTimestamp()
    };
    await updateDoc(docRef, updateData);

    const updatedDocSnap = await getDoc(docRef);
    if (!updatedDocSnap.exists()) {
        throw new Error("Dokumen penyebab risiko tidak ditemukan setelah pembaruan.");
    }
    const updatedDocData = updatedDocSnap.data();
    const createdAtTimestamp = updatedDocData.createdAt instanceof Timestamp ? updatedDocData.createdAt.toDate() : new Date(updatedDocData.createdAt);
    const analysisUpdatedAtTimestamp = updatedDocData.analysisUpdatedAt instanceof Timestamp ? updatedDocData.analysisUpdatedAt.toDate() : new Date();

    return {
        id: updatedDocSnap.id,
        ...updatedDocData,
        createdAt: createdAtTimestamp.toISOString(),
        analysisUpdatedAt: analysisUpdatedAtTimestamp.toISOString(),
    } as RiskCause;
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error("[riskCauseService] Error updating risk cause in Firestore: ", errorMessage);
    throw new Error(`Gagal memperbarui penyebab risiko di database. Pesan: ${errorMessage}`);
  }
}

export async function deleteRiskCauseAndSubCollections(riskCauseId: string, userId: string, period: string, batch?: WriteBatch): Promise<void> {
  if (!riskCauseId || !userId || !period) {
    throw new Error("ID Penyebab Risiko, User ID, atau Periode tidak valid untuk penghapusan.");
  }
  const localBatch = batch || writeBatch(db);
  const riskCauseRef = doc(db, RISK_CAUSES_COLLECTION, riskCauseId);
  
  try {
    const rcDoc = await getDoc(riskCauseRef);
    if (rcDoc.exists()) {
        const rcData = rcDoc.data();
        if (rcData.userId !== userId || rcData.period !== period) {
            throw new Error("Operasi tidak diizinkan: penyebab risiko tidak cocok dengan konteks pengguna/periode.");
        }
    } else {
        console.warn(`[riskCauseService] Penyebab Risiko dengan ID ${riskCauseId} tidak ditemukan saat mencoba menghapus.`);
        if(!batch) { /* Jika fungsi ini memulai batch, commit (atau tidak lakukan apa-apa jika dokumen tidak ditemukan) */ }
        return; 
    }

    // Delete related ControlMeasures
    const controlsQuery = query(
      collection(db, CONTROL_MEASURES_COLLECTION),
      where("riskCauseId", "==", riskCauseId),
      where("userId", "==", userId),
      where("period", "==", period)
    );
    const controlsSnapshot = await getDocs(controlsQuery);
    controlsSnapshot.forEach(controlDoc => {
      localBatch.delete(controlDoc.ref);
    });
    console.log(`[riskCauseService] Added ${controlsSnapshot.size} ControlMeasures to batch for deletion for RiskCause ${riskCauseId}.`);

    localBatch.delete(riskCauseRef);
    console.log(`[riskCauseService] RiskCause ${riskCauseId} added to batch for deletion.`);

    if (!batch) { 
      await localBatch.commit();
      console.log(`[riskCauseService] RiskCause ${riskCauseId} and related ControlMeasures committed for deletion.`);
    }
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error("[riskCauseService] Error deleting risk cause and its control measures: ", errorMessage);
    if (!(error.message && error.message.toLowerCase().includes("no document to update")) && !(error.message && error.message.toLowerCase().includes("document to update"))){
        throw new Error(`Gagal menghapus penyebab risiko dan tindakan pengendalian terkait. Pesan: ${errorMessage}`);
    } else {
        console.warn("[riskCauseService] Skipped re-throwing error during cascading delete, likely already deleted or batch issue:", errorMessage);
    }
  }
}

    