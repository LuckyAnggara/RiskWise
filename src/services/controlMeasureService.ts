
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
  data: Omit<ControlMeasure, 'id' | 'createdAt' | 'period' | 'userId' | 'riskCauseId' | 'potentialRiskId' | 'goalId' | 'sequenceNumber'>,
  riskCauseId: string,
  potentialRiskId: string,
  goalId: string,
  userId: string,
  period: string,
  sequenceNumber: number
): Promise<ControlMeasure> {
  try {
    const docRef = await addDoc(collection(db, CONTROL_MEASURES_COLLECTION), {
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
      deadline: data.deadline || null,
      budget: data.budget || null,
      createdAt: serverTimestamp(),
    });
    return {
      id: docRef.id,
      ...data,
      riskCauseId,
      potentialRiskId,
      goalId,
      userId,
      period,
      sequenceNumber,
      createdAt: new Date().toISOString(), // Placeholder
    };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error adding control measure to Firestore: ", errorMessage);
    throw new Error("Gagal menambahkan tindakan pengendalian ke database. Pesan: " + errorMessage);
  }
}

export async function getControlMeasuresByRiskCauseId(riskCauseId: string, userId: string, period: string): Promise<ControlMeasure[]> {
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
      const createdAtISO = data.createdAt instanceof Timestamp
                           ? data.createdAt.toDate().toISOString()
                           : (data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString());
      const updatedAtISO = data.updatedAt instanceof Timestamp
                           ? data.updatedAt.toDate().toISOString()
                           : (data.updatedAt ? new Date(data.updatedAt).toISOString() : undefined);
      const deadlineISO = data.deadline instanceof Timestamp
                           ? data.deadline.toDate().toISOString()
                           : (data.deadline && typeof data.deadline === 'string' ? new Date(data.deadline).toISOString() : null);

      controlMeasures.push({ 
        id: doc.id, 
        ...data, 
        createdAt: createdAtISO, 
        updatedAt: updatedAtISO,
        deadline: deadlineISO 
      } as ControlMeasure);
    });
    return controlMeasures;
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error getting control measures from Firestore: ", errorMessage, error.code, error);
    let detailedErrorMessage = "Gagal mengambil daftar tindakan pengendalian dari database.";
    if (error instanceof Error && error.message) {
        detailedErrorMessage += ` Pesan Asli: ${error.message}`;
    }
    if ((error as any).code === 'failed-precondition') {
        detailedErrorMessage += " Ini seringkali disebabkan oleh indeks komposit yang hilang di Firestore. Silakan periksa Firebase Console Anda (Firestore Database > Indexes) untuk membuat indeks yang diperlukan.";
    }
    throw new Error(detailedErrorMessage);
  }
}

export async function updateControlMeasure(id: string, data: Partial<Omit<ControlMeasure, 'id' | 'riskCauseId' | 'potentialRiskId' | 'goalId' | 'userId' | 'period' | 'createdAt' | 'sequenceNumber'>>): Promise<void> {
  try {
    const docRef = doc(db, CONTROL_MEASURES_COLLECTION, id);
    await updateDoc(docRef, {
        ...data,
        deadline: data.deadline === undefined ? undefined : (data.deadline || null),
        budget: data.budget === undefined ? undefined : (data.budget || null),
        updatedAt: serverTimestamp()
    });
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error updating control measure in Firestore: ", errorMessage);
    throw new Error("Gagal memperbarui tindakan pengendalian di database. Pesan: " + errorMessage);
  }
}

export async function deleteControlMeasure(id: string, batch?: WriteBatch): Promise<void> {
  const controlMeasureRef = doc(db, CONTROL_MEASURES_COLLECTION, id);
  if (batch) {
    batch.delete(controlMeasureRef);
  } else {
    try {
      await deleteDoc(controlMeasureRef);
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error deleting control measure from Firestore: ", errorMessage);
      throw new Error("Gagal menghapus tindakan pengendalian dari database. Pesan: " + errorMessage);
    }
  }
}
