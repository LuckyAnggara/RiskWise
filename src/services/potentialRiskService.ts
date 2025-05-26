
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
import { deleteRiskCauseAndSubCollections } from './riskCauseService'; // Pastikan ini diimpor

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
      category: data.category || null,
      owner: data.owner || null,
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
      identifiedAt: new Date().toISOString(), // Placeholder, server akan mengisi yang sebenarnya
    };
  } catch (error: any) {
    console.error("Error adding potential risk to Firestore: ", error.message, error.code, error);
    throw new Error(`Gagal menambahkan potensi risiko ke database. Pesan: ${error.message}`);
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
    console.error("Error getting potential risks from Firestore: ", error.message, error.code, error.details);
    let detailedErrorMessage = "Gagal mengambil daftar potensi risiko dari database.";
    if (error.message) {
      detailedErrorMessage += ` Pesan Asli: ${error.message}`;
    }
    if (error.code) {
      detailedErrorMessage += ` Kode Error: ${error.code}`;
      if (error.code === 'failed-precondition' && error.message && error.message.toLowerCase().includes('index')) {
        detailedErrorMessage += " Kemungkinan besar ini disebabkan oleh indeks komposit yang hilang di Firestore. Silakan periksa Firebase Console Anda (Firestore Database > Indexes) untuk membuat indeks yang diperlukan. Link untuk membuat indeks mungkin ada di log error server/konsol browser Anda.";
      }
    }
    throw new Error(detailedErrorMessage);
  }
}

export async function getPotentialRiskById(id: string): Promise<PotentialRisk | null> {
  try {
    const docRef = doc(db, POTENTIAL_RISKS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
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
    console.error("Error getting potential risk by ID from Firestore: ", error.message, error.code, error);
    throw new Error(`Gagal mengambil detail potensi risiko dari database. Pesan: ${error.message}`);
  }
}

export async function updatePotentialRisk(id: string, data: Partial<Omit<PotentialRisk, 'id' | 'uprId' | 'period' | 'userId' | 'goalId'>>): Promise<void> {
  try {
    const docRef = doc(db, POTENTIAL_RISKS_COLLECTION, id);
    await updateDoc(docRef, {
        ...data,
        category: data.category || null,
        owner: data.owner || null,
        updatedAt: serverTimestamp() 
    });
  } catch (error: any) {
    console.error("Error updating potential risk in Firestore: ", error.message, error.code, error);
    throw new Error(`Gagal memperbarui potensi risiko di database. Pesan: ${error.message}`);
  }
}

export async function deletePotentialRiskAndSubCollections(potentialRiskId: string, uprId: string, period: string, batch?: WriteBatch): Promise<void> {
  const localBatch = batch || writeBatch(db);
  try {
    const riskCauses = await getRiskCausesByPotentialRiskId(potentialRiskId, uprId, period);

    for (const riskCause of riskCauses) {
      await deleteRiskCauseAndSubCollections(riskCause.id, uprId, period, localBatch);
    }

    const potentialRiskRef = doc(db, POTENTIAL_RISKS_COLLECTION, potentialRiskId);
    localBatch.delete(potentialRiskRef);

    if (!batch) {
      await localBatch.commit();
    }
  } catch (error: any) {
    console.error("Error deleting potential risk and its sub-collections: ", error.message, error.code, error);
    throw new Error(`Gagal menghapus potensi risiko dan data terkaitnya. Pesan: ${error.message}`);
  }
}

    