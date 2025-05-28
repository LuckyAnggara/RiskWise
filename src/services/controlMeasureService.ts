
"use server";

import { db } from '@/lib/firebase/config';
import type { ControlMeasure } from '@/lib/types';
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
  type WriteBatch
} from 'firebase/firestore';
import { CONTROL_MEASURES_COLLECTION } from './collectionNames';

export async function addControlMeasure(
  data: Omit<ControlMeasure, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'period' | 'riskCauseId' | 'potentialRiskId' | 'goalId' | 'sequenceNumber'>,
  riskCauseId: string,
  potentialRiskId: string,
  goalId: string,
  userId: string,
  period: string,
  sequenceNumber: number
): Promise<ControlMeasure> {
  if (!userId || typeof userId !== 'string' || userId.trim() === "") {
    console.error("Error in addControlMeasure: userId is invalid.", {userId});
    throw new Error("User ID tidak valid untuk menambahkan tindakan pengendalian.");
  }
  if (!period || typeof period !== 'string' || period.trim() === "") {
    console.error("Error in addControlMeasure: period is invalid.", {period});
    throw new Error("Periode tidak valid untuk menambahkan tindakan pengendalian.");
  }
  if (!riskCauseId || !potentialRiskId || !goalId) {
    console.error("Error in addControlMeasure: parent IDs are invalid.", {riskCauseId, potentialRiskId, goalId});
    throw new Error("ID Induk (Penyebab/Potensi/Sasaran) tidak valid.");
  }

  try {
    const docDataToSave = {
      ...data,
      riskCauseId,
      potentialRiskId,
      goalId,
      userId,
      period,
      sequenceNumber,
      controlType: data.controlType,
      keyControlIndicator: data.keyControlIndicator || null,
      target: data.target || null,
      responsiblePerson: data.responsiblePerson || null,
      deadline: data.deadline || null, // Expecting ISO string or null
      budget: data.budget || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(), // Also set updatedAt on create
    };
    console.log("[controlMeasureService] Data to add ControlMeasure:", JSON.stringify(docDataToSave, null, 2));
    const docRef = await addDoc(collection(db, CONTROL_MEASURES_COLLECTION), docDataToSave);
    
    // For the return object, use current date as placeholder for serverTimestamp
    const nowISO = new Date().toISOString();
    return {
      id: docRef.id,
      ...data,
      riskCauseId,
      potentialRiskId,
      goalId,
      userId,
      period,
      sequenceNumber,
      createdAt: nowISO,
      updatedAt: nowISO,
    };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error adding control measure to Firestore: ", errorMessage, error.code, error.details);
    throw new Error(`Gagal menambahkan tindakan pengendalian ke database. Pesan: ${errorMessage}`);
  }
}

export async function getControlMeasuresByRiskCauseId(riskCauseId: string, userId: string, period: string): Promise<ControlMeasure[]> {
  if (!userId || !period || !riskCauseId) {
    console.warn("[controlMeasureService] getControlMeasuresByRiskCauseId: userId, period, or riskCauseId is missing.", { userId, period, riskCauseId });
    return [];
  }
  try {
    const q = query(
      collection(db, CONTROL_MEASURES_COLLECTION),
      where("riskCauseId", "==", riskCauseId),
      where("userId", "==", userId),
      where("period", "==", period),
      orderBy("controlType", "asc"), 
      orderBy("sequenceNumber", "asc")
    );
    const querySnapshot = await getDocs(q);
    const controlMeasures: ControlMeasure[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const createdAtTimestamp = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date());
      const updatedAtTimestamp = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : null);
      const deadlineTimestamp = data.deadline instanceof Timestamp ? data.deadline.toDate() : (data.deadline ? new Date(data.deadline) : null);

      controlMeasures.push({ 
        id: doc.id, 
        ...data, 
        createdAt: createdAtTimestamp.toISOString(), 
        updatedAt: updatedAtTimestamp ? updatedAtTimestamp.toISOString() : undefined,
        deadline: deadlineTimestamp ? deadlineTimestamp.toISOString() : null 
      } as ControlMeasure);
    });
    return controlMeasures;
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error("Error getting control measures from Firestore: ", errorMessage, error.code, error);
    let detailedErrorMessage = "Gagal mengambil daftar tindakan pengendalian dari database.";
    if (error.code === 'failed-precondition' || (error.message && error.message.toLowerCase().includes("index"))) {
        detailedErrorMessage += " Ini seringkali disebabkan oleh indeks komposit yang hilang di Firestore. Silakan periksa Firebase Console Anda (Firestore Database > Indexes) untuk membuat indeks yang diperlukan. Link untuk membuat indeks mungkin ada di log error server/konsol browser Anda.";
    } else {
        detailedErrorMessage += ` Pesan Asli: ${errorMessage}`;
    }
    throw new Error(detailedErrorMessage);
  }
}

export async function updateControlMeasure(id: string, data: Partial<Omit<ControlMeasure, 'id' | 'riskCauseId' | 'potentialRiskId' | 'goalId' | 'userId' | 'period' | 'createdAt' | 'sequenceNumber' | 'updatedAt'>>): Promise<void> {
  if (!id || typeof id !== 'string' || id.trim() === "") {
    console.error("Error in updateControlMeasure: id is invalid.", {id});
    throw new Error("ID Tindakan Pengendalian tidak valid untuk pembaruan.");
  }
  try {
    const docRef = doc(db, CONTROL_MEASURES_COLLECTION, id);
    const updateData = {
        ...data,
        deadline: data.deadline === undefined ? undefined : (data.deadline || null), // Keep as ISO string or null
        budget: data.budget === undefined ? undefined : (data.budget || null),
        updatedAt: serverTimestamp()
    };
    console.log("[controlMeasureService] Data to update ControlMeasure:", id, JSON.stringify(updateData, null, 2));
    await updateDoc(docRef, updateData);
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error updating control measure in Firestore: ", errorMessage, error.code, error.details);
    throw new Error(`Gagal memperbarui tindakan pengendalian di database. Pesan: ${errorMessage}`);
  }
}

export async function deleteControlMeasure(id: string, batch?: WriteBatch): Promise<void> {
  if (!id || typeof id !== 'string' || id.trim() === "") {
    console.error("Error in deleteControlMeasure: id is invalid.", {id});
    throw new Error("ID Tindakan Pengendalian tidak valid untuk penghapusan.");
  }
  const controlMeasureRef = doc(db, CONTROL_MEASURES_COLLECTION, id);
  console.log(`[controlMeasureService] Attempting to delete ControlMeasure with ID: ${id}`);
  if (batch) {
    batch.delete(controlMeasureRef);
  } else {
    try {
      await deleteDoc(controlMeasureRef);
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error deleting control measure from Firestore: ", errorMessage, error.code, error.details);
      throw new Error(`Gagal menghapus tindakan pengendalian dari database. Pesan: ${errorMessage}`);
    }
  }
}
