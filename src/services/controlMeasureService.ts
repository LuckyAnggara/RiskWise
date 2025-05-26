
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
  data: Omit<ControlMeasure, 'id' | 'createdAt' | 'uprId' | 'period' | 'userId' | 'riskCauseId' | 'potentialRiskId' | 'goalId' | 'sequenceNumber'>,
  riskCauseId: string,
  potentialRiskId: string,
  goalId: string,
  uprId: string,
  period: string,
  userId: string,
  sequenceNumber: number
): Promise<ControlMeasure> {
  try {
    const docRef = await addDoc(collection(db, CONTROL_MEASURES_COLLECTION), {
      ...data,
      riskCauseId,
      potentialRiskId,
      goalId,
      uprId,
      period,
      userId,
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
      uprId,
      period,
      userId,
      sequenceNumber,
      createdAt: new Date().toISOString(), // Placeholder
    };
  } catch (error) {
    console.error("Error adding control measure to Firestore: ", error);
    throw new Error("Gagal menambahkan tindakan pengendalian ke database.");
  }
}

export async function getControlMeasuresByRiskCauseId(riskCauseId: string, uprId: string, period: string): Promise<ControlMeasure[]> {
  try {
    const q = query(
      collection(db, CONTROL_MEASURES_COLLECTION),
      where("riskCauseId", "==", riskCauseId),
      where("uprId", "==", uprId),
      where("period", "==", period),
      orderBy("controlType", "asc"), // Or by sequenceNumber if that's preferred for display
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
      controlMeasures.push({ id: doc.id, ...data, createdAt: createdAtISO, updatedAt: updatedAtISO } as ControlMeasure);
    });
    return controlMeasures;
  } catch (error) {
    console.error("Error getting control measures from Firestore: ", error);
    throw new Error("Gagal mengambil daftar tindakan pengendalian dari database.");
  }
}

export async function updateControlMeasure(id: string, data: Partial<Omit<ControlMeasure, 'id' | 'riskCauseId' | 'potentialRiskId' | 'goalId' | 'uprId' | 'period' | 'userId'>>): Promise<void> {
  try {
    const docRef = doc(db, CONTROL_MEASURES_COLLECTION, id);
    await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating control measure in Firestore: ", error);
    throw new Error("Gagal memperbarui tindakan pengendalian di database.");
  }
}

export async function deleteControlMeasure(id: string, batch?: WriteBatch): Promise<void> {
  const controlMeasureRef = doc(db, CONTROL_MEASURES_COLLECTION, id);
  if (batch) {
    batch.delete(controlMeasureRef);
  } else {
    try {
      await deleteDoc(controlMeasureRef);
    } catch (error) {
      console.error("Error deleting control measure from Firestore: ", error);
      throw new Error("Gagal menghapus tindakan pengendalian dari database.");
    }
  }
}
