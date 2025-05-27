
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
// Import deleteControlMeasure if it's directly used here for individual deletion,
// otherwise, if deleteRiskCauseAndSubCollections handles it, it's fine.
// For now, assuming deleteRiskCauseAndSubCollections handles children.

export async function addRiskCause(
  data: Omit<RiskCause, 'id' | 'createdAt' | 'period' | 'userId' | 'potentialRiskId' | 'goalId' | 'sequenceNumber' >,
  potentialRiskId: string,
  goalId: string,
  userId: string,
  period: string,
  sequenceNumber: number
): Promise<RiskCause> {
  try {
    const docRef = await addDoc(collection(db, RISK_CAUSES_COLLECTION), {
      ...data,
      potentialRiskId,
      goalId,
      userId,
      period,
      sequenceNumber,
      createdAt: serverTimestamp(),
      keyRiskIndicator: data.keyRiskIndicator || null,
      riskTolerance: data.riskTolerance || null,
      likelihood: data.likelihood || null,
      impact: data.impact || null,
    });
    return {
      id: docRef.id,
      ...data,
      potentialRiskId,
      goalId,
      userId,
      period,
      sequenceNumber,
      createdAt: new Date().toISOString(), 
    };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error adding risk cause to Firestore: ", errorMessage);
    throw new Error(`Gagal menambahkan penyebab risiko ke database. Pesan: ${errorMessage}`);
  }
}

export async function getRiskCausesByPotentialRiskId(potentialRiskId: string, userId: string, period: string): Promise<RiskCause[]> {
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
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const createdAtISO = data.createdAt instanceof Timestamp
                           ? data.createdAt.toDate().toISOString()
                           : (data.createdAt && typeof data.createdAt === 'string' ? new Date(data.createdAt).toISOString() : new Date().toISOString());
      const analysisUpdatedAtISO = data.analysisUpdatedAt instanceof Timestamp
                           ? data.analysisUpdatedAt.toDate().toISOString()
                           : (data.analysisUpdatedAt && typeof data.analysisUpdatedAt === 'string' ? new Date(data.analysisUpdatedAt).toISOString() : undefined);
      
      riskCauses.push({ 
        id: doc.id, 
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error getting risk causes from Firestore: ", errorMessage, error.code, error);
    let detailedErrorMessage = "Gagal mengambil daftar penyebab risiko dari database.";
    if (error instanceof Error && error.message) {
        detailedErrorMessage += ` Pesan Asli: ${error.message}`;
    }
    if ((error as any).code === 'failed-precondition') {
        detailedErrorMessage += " Ini seringkali disebabkan oleh indeks komposit yang hilang di Firestore. Silakan periksa Firebase Console Anda (Firestore Database > Indexes) untuk membuat indeks yang diperlukan. Link untuk membuat indeks mungkin ada di log error server/konsol browser Anda.";
    }
    throw new Error(detailedErrorMessage);
  }
}

export async function getRiskCauseById(id: string, userId: string, period: string): Promise<RiskCause | null> {
  try {
    if (!userId || !period) {
      console.warn(`[riskCauseService] getRiskCauseById: userId or period is missing for id ${id}`);
      return null;
    }
    const docRef = doc(db, RISK_CAUSES_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.userId !== userId || data.period !== period) {
        console.warn(`RiskCause ${id} found, but does not match current user/period context. Expected User: ${userId}, Period: ${period}. Found: User: ${data.userId}, Period: ${data.period}`);
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
    return null;
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error getting risk cause by ID from Firestore: ", errorMessage);
    throw new Error(`Gagal mengambil detail penyebab risiko dari database. Pesan: ${errorMessage}`);
  }
}

export async function updateRiskCause(id: string, data: Partial<Omit<RiskCause, 'id' | 'potentialRiskId' | 'goalId' | 'userId' | 'period' | 'createdAt' | 'sequenceNumber'>>): Promise<void> {
  try {
    const docRef = doc(db, RISK_CAUSES_COLLECTION, id);
    await updateDoc(docRef, {
        ...data,
        keyRiskIndicator: data.keyRiskIndicator === undefined ? undefined : (data.keyRiskIndicator || null),
        riskTolerance: data.riskTolerance === undefined ? undefined : (data.riskTolerance || null),
        likelihood: data.likelihood === undefined ? undefined : (data.likelihood || null),
        impact: data.impact === undefined ? undefined : (data.impact || null),
        analysisUpdatedAt: serverTimestamp()
    });
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error updating risk cause in Firestore: ", errorMessage);
    throw new Error(`Gagal memperbarui penyebab risiko di database. Pesan: ${errorMessage}`);
  }
}

export async function deleteRiskCauseAndSubCollections(riskCauseId: string, userId: string, period: string, batch?: WriteBatch): Promise<void> {
  const localBatch = batch || writeBatch(db);
  try {
    // Ensure the risk cause belongs to the user and period before deleting
    const riskCauseRef = doc(db, RISK_CAUSES_COLLECTION, riskCauseId);
    const rcDoc = await getDoc(riskCauseRef);
    if (rcDoc.exists()) {
        const rcData = rcDoc.data();
        if (rcData.userId !== userId || rcData.period !== period) {
            throw new Error("Penyebab Risiko tidak dapat dihapus: tidak cocok dengan konteks pengguna/periode.");
        }
    } else {
        console.warn(`Penyebab Risiko dengan ID ${riskCauseId} tidak ditemukan saat mencoba menghapus sub-koleksi.`);
        if(!batch) return; 
    }


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

    localBatch.delete(riskCauseRef);

    if (!batch) { // If this function initiated the batch, commit it.
      await localBatch.commit();
    }
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error deleting risk cause and its control measures: ", errorMessage);
    throw new Error(`Gagal menghapus penyebab risiko dan tindakan pengendalian terkait. Pesan: ${errorMessage}`);
  }
}
