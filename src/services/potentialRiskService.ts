
"use server";

import { db } from '@/lib/firebase/config';
import type { PotentialRisk } from '@/lib/types';
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
  writeBatch,
  getDoc
} from 'firebase/firestore';
import { 
    POTENTIAL_RISKS_COLLECTION,
    RISK_CAUSES_COLLECTION,
    CONTROL_MEASURES_COLLECTION
} from './collectionNames';
import { getRiskCausesByPotentialRiskId, deleteRiskCauseAndSubCollections } from './riskCauseService';

export async function addPotentialRisk(
  data: Omit<PotentialRisk, 'id' | 'identifiedAt' | 'uprId' | 'period' | 'userId' | 'sequenceNumber'>,
  goalId: string,
  uprId: string,
  period: string,
  userId: string,
  sequenceNumber: number
): Promise<PotentialRisk> {
  try {
    const docRef = await addDoc(collection(db, POTENTIAL_RISKS_COLLECTION), {
      ...data,
      goalId,
      uprId,
      period,
      userId,
      sequenceNumber,
      identifiedAt: serverTimestamp(),
    });
    return {
      id: docRef.id,
      ...data,
      goalId,
      uprId,
      period,
      userId,
      sequenceNumber,
      identifiedAt: new Date().toISOString(), // Placeholder
    };
  } catch (error) {
    console.error("Error adding potential risk to Firestore: ", error);
    throw new Error("Gagal menambahkan potensi risiko ke database.");
  }
}

export async function getPotentialRisksByGoalId(goalId: string, uprId: string, period: string): Promise<PotentialRisk[]> {
  try {
    const q = query(
      collection(db, POTENTIAL_RISKS_COLLECTION),
      where("goalId", "==", goalId),
      where("uprId", "==", uprId),
      where("period", "==", period),
      orderBy("sequenceNumber", "asc")
    );
    const querySnapshot = await getDocs(q);
    const potentialRisks: PotentialRisk[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const identifiedAtISO = data.identifiedAt instanceof Timestamp
                           ? data.identifiedAt.toDate().toISOString()
                           : (data.identifiedAt ? new Date(data.identifiedAt).toISOString() : new Date().toISOString());
      potentialRisks.push({ id: doc.id, ...data, identifiedAt: identifiedAtISO } as PotentialRisk);
    });
    return potentialRisks;
  } catch (error) {
    console.error("Error getting potential risks from Firestore: ", error);
    throw new Error("Gagal mengambil daftar potensi risiko dari database.");
  }
}

export async function getPotentialRiskById(id: string): Promise<PotentialRisk | null> {
  try {
    const docRef = doc(db, POTENTIAL_RISKS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const identifiedAtISO = data.identifiedAt instanceof Timestamp
                           ? data.identifiedAt.toDate().toISOString()
                           : (data.identifiedAt ? new Date(data.identifiedAt).toISOString() : new Date().toISOString());
      return { id: docSnap.id, ...data, identifiedAt: identifiedAtISO } as PotentialRisk;
    }
    return null;
  } catch (error) {
    console.error("Error getting potential risk by ID from Firestore: ", error);
    throw new Error("Gagal mengambil detail potensi risiko dari database.");
  }
}

export async function updatePotentialRisk(id: string, data: Partial<Omit<PotentialRisk, 'id' | 'uprId' | 'period' | 'userId' | 'goalId'>>): Promise<void> {
  try {
    const docRef = doc(db, POTENTIAL_RISKS_COLLECTION, id);
    await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp() 
    });
  } catch (error) {
    console.error("Error updating potential risk in Firestore: ", error);
    throw new Error("Gagal memperbarui potensi risiko di database.");
  }
}

export async function deletePotentialRiskAndSubCollections(potentialRiskId: string, uprId: string, period: string): Promise<void> {
  const batch = writeBatch(db);
  try {
    // 1. Get all RiskCauses for this PotentialRisk
    const riskCauses = await getRiskCausesByPotentialRiskId(potentialRiskId, uprId, period);

    for (const riskCause of riskCauses) {
      // For each RiskCause, delete it and its ControlMeasures (delegated to riskCauseService)
      await deleteRiskCauseAndSubCollections(riskCause.id, uprId, period, batch); // Pass the batch
    }

    // 2. Delete the PotentialRisk document itself
    const potentialRiskRef = doc(db, POTENTIAL_RISKS_COLLECTION, potentialRiskId);
    batch.delete(potentialRiskRef);

    await batch.commit();
  } catch (error) {
    console.error("Error deleting potential risk and its sub-collections: ", error);
    throw new Error("Gagal menghapus potensi risiko dan data terkaitnya.");
  }
}
