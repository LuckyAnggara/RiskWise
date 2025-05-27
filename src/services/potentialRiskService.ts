
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
  getDoc,
  type WriteBatch
} from 'firebase/firestore';
import { 
    POTENTIAL_RISKS_COLLECTION,
} from './collectionNames';
import { getRiskCausesByPotentialRiskId, deleteRiskCauseAndSubCollections } from './riskCauseService';

export async function addPotentialRisk(
  data: Omit<PotentialRisk, 'id' | 'identifiedAt' | 'period' | 'userId' | 'sequenceNumber'>,
  goalId: string,
  userId: string,
  period: string,
  sequenceNumber: number
): Promise<PotentialRisk> {
  try {
    const docRef = await addDoc(collection(db, POTENTIAL_RISKS_COLLECTION), {
      ...data,
      goalId,
      userId,
      period,
      sequenceNumber,
      category: data.category || null,
      owner: data.owner || null,
      identifiedAt: serverTimestamp(),
    });
    return {
      id: docRef.id,
      ...data,
      goalId,
      userId,
      period,
      sequenceNumber,
      identifiedAt: new Date().toISOString(), 
    };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error adding potential risk to Firestore: ", errorMessage);
    throw new Error(`Gagal menambahkan potensi risiko ke database. Pesan: ${errorMessage}`);
  }
}

export async function getPotentialRisksByGoalId(goalId: string, userId: string, period: string): Promise<PotentialRisk[]> {
  try {
    const q = query(
      collection(db, POTENTIAL_RISKS_COLLECTION),
      where("goalId", "==", goalId),
      where("userId", "==", userId),
      where("period", "==", period),
      orderBy("sequenceNumber", "asc")
    );
    const querySnapshot = await getDocs(q);
    const potentialRisks: PotentialRisk[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const identifiedAtTimestamp = data.identifiedAt as Timestamp | undefined;
      const identifiedAtISO = identifiedAtTimestamp
                           ? identifiedAtTimestamp.toDate().toISOString()
                           : (data.identifiedAt && typeof data.identifiedAt === 'string' ? new Date(data.identifiedAt).toISOString() : new Date().toISOString());
      
      const updatedAtTimestamp = data.updatedAt as Timestamp | undefined;
      const updatedAtISO = updatedAtTimestamp
                           ? updatedAtTimestamp.toDate().toISOString()
                           : (data.updatedAt && typeof data.updatedAt === 'string' ? new Date(data.updatedAt).toISOString() : undefined);

      potentialRisks.push({ 
        id: doc.id, 
        ...data, 
        identifiedAt: identifiedAtISO,
        updatedAt: updatedAtISO,
        category: data.category || null,
        owner: data.owner || null,
      } as PotentialRisk);
    });
    return potentialRisks;
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error getting potential risks from Firestore: ", errorMessage, error.code, error);
    let detailedErrorMessage = "Gagal mengambil daftar potensi risiko dari database.";
     if (error instanceof Error && error.message) {
        detailedErrorMessage += ` Pesan Asli: ${error.message}`;
    }
    if ((error as any).code === 'failed-precondition') {
        detailedErrorMessage += " Ini seringkali disebabkan oleh indeks komposit yang hilang di Firestore. Silakan periksa Firebase Console Anda (Firestore Database > Indexes) untuk membuat indeks yang diperlukan. Link untuk membuat indeks mungkin ada di log error server/konsol browser Anda.";
    }
    throw new Error(detailedErrorMessage);
  }
}

export async function getPotentialRiskById(id: string, userId: string, period: string): Promise<PotentialRisk | null> {
  try {
    if (!userId || !period) {
      console.warn(`[potentialRiskService] getPotentialRiskById: userId or period is missing for id ${id}`);
      return null;
    }
    const docRef = doc(db, POTENTIAL_RISKS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.userId !== userId || data.period !== period) {
        console.warn(`PotentialRisk ${id} found, but does not match current user/period context. Expected User: ${userId}, Period: ${period}. Found: User: ${data.userId}, Period: ${data.period}`);
        return null;
      }

      const identifiedAtTimestamp = data.identifiedAt as Timestamp | undefined;
      const identifiedAtISO = identifiedAtTimestamp
                           ? identifiedAtTimestamp.toDate().toISOString()
                           : (data.identifiedAt && typeof data.identifiedAt === 'string' ? new Date(data.identifiedAt).toISOString() : new Date().toISOString());
      
      const updatedAtTimestamp = data.updatedAt as Timestamp | undefined;
      const updatedAtISO = updatedAtTimestamp
                           ? updatedAtTimestamp.toDate().toISOString()
                           : (data.updatedAt && typeof data.updatedAt === 'string' ? new Date(data.updatedAt).toISOString() : undefined);

      return { 
        id: docSnap.id, 
        ...data, 
        identifiedAt: identifiedAtISO,
        updatedAt: updatedAtISO,
        category: data.category || null,
        owner: data.owner || null,
      } as PotentialRisk;
    }
    return null;
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error getting potential risk by ID from Firestore: ", errorMessage);
    throw new Error(`Gagal mengambil detail potensi risiko dari database. Pesan: ${errorMessage}`);
  }
}

export async function updatePotentialRisk(id: string, data: Partial<Omit<PotentialRisk, 'id' | 'userId' | 'period' | 'goalId' | 'identifiedAt' | 'sequenceNumber'>>): Promise<void> {
  try {
    const docRef = doc(db, POTENTIAL_RISKS_COLLECTION, id);
    await updateDoc(docRef, {
        ...data,
        category: data.category === undefined ? undefined : (data.category || null),
        owner: data.owner === undefined ? undefined : (data.owner || null),
        updatedAt: serverTimestamp() 
    });
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error updating potential risk in Firestore: ", errorMessage);
    throw new Error(`Gagal memperbarui potensi risiko di database. Pesan: ${errorMessage}`);
  }
}

export async function deletePotentialRiskAndSubCollections(potentialRiskId: string, userId: string, period: string, batch?: WriteBatch): Promise<void> {
  const localBatch = batch || writeBatch(db);
  try {
    // Ensure the potential risk belongs to the user and period before deleting
    const potentialRiskRef = doc(db, POTENTIAL_RISKS_COLLECTION, potentialRiskId);
    const prDoc = await getDoc(potentialRiskRef);
    if (prDoc.exists()) {
        const prData = prDoc.data();
        if (prData.userId !== userId || prData.period !== period) {
            throw new Error("Potensi Risiko tidak dapat dihapus: tidak cocok dengan konteks pengguna/periode.");
        }
    } else {
         console.warn(`Potensi Risiko dengan ID ${potentialRiskId} tidak ditemukan saat mencoba menghapus sub-koleksi.`);
        // If the PR itself doesn't exist, there's nothing to delete under it.
        // Still, if this function was called, we might want to ensure no orphaned children exist if possible,
        // but the primary PR doc is the gatekeeper.
        // If not using batch, we can just return or throw a specific error.
        if (!batch) return; // Or throw new Error("Potensi Risiko tidak ditemukan untuk dihapus.");
    }


    // Delete related RiskCauses (and their ControlMeasures)
    const riskCauses = await getRiskCausesByPotentialRiskId(potentialRiskId, userId, period);

    for (const riskCause of riskCauses) {
      // deleteRiskCauseAndSubCollections already handles deleting its own ControlMeasures
      await deleteRiskCauseAndSubCollections(riskCause.id, userId, period, localBatch);
    }

    localBatch.delete(potentialRiskRef);

    if (!batch) { // If this function initiated the batch, commit it.
      await localBatch.commit();
    }
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error deleting potential risk and its sub-collections: ", errorMessage, error.code, error);
    throw new Error(`Gagal menghapus potensi risiko dan data terkaitnya. Pesan: ${errorMessage}`);
  }
}
