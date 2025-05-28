
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
import { CONTROL_MEASURES_COLLECTION, CONTROL_MEASURE_TYPE_KEYS } from './collectionNames'; // Import CONTROL_MEASURE_TYPE_KEYS

export async function addControlMeasure(
  data: Omit<ControlMeasure, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'period' | 'riskCauseId' | 'potentialRiskId' | 'goalId' | 'sequenceNumber'>,
  riskCauseId: string,
  potentialRiskId: string,
  goalId: string,
  userId: string,
  period: string,
  sequenceNumber: number
): Promise<ControlMeasure> {
  if (!userId || !period || !riskCauseId || !potentialRiskId || !goalId) {
    console.error("Error in addControlMeasure: Missing one or more required IDs.", {userId, period, riskCauseId, potentialRiskId, goalId});
    throw new Error("ID Pengguna, Periode, Penyebab Risiko, Potensi Risiko, atau Sasaran tidak valid.");
  }
  if (typeof sequenceNumber !== 'number' || sequenceNumber <= 0) {
    console.error("Error in addControlMeasure: sequenceNumber is invalid.", {sequenceNumber});
    throw new Error("Nomor urut tindakan pengendalian tidak valid.");
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
      keyControlIndicator: data.keyControlIndicator || null,
      target: data.target || null,
      responsiblePerson: data.responsiblePerson || null,
      deadline: data.deadline || null,
      budget: data.budget || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    console.log("[controlMeasureService] Data to add ControlMeasure:", JSON.stringify(docDataToSave, null, 2));
    const docRef = await addDoc(collection(db, CONTROL_MEASURES_COLLECTION), docDataToSave);
    
    const newDocSnap = await getDoc(docRef);
    if (!newDocSnap.exists()) {
      throw new Error("Gagal mengambil dokumen tindakan pengendalian yang baru dibuat.");
    }
    const newDocData = newDocSnap.data();
    const createdAtTimestamp = newDocData.createdAt instanceof Timestamp ? newDocData.createdAt.toDate() : new Date();
    const updatedAtTimestamp = newDocData.updatedAt instanceof Timestamp ? newDocData.updatedAt.toDate() : new Date();
    const deadline = newDocData.deadline ? (newDocData.deadline instanceof Timestamp ? newDocData.deadline.toDate().toISOString() : newDocData.deadline) : null;


    return {
      id: docRef.id,
      ...data,
      riskCauseId,
      potentialRiskId,
      goalId,
      userId,
      period,
      sequenceNumber,
      deadline,
      createdAt: createdAtTimestamp.toISOString(),
      updatedAt: updatedAtTimestamp.toISOString(),
    } as ControlMeasure;
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error("Error adding control measure to Firestore: ", errorMessage);
    throw new Error(`Gagal menambahkan tindakan pengendalian ke database. Pesan: ${errorMessage}`);
  }
}

export async function getControlMeasuresByRiskCauseId(riskCauseId: string, userId: string, period: string): Promise<ControlMeasure[]> {
  if (!userId || !period || !riskCauseId) {
    console.warn("[controlMeasureService] getControlMeasuresByRiskCauseId: Missing required IDs.", { userId, period, riskCauseId });
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
    querySnapshot.forEach((docSnap) => { // Changed doc to docSnap to avoid conflict
      const data = docSnap.data();
      const createdAtTimestamp = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date());
      const updatedAtTimestamp = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : null);
      const deadline = data.deadline ? (data.deadline instanceof Timestamp ? data.deadline.toDate().toISOString() : data.deadline) : null;

      controlMeasures.push({ 
        id: docSnap.id, 
        ...data, 
        deadline,
        createdAt: createdAtTimestamp.toISOString(), 
        updatedAt: updatedAtTimestamp ? updatedAtTimestamp.toISOString() : undefined,
      } as ControlMeasure);
    });
    return controlMeasures;
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error("Error getting control measures from Firestore: ", errorMessage, error.code, error);
    let detailedErrorMessage = "Gagal mengambil daftar tindakan pengendalian dari database.";
    if (error.code === 'failed-precondition') {
        detailedErrorMessage += " Ini seringkali disebabkan oleh indeks komposit yang hilang di Firestore. Silakan periksa Firebase Console Anda (Firestore Database > Indexes).";
    } else {
        detailedErrorMessage += ` Pesan Asli: ${errorMessage}`;
    }
    throw new Error(detailedErrorMessage);
  }
}

export async function getControlMeasureById(id: string, userId: string, period: string): Promise<ControlMeasure | null> {
  if (!id || !userId || !period) {
    console.warn(`[controlMeasureService] getControlMeasureById: ID, userId, or period is missing.`, {id, userId, period});
    return null;
  }
  try {
    const docRef = doc(db, CONTROL_MEASURES_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.userId !== userId || data.period !== period) {
        console.warn(`ControlMeasure ${id} found, but does not match current user/period context. Expected User: ${userId}, Period: ${period}. Found: User: ${data.userId}, Period: ${data.period}`);
        return null;
      }

      const createdAtTimestamp = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date());
      const updatedAtTimestamp = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : null);
      const deadline = data.deadline ? (data.deadline instanceof Timestamp ? data.deadline.toDate().toISOString() : data.deadline) : null;

      return {
        id: docSnap.id,
        ...data,
        deadline,
        createdAt: createdAtTimestamp.toISOString(),
        updatedAt: updatedAtTimestamp ? updatedAtTimestamp.toISOString() : undefined,
      } as ControlMeasure;
    } else {
      console.warn(`ControlMeasure with ID ${id} not found.`);
      return null;
    }
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error(`Error getting control measure by ID ${id} from Firestore: `, errorMessage);
    throw new Error(`Gagal mengambil detail tindakan pengendalian. Pesan: ${errorMessage}`);
  }
}


export async function updateControlMeasure(
  id: string, 
  data: Partial<Omit<ControlMeasure, 'id' | 'riskCauseId' | 'potentialRiskId' | 'goalId' | 'userId' | 'period' | 'createdAt' | 'sequenceNumber' | 'updatedAt'>>
): Promise<ControlMeasure | null> {
  if (!id || typeof id !== 'string' || id.trim() === "") {
    console.error("Error in updateControlMeasure: id is invalid.", {id});
    throw new Error("ID Tindakan Pengendalian tidak valid untuk pembaruan.");
  }
  try {
    const docRef = doc(db, CONTROL_MEASURES_COLLECTION, id);
    const updateData = {
        ...data,
        deadline: data.deadline === undefined ? undefined : (data.deadline || null),
        budget: data.budget === undefined ? undefined : (data.budget === null || isNaN(Number(data.budget)) ? null : Number(data.budget)),
        updatedAt: serverTimestamp()
    };
    console.log("[controlMeasureService] Data to update ControlMeasure:", id, JSON.stringify(updateData, null, 2));
    await updateDoc(docRef, updateData);

    const updatedDocSnap = await getDoc(docRef);
    if (!updatedDocSnap.exists()) {
      throw new Error("Dokumen tindakan pengendalian tidak ditemukan setelah pembaruan.");
    }
    const updatedDocData = updatedDocSnap.data();
    const createdAtTimestamp = updatedDocData.createdAt instanceof Timestamp ? updatedDocData.createdAt.toDate() : new Date(updatedDocData.createdAt);
    const updatedAtTimestamp = updatedDocData.updatedAt instanceof Timestamp ? updatedDocData.updatedAt.toDate() : new Date();
    const deadline = updatedDocData.deadline ? (updatedDocData.deadline instanceof Timestamp ? updatedDocData.deadline.toDate().toISOString() : updatedDocData.deadline) : null;

    return {
        id: updatedDocSnap.id,
        ...updatedDocData,
        deadline,
        createdAt: createdAtTimestamp.toISOString(),
        updatedAt: updatedAtTimestamp.toISOString(),
    } as ControlMeasure;

  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error("Error updating control measure in Firestore: ", errorMessage);
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
      const errorMessage = error.message || String(error);
      console.error("Error deleting control measure from Firestore: ", errorMessage);
      throw new Error(`Gagal menghapus tindakan pengendalian dari database. Pesan: ${errorMessage}`);
    }
  }
}

