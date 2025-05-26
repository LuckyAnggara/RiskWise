
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

export async function addRiskCause(
  data: Omit<RiskCause, 'id' | 'createdAt' | 'uprId' | 'period' | 'userId' | 'potentialRiskId' | 'goalId' | 'sequenceNumber' >,
  potentialRiskId: string,
  goalId: string,
  uprId: string,
  period: string,
  userId: string,
  sequenceNumber: number
): Promise<RiskCause> {
  try {
    const docRef = await addDoc(collection(db, RISK_CAUSES_COLLECTION), {
      ...data,
      potentialRiskId,
      goalId,
      uprId,
      period,
      userId,
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
      uprId,
      period,
      userId,
      sequenceNumber,
      createdAt: new Date().toISOString(), // Placeholder
    };
  } catch (error: any) {
    console.error("Error adding risk cause to Firestore: ", error.message, error.code, error);
    throw new Error(`Gagal menambahkan penyebab risiko ke database. Pesan: ${error.message}`);
  }
}

export async function getRiskCausesByPotentialRiskId(potentialRiskId: string, uprId: string, period: string): Promise<RiskCause[]> {
  try {
    const q = query(
      collection(db, RISK_CAUSES_COLLECTION),
      where("potentialRiskId", "==", potentialRiskId),
      where("uprId", "==", uprId),
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
    console.error("Error getting risk causes from Firestore: ", error.message, error.code, error.details);
    let detailedErrorMessage = "Gagal mengambil daftar penyebab risiko dari database.";
    if (error.code === 'failed-precondition') {
        detailedErrorMessage += " Ini seringkali disebabkan oleh indeks komposit yang hilang di Firestore. Silakan periksa Firebase Console Anda (Firestore Database > Indexes) untuk membuat indeks yang diperlukan. Link untuk membuat indeks mungkin ada di log error server/konsol browser Anda.";
    } else if (error.message) {
        detailedErrorMessage += ` Pesan Asli: ${error.message}`;
    }
    throw new Error(detailedErrorMessage);
  }
}

export async function getRiskCauseById(id: string): Promise<RiskCause | null> {
  try {
    const docRef = doc(db, RISK_CAUSES_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
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
    console.error("Error getting risk cause by ID from Firestore: ", error.message, error.code, error);
    throw new Error(`Gagal mengambil detail penyebab risiko dari database. Pesan: ${error.message}`);
  }
}

export async function updateRiskCause(id: string, data: Partial<Omit<RiskCause, 'id' | 'potentialRiskId' | 'goalId' | 'uprId' | 'period' | 'userId' | 'createdAt' | 'sequenceNumber'>>): Promise<void> {
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
    console.error("Error updating risk cause in Firestore: ", error.message, error.code, error);
    throw new Error(`Gagal memperbarui penyebab risiko di database. Pesan: ${error.message}`);
  }
}

export async function deleteRiskCauseAndSubCollections(riskCauseId: string, uprId: string, period: string, batch?: WriteBatch): Promise<void> {
  const localBatch = batch || writeBatch(db);
  try {
    const controlsQuery = query(
      collection(db, CONTROL_MEASURES_COLLECTION),
      where("riskCauseId", "==", riskCauseId),
      where("uprId", "==", uprId),
      where("period", "==", period)
    );
    const controlsSnapshot = await getDocs(controlsQuery);
    controlsSnapshot.forEach(doc => {
      localBatch.delete(doc.ref);
    });

    const riskCauseRef = doc(db, RISK_CAUSES_COLLECTION, riskCauseId);
    localBatch.delete(riskCauseRef);

    if (!batch) {
      await localBatch.commit();
    }
  } catch (error: any) {
    console.error("Error deleting risk cause and its control measures: ", error.message, error.code, error);
    throw new Error(`Gagal menghapus penyebab risiko dan tindakan pengendalian terkait. Pesan: ${error.message}`);
  }
}
