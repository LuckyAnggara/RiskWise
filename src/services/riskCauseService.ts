
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
  } catch (error) {
    console.error("Error adding risk cause to Firestore: ", error);
    throw new Error("Gagal menambahkan penyebab risiko ke database.");
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
                           : (data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString());
      const analysisUpdatedAtISO = data.analysisUpdatedAt instanceof Timestamp
                           ? data.analysisUpdatedAt.toDate().toISOString()
                           : (data.analysisUpdatedAt ? new Date(data.analysisUpdatedAt).toISOString() : undefined);
      riskCauses.push({ id: doc.id, ...data, createdAt: createdAtISO, analysisUpdatedAt: analysisUpdatedAtISO } as RiskCause);
    });
    return riskCauses;
  } catch (error) {
    console.error("Error getting risk causes from Firestore: ", error);
    throw new Error("Gagal mengambil daftar penyebab risiko dari database.");
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
                           : (data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString());
      const analysisUpdatedAtISO = data.analysisUpdatedAt instanceof Timestamp
                           ? data.analysisUpdatedAt.toDate().toISOString()
                           : (data.analysisUpdatedAt ? new Date(data.analysisUpdatedAt).toISOString() : undefined);
      return { id: docSnap.id, ...data, createdAt: createdAtISO, analysisUpdatedAt: analysisUpdatedAtISO } as RiskCause;
    }
    return null;
  } catch (error) {
    console.error("Error getting risk cause by ID from Firestore: ", error);
    throw new Error("Gagal mengambil detail penyebab risiko dari database.");
  }
}

export async function updateRiskCause(id: string, data: Partial<Omit<RiskCause, 'id' | 'potentialRiskId' | 'goalId' | 'uprId' | 'period' | 'userId'>>): Promise<void> {
  try {
    const docRef = doc(db, RISK_CAUSES_COLLECTION, id);
    await updateDoc(docRef, {
        ...data,
        analysisUpdatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating risk cause in Firestore: ", error);
    throw new Error("Gagal memperbarui penyebab risiko di database.");
  }
}

// Modified to accept an optional batch
export async function deleteRiskCauseAndSubCollections(riskCauseId: string, uprId: string, period: string, batch?: WriteBatch): Promise<void> {
  const localBatch = batch || writeBatch(db);
  try {
    // 1. Get and delete all ControlMeasures for this RiskCause
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

    // 2. Delete the RiskCause document itself
    const riskCauseRef = doc(db, RISK_CAUSES_COLLECTION, riskCauseId);
    localBatch.delete(riskCauseRef);

    // If a batch was not passed in, commit the local batch
    if (!batch) {
      await localBatch.commit();
    }
  } catch (error) {
    console.error("Error deleting risk cause and its control measures: ", error);
    throw new Error("Gagal menghapus penyebab risiko dan tindakan pengendalian terkait.");
  }
}
