
"use server";

import { db } from '@/lib/firebase/config';
import type { Goal, PotentialRisk, RiskCause, ControlMeasure } from '@/lib/types';
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
  getDoc // Added getDoc
} from 'firebase/firestore';
import { 
    GOALS_COLLECTION,
    POTENTIAL_RISKS_COLLECTION,
    RISK_CAUSES_COLLECTION,
    CONTROL_MEASURES_COLLECTION
} from '@/services/collectionNames';

export interface GoalsResult {
  success: boolean;
  goals?: Goal[];
  message?: string;
  code?: 'NO_UPRID' | 'UNKNOWN_ERROR';
}

export async function addGoal(
  goalData: Omit<Goal, 'id' | 'code' | 'createdAt' | 'uprId' | 'period' | 'userId'>,
  uprId: string,
  period: string,
  userId: string,
  existingGoals: Goal[]
): Promise<Goal> {
  try {
    const goalsCollectionRef = collection(db, GOALS_COLLECTION);
    const firstLetter = goalData.name.charAt(0).toUpperCase();
    const prefix = /^[A-Z]$/.test(firstLetter) ? firstLetter : 'X';

    const relevantGoals = existingGoals.filter(
      g => g.uprId === uprId && g.period === period && g.code && g.code.startsWith(prefix)
    );

    let maxNum = 0;
    relevantGoals.forEach(g => {
      if (g.code && typeof g.code === 'string' && g.code.startsWith(prefix)) {
        const numPart = parseInt(g.code.substring(prefix.length), 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    });
    const newNumericPart = maxNum + 1;
    const newGoalCode = `${prefix}${newNumericPart}`;

    const docData = {
      ...goalData,
      code: newGoalCode,
      uprId,
      period,
      userId,
      createdAt: serverTimestamp()
    };

    console.log("Attempting to add goal with data:", docData);
    const docRef = await addDoc(goalsCollectionRef, docData);
    console.log("Goal added successfully with ID:", docRef.id);

    return {
        id: docRef.id,
        name: goalData.name,
        description: goalData.description,
        code: newGoalCode,
        uprId,
        period,
        userId,
        createdAt: new Date().toISOString() 
    };
  } catch (error: any) {
    console.error("Error adding goal to Firestore. Message:", error.message, "Code:", error.code, "Details:", error.details);
    throw new Error(`Gagal menambahkan sasaran ke database. Pesan: ${error.message}`);
  }
}

export async function getGoals(uprId: string | null | undefined, period: string): Promise<GoalsResult> {
  try {
    if (!uprId || uprId.trim() === '') {
      console.warn("uprId belum tersedia. Membutuhkan uprId dari Admin.");
      return {
        success: false,
        message: "Untuk melihat sasaran, Anda memerlukan uprId yang akan diberikan oleh Admin.",
        code: 'NO_UPRID'
      };
    }

    const q = query(
      collection(db, GOALS_COLLECTION),
      where("uprId", "==", uprId),
      where("period", "==", period)
    );

    const querySnapshot = await getDocs(q);
    const goals: Goal[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const createdAtTimestamp = data.createdAt as Timestamp | undefined;
      const createdAtISO = createdAtTimestamp
                             ? createdAtTimestamp.toDate().toISOString()
                             : (data.createdAt && typeof data.createdAt === 'string' ? new Date(data.createdAt).toISOString() : new Date().toISOString());
      
      goals.push({
        id: doc.id,
        name: data.name,
        description: data.description,
        code: data.code || '', 
        createdAt: createdAtISO,
        uprId: data.uprId,
        period: data.period,
        userId: data.userId,
      } as Goal);
    });
    
    const sortedGoals = goals.sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, {numeric: true, sensitivity: 'base'}));
    return { success: true, goals: sortedGoals };
  } catch (error: any) {
    console.error("Error getting goals from Firestore. Message:", error.message, "Code:", error.code, "Details:", error.details);
    let detailedErrorMessage = "Gagal mengambil daftar sasaran dari database.";
    if (error.message) {
      detailedErrorMessage += ` Pesan Asli: ${error.message}`;
    }
    if (error.code) {
      detailedErrorMessage += ` Kode Error: ${error.code}`;
      if (error.code === 'failed-precondition' && error.message && error.message.toLowerCase().includes('index')) {
        detailedErrorMessage += " Kemungkinan ini disebabkan oleh indeks komposit yang hilang di Firestore. Silakan periksa Firebase Console (Firestore Database > Indexes) untuk membuat indeks yang diperlukan. Link untuk membuat indeks mungkin ada di log error server/konsol browser Anda.";
      }
    }
    throw new Error(detailedErrorMessage);
  }
}

export async function getGoalById(goalId: string): Promise<Goal | null> {
  try {
    const goalRef = doc(db, GOALS_COLLECTION, goalId);
    const docSnap = await getDoc(goalRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const createdAtTimestamp = data.createdAt as Timestamp | undefined;
      const createdAtISO = createdAtTimestamp
                             ? createdAtTimestamp.toDate().toISOString()
                             : (data.createdAt && typeof data.createdAt === 'string' ? new Date(data.createdAt).toISOString() : new Date().toISOString());
      
      return {
        id: docSnap.id,
        name: data.name,
        description: data.description,
        code: data.code || '',
        createdAt: createdAtISO,
        uprId: data.uprId,
        period: data.period,
        userId: data.userId,
      } as Goal;
    } else {
      console.log(`Goal dengan ID ${goalId} tidak ditemukan.`);
      return null;
    }
  } catch (error: any) {
    console.error(`Error getting goal by ID ${goalId} from Firestore: `, error.message);
    throw new Error(`Gagal mengambil detail sasaran. Pesan: ${error.message}`);
  }
}


export async function updateGoal(goalId: string, updatedData: Partial<Omit<Goal, 'id' | 'uprId' | 'period' | 'userId' | 'code' | 'createdAt'>>): Promise<void> {
  try {
    const goalRef = doc(db, GOALS_COLLECTION, goalId);
    await updateDoc(goalRef, {
      ...updatedData,
      updatedAt: serverTimestamp()
    });
  } catch (error: any) {
    console.error("Error updating goal in Firestore. Message:", error.message);
    throw new Error("Gagal memperbarui sasaran di database.");
  }
}

export async function deleteGoal(goalId: string, uprId: string, period: string): Promise<void> {
  const batch = writeBatch(db);
  try {
    const goalRef = doc(db, GOALS_COLLECTION, goalId);
    batch.delete(goalRef);

    const potentialRisksQuery = query(
      collection(db, POTENTIAL_RISKS_COLLECTION),
      where("goalId", "==", goalId),
      where("uprId", "==", uprId),
      where("period", "==", period)
    );
    const potentialRisksSnapshot = await getDocs(potentialRisksQuery);
    
    for (const prDoc of potentialRisksSnapshot.docs) {
      const potentialRiskId = prDoc.id;
      batch.delete(prDoc.ref);

      const riskCausesQuery = query(
        collection(db, RISK_CAUSES_COLLECTION),
        where("potentialRiskId", "==", potentialRiskId),
        where("uprId", "==", uprId),
        where("period", "==", period)
      );
      const riskCausesSnapshot = await getDocs(riskCausesQuery);

      for (const rcDoc of riskCausesSnapshot.docs) {
        const riskCauseId = rcDoc.id;
        batch.delete(rcDoc.ref);

        const controlMeasuresQuery = query(
          collection(db, CONTROL_MEASURES_COLLECTION),
          where("riskCauseId", "==", riskCauseId),
          where("uprId", "==", uprId),
          where("period", "==", period)
        );
        const controlMeasuresSnapshot = await getDocs(controlMeasuresQuery);
        controlMeasuresSnapshot.forEach(cmDoc => batch.delete(cmDoc.ref));
      }
    }
    await batch.commit();
  } catch (error: any) {
    console.error("Error deleting goal and related data from Firestore. Message:", error.message);
    throw new Error("Gagal menghapus sasaran dan data terkait dari database.");
  }
}
