
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
  data: Omit<PotentialRisk, 'id' | 'identifiedAt' | 'period' | 'userId' | 'sequenceNumber' | 'goalId'>,
  goalId: string,
  userId: string, // Parameter for the user ID
  period: string,
  sequenceNumber: number
): Promise<PotentialRisk> {
  if (!userId || typeof userId !== 'string' || userId.trim() === "") {
    console.error("Error in addPotentialRisk: userId is invalid or not provided.", {userId});
    throw new Error("User ID tidak valid atau tidak diberikan saat menambahkan potensi risiko.");
  }
  if (!period || typeof period !== 'string' || period.trim() === "") {
    console.error("Error in addPotentialRisk: period is invalid or not provided.", {period});
    throw new Error("Periode tidak valid atau tidak diberikan saat menambahkan potensi risiko.");
  }
   if (!goalId || typeof goalId !== 'string' || goalId.trim() === "") {
    console.error("Error in addPotentialRisk: goalId is invalid or not provided.", {goalId});
    throw new Error("Goal ID tidak valid atau tidak diberikan saat menambahkan potensi risiko.");
  }

  try {
    const docDataToSave = {
      ...data,
      goalId,
      userId, // Use the passed userId
      period,
      sequenceNumber,
      category: data.category || null,
      owner: data.owner || null,
      identifiedAt: serverTimestamp(),
    };
    console.log("Data to save for new PotentialRisk:", JSON.stringify(docDataToSave, null, 2));
    const docRef = await addDoc(collection(db, POTENTIAL_RISKS_COLLECTION), docDataToSave);
    
    // For the return object, we use current date as placeholder for serverTimestamp
    // and ensure all fields match the PotentialRisk type, especially userId and period
    return {
      id: docRef.id,
      goalId,
      userId,
      period,
      description: data.description,
      category: data.category || null,
      owner: data.owner || null,
      identifiedAt: new Date().toISOString(), // Placeholder, actual value is server timestamp
      sequenceNumber,
    };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error adding potential risk to Firestore: ", errorMessage, error.code, error.details);
    throw new Error(`Gagal menambahkan potensi risiko ke database. Pesan: ${errorMessage}`);
  }
}

export async function getPotentialRisksByGoalId(goalId: string, userId: string, period: string): Promise<PotentialRisk[]> {
  if (!userId || !period) {
    console.warn(`[potentialRiskService] getPotentialRisksByGoalId: userId or period is missing for goalId ${goalId}`);
    return [];
  }
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
      const identifiedAtTimestamp = data.identifiedAt instanceof Timestamp ? data.identifiedAt : (data.identifiedAt?.toDate ? data.identifiedAt.toDate() : null);
      const identifiedAtISO = identifiedAtTimestamp instanceof Date ? identifiedAtTimestamp.toISOString() : (data.identifiedAt && typeof data.identifiedAt === 'string' ? data.identifiedAt : new Date().toISOString());
      
      const updatedAtTimestamp = data.updatedAt instanceof Timestamp ? data.updatedAt : (data.updatedAt?.toDate ? data.updatedAt.toDate() : null);
      const updatedAtISO = updatedAtTimestamp instanceof Date ? updatedAtTimestamp.toISOString() : (data.updatedAt && typeof data.updatedAt === 'string' ? data.updatedAt : undefined);

      potentialRisks.push({ 
        id: doc.id, 
        ...data, 
        userId: data.userId,
        period: data.period,
        goalId: data.goalId,
        identifiedAt: identifiedAtISO,
        updatedAt: updatedAtISO,
        category: data.category || null,
        owner: data.owner || null,
        sequenceNumber: data.sequenceNumber,
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
  if (!userId || !period) {
    console.warn(`[potentialRiskService] getPotentialRiskById: userId or period is missing for id ${id}`);
    return null;
  }
  try {
    const docRef = doc(db, POTENTIAL_RISKS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.userId !== userId || data.period !== period) {
        console.warn(`PotentialRisk ${id} found, but does not match current user/period context. Expected User: ${userId}, Period: ${period}. Found: User: ${data.userId}, Period: ${data.period}`);
        return null;
      }

      const identifiedAtTimestamp = data.identifiedAt instanceof Timestamp ? data.identifiedAt : (data.identifiedAt?.toDate ? data.identifiedAt.toDate() : null);
      const identifiedAtISO = identifiedAtTimestamp instanceof Date ? identifiedAtTimestamp.toISOString() : (data.identifiedAt && typeof data.identifiedAt === 'string' ? data.identifiedAt : new Date().toISOString());
      
      const updatedAtTimestamp = data.updatedAt instanceof Timestamp ? data.updatedAt : (data.updatedAt?.toDate ? data.updatedAt.toDate() : null);
      const updatedAtISO = updatedAtTimestamp instanceof Date ? updatedAtTimestamp.toISOString() : (data.updatedAt && typeof data.updatedAt === 'string' ? data.updatedAt : undefined);
      
      return { 
        id: docSnap.id, 
        ...data, 
        userId: data.userId,
        period: data.period,
        goalId: data.goalId,
        identifiedAt: identifiedAtISO,
        updatedAt: updatedAtISO,
        category: data.category || null,
        owner: data.owner || null,
        sequenceNumber: data.sequenceNumber,
      } as PotentialRisk;
    }
    console.warn(`PotentialRisk with ID ${id} not found.`);
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
    const updateData = {
        ...data,
        category: data.category === undefined ? undefined : (data.category || null),
        owner: data.owner === undefined ? undefined : (data.owner || null),
        updatedAt: serverTimestamp() 
    };
    console.log("Data to update for PotentialRisk:", id, JSON.stringify(updateData, null, 2));
    await updateDoc(docRef, updateData);
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error updating potential risk in Firestore: ", errorMessage);
    throw new Error(`Gagal memperbarui potensi risiko di database. Pesan: ${errorMessage}`);
  }
}

export async function deletePotentialRiskAndSubCollections(potentialRiskId: string, userId: string, period: string, batch?: WriteBatch): Promise<void> {
  const localBatch = batch || writeBatch(db);
  console.log(`Attempting to delete PotentialRisk: ${potentialRiskId} for user: ${userId}, period: ${period}`);
  try {
    const potentialRiskRef = doc(db, POTENTIAL_RISKS_COLLECTION, potentialRiskId);
    const prDoc = await getDoc(potentialRiskRef); // Get document to verify ownership and context
    
    if (!prDoc.exists()) {
      console.warn(`PotentialRisk with ID ${potentialRiskId} not found. Skipping deletion.`);
      if (!batch) await localBatch.commit(); // Commit if we started a batch
      return;
    }

    const prData = prDoc.data();
    if (prData.userId !== userId || prData.period !== period) {
        console.error(`Attempt to delete PotentialRisk ${potentialRiskId} denied: context mismatch. Expected User: ${userId}, Period: ${period}. Found: User: ${prData.userId}, Period: ${prData.period}`);
        throw new Error("Operasi tidak diizinkan: potensi risiko tidak cocok dengan konteks pengguna/periode.");
    }

    // Delete related RiskCauses (and their ControlMeasures)
    const riskCauses = await getRiskCausesByPotentialRiskId(potentialRiskId, userId, period);
    console.log(`Found ${riskCauses.length} risk causes for PotentialRisk ${potentialRiskId}`);

    for (const riskCause of riskCauses) {
      // deleteRiskCauseAndSubCollections from riskCauseService handles deleting its own ControlMeasures
      await deleteRiskCauseAndSubCollections(riskCause.id, userId, period, localBatch);
    }

    localBatch.delete(potentialRiskRef);
    console.log(`PotentialRisk ${potentialRiskId} and its sub-collections added to batch for deletion.`);

    if (!batch) { // If this function initiated the batch, commit it.
      await localBatch.commit();
      console.log(`PotentialRisk ${potentialRiskId} and related data committed for deletion.`);
    }
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error deleting potential risk and its sub-collections: ", errorMessage, error.code, error);
    // Avoid re-throwing if it's just a "not found" during a cascading delete that might have already run partially
    if (!(error.message && error.message.toLowerCase().includes("no document to update"))){
        throw new Error(`Gagal menghapus potensi risiko dan data terkaitnya. Pesan: ${errorMessage}`);
    } else {
        console.warn("Skipped re-throwing error during cascading delete, likely already deleted:", errorMessage);
    }
  }
}
