
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
import { getRiskCausesByPotentialRiskId, deleteRiskCauseAndSubCollections } from './riskCauseService'; // For cascading delete

export async function addPotentialRisk(
  data: Omit<PotentialRisk, 'id' | 'identifiedAt' | 'userId' | 'period' | 'sequenceNumber' | 'goalId'>,
  goalId: string,
  userId: string, 
  period: string,
  sequenceNumber: number
): Promise<PotentialRisk> {
  if (!userId || typeof userId !== 'string' || userId.trim() === "") {
    console.error("Error in addPotentialRisk: userId is invalid or not provided.", {userId});
    throw new Error("User ID tidak valid untuk menambahkan potensi risiko.");
  }
  if (!period || typeof period !== 'string' || period.trim() === "") {
    console.error("Error in addPotentialRisk: period is invalid or not provided.", {period});
    throw new Error("Periode tidak valid untuk menambahkan potensi risiko.");
  }
   if (!goalId || typeof goalId !== 'string' || goalId.trim() === "") {
    console.error("Error in addPotentialRisk: goalId is invalid or not provided.", {goalId});
    throw new Error("ID Sasaran tidak valid untuk menambahkan potensi risiko.");
  }

  try {
    const docDataToSave = {
      ...data,
      goalId,
      userId,
      period,
      sequenceNumber,
      category: data.category || null,
      owner: data.owner || null,
      identifiedAt: serverTimestamp(), // Use serverTimestamp
      updatedAt: serverTimestamp(),
    };
    console.log("[potentialRiskService] Data to save for new PotentialRisk:", JSON.stringify(docDataToSave, null, 2));
    const docRef = await addDoc(collection(db, POTENTIAL_RISKS_COLLECTION), docDataToSave);
    
    // Fetch the document to get server-generated timestamps
    const newDocSnap = await getDoc(docRef);
    if (!newDocSnap.exists()) {
        throw new Error("Gagal mengambil dokumen potensi risiko yang baru dibuat.");
    }
    const newDocData = newDocSnap.data();
    const identifiedAtTimestamp = newDocData.identifiedAt instanceof Timestamp ? newDocData.identifiedAt.toDate() : new Date();
    const updatedAtTimestamp = newDocData.updatedAt instanceof Timestamp ? newDocData.updatedAt.toDate() : new Date();

    return {
      id: docRef.id,
      goalId,
      userId,
      period,
      description: data.description,
      category: data.category || null,
      owner: data.owner || null,
      identifiedAt: identifiedAtTimestamp.toISOString(),
      updatedAt: updatedAtTimestamp.toISOString(),
      sequenceNumber,
    } as PotentialRisk; // Cast as PotentialRisk to satisfy return type including timestamps
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
  if (!goalId) {
    console.warn(`[potentialRiskService] getPotentialRisksByGoalId: goalId is missing.`);
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
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const identifiedAtTimestamp = data.identifiedAt instanceof Timestamp ? data.identifiedAt.toDate() : (data.identifiedAt ? new Date(data.identifiedAt) : new Date());
      const updatedAtTimestamp = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : null);
      
      potentialRisks.push({ 
        id: docSnap.id, 
        goalId: data.goalId,
        userId: data.userId,
        period: data.period,
        sequenceNumber: data.sequenceNumber,
        description: data.description,
        category: data.category || null,
        owner: data.owner || null,
        identifiedAt: identifiedAtTimestamp.toISOString(),
        updatedAt: updatedAtTimestamp ? updatedAtTimestamp.toISOString() : undefined,
      } as PotentialRisk);
    });
    return potentialRisks;
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error getting potential risks from Firestore: ", errorMessage, error.code, error);
    let detailedErrorMessage = "Gagal mengambil daftar potensi risiko dari database.";
     if (error.code === 'failed-precondition') {
        detailedErrorMessage += " Ini seringkali disebabkan oleh indeks komposit yang hilang di Firestore. Silakan periksa Firebase Console Anda (Firestore Database > Indexes) untuk membuat indeks yang diperlukan.";
    } else {
        detailedErrorMessage += ` Pesan Asli: ${errorMessage}`;
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

      const identifiedAtTimestamp = data.identifiedAt instanceof Timestamp ? data.identifiedAt.toDate() : (data.identifiedAt ? new Date(data.identifiedAt) : new Date());
      const updatedAtTimestamp = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : null);
      
      return { 
        id: docSnap.id, 
        goalId: data.goalId,
        userId: data.userId,
        period: data.period,
        sequenceNumber: data.sequenceNumber,
        description: data.description,
        category: data.category || null,
        owner: data.owner || null,
        identifiedAt: identifiedAtTimestamp.toISOString(),
        updatedAt: updatedAtTimestamp ? updatedAtTimestamp.toISOString() : undefined,
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

export async function updatePotentialRisk(id: string, data: Partial<Omit<PotentialRisk, 'id' | 'userId' | 'period' | 'goalId' | 'identifiedAt' | 'sequenceNumber' | 'updatedAt'>>): Promise<PotentialRisk | null> {
  try {
    const docRef = doc(db, POTENTIAL_RISKS_COLLECTION, id);
    const updateData = {
        ...data,
        category: data.category === undefined ? undefined : (data.category || null),
        owner: data.owner === undefined ? undefined : (data.owner || null),
        updatedAt: serverTimestamp() 
    };
    console.log("[potentialRiskService] Data to update for PotentialRisk:", id, JSON.stringify(updateData, null, 2));
    await updateDoc(docRef, updateData);
    
    // Fetch the updated document to return it with server-generated timestamp
    const updatedDocSnap = await getDoc(docRef);
    if (!updatedDocSnap.exists()) {
        throw new Error("Dokumen potensi risiko tidak ditemukan setelah pembaruan.");
    }
    const updatedDocData = updatedDocSnap.data();
    const identifiedAtTimestamp = updatedDocData.identifiedAt instanceof Timestamp ? updatedDocData.identifiedAt.toDate() : new Date(updatedDocData.identifiedAt);
    const updatedAtTimestamp = updatedDocData.updatedAt instanceof Timestamp ? updatedDocData.updatedAt.toDate() : new Date();

    return {
        id: updatedDocSnap.id,
        ...updatedDocData,
        identifiedAt: identifiedAtTimestamp.toISOString(),
        updatedAt: updatedAtTimestamp.toISOString(),
    } as PotentialRisk;

  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error updating potential risk in Firestore: ", errorMessage);
    throw new Error(`Gagal memperbarui potensi risiko di database. Pesan: ${errorMessage}`);
  }
}

export async function deletePotentialRiskAndSubCollections(potentialRiskId: string, userId: string, period: string, batch?: WriteBatch): Promise<void> {
  const localBatch = batch || writeBatch(db);
  console.log(`[potentialRiskService] Attempting to delete PotentialRisk: ${potentialRiskId} for user: ${userId}, period: ${period}`);
  try {
    const potentialRiskRef = doc(db, POTENTIAL_RISKS_COLLECTION, potentialRiskId);
    const prDoc = await getDoc(potentialRiskRef); 
    
    if (!prDoc.exists()) {
      console.warn(`PotentialRisk with ID ${potentialRiskId} not found. Skipping deletion.`);
      if (!batch) { /* Only commit if this function started the batch */ await localBatch.commit(); }
      return;
    }

    const prData = prDoc.data();
    if (prData.userId !== userId || prData.period !== period) {
        console.error(`Attempt to delete PotentialRisk ${potentialRiskId} denied: context mismatch. Expected User: ${userId}, Period: ${period}. Found: User: ${prData.userId}, Period: ${prData.period}`);
        throw new Error("Operasi tidak diizinkan: potensi risiko tidak cocok dengan konteks pengguna/periode.");
    }

    const riskCauses = await getRiskCausesByPotentialRiskId(potentialRiskId, userId, period);
    console.log(`[potentialRiskService] Found ${riskCauses.length} risk causes for PotentialRisk ${potentialRiskId} to be deleted.`);

    for (const riskCause of riskCauses) {
      // deleteRiskCauseAndSubCollections will handle deleting its own ControlMeasures
      await deleteRiskCauseAndSubCollections(riskCause.id, userId, period, localBatch);
    }

    localBatch.delete(potentialRiskRef);
    console.log(`[potentialRiskService] PotentialRisk ${potentialRiskId} and its sub-collections added to batch for deletion.`);

    if (!batch) { 
      await localBatch.commit();
      console.log(`[potentialRiskService] PotentialRisk ${potentialRiskId} and related data committed for deletion.`);
    }
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[potentialRiskService] Error deleting potential risk and its sub-collections: ", errorMessage, error.code, error);
    if (!(error.message && error.message.toLowerCase().includes("no document to update")) && !(error.message && error.message.toLowerCase().includes("document to update"))){
        throw new Error(`Gagal menghapus potensi risiko dan data terkaitnya. Pesan: ${errorMessage}`);
    } else {
        console.warn("[potentialRiskService] Skipped re-throwing error during cascading delete, likely already deleted or batch issue:", errorMessage);
    }
  }
}

    