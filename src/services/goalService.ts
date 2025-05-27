
"use server";

import { db } from '@/lib/firebase/config';
import type { Goal } from '@/lib/types';
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
    GOALS_COLLECTION,
    POTENTIAL_RISKS_COLLECTION,
} from '@/services/collectionNames';
import { deletePotentialRiskAndSubCollections } from './potentialRiskService'; // Untuk cascading delete

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
  userId: string
): Promise<Goal> {
  try {
    const goalsCollectionRef = collection(db, GOALS_COLLECTION);
    
    // Fetch existing goals for the same uprId and period to determine the next code
    const q = query(
        goalsCollectionRef,
        where("uprId", "==", uprId),
        where("period", "==", period)
    );
    const querySnapshot = await getDocs(q);
    const existingGoalsForContext: Goal[] = [];
    querySnapshot.forEach(doc => {
        existingGoalsForContext.push({ id: doc.id, ...doc.data() } as Goal);
    });

    const firstLetter = goalData.name.charAt(0).toUpperCase();
    const prefix = /^[A-Z]$/.test(firstLetter) ? firstLetter : 'X'; // Default to 'X' if not a letter

    let maxNum = 0;
    existingGoalsForContext.forEach(g => {
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

    const docRef = await addDoc(goalsCollectionRef, docData);

    return {
        id: docRef.id,
        ...goalData,
        code: newGoalCode,
        uprId,
        period,
        userId,
        createdAt: new Date().toISOString() 
    };
  } catch (error: any) {
    console.error("Error adding goal to Firestore. Message:", error.message);
    throw new Error(`Gagal menambahkan sasaran ke database. Pesan: ${error.message || String(error)}`);
  }
}

export async function getGoals(uprId: string | null | undefined, period: string): Promise<GoalsResult> {
  try {
    if (!uprId || uprId.trim() === '') {
      console.warn("[goalService] getGoals: uprId is missing or empty.");
      return {
        success: false,
        message: "UPR ID tidak tersedia. Pengaturan profil mungkin belum lengkap.",
        code: 'NO_UPRID',
        goals: []
      };
    }

    const q = query(
      collection(db, GOALS_COLLECTION),
      where("uprId", "==", uprId),
      where("period", "==", period)
      // orderBy("code", "asc") // Ordering handled client-side for now to avoid complex index requirements upfront
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
    console.error("Error getting goals from Firestore. Message:", error.message);
    let detailedErrorMessage = "Gagal mengambil daftar sasaran dari database.";
    if (error instanceof Error && error.message) {
      detailedErrorMessage += ` Pesan Asli: ${error.message}`;
    }
    if ((error as any).code === 'failed-precondition') {
        detailedErrorMessage += " Ini mungkin disebabkan oleh indeks komposit yang hilang di Firestore. Silakan periksa Firebase Console (Firestore Database > Indexes).";
    }
    throw new Error(detailedErrorMessage);
  }
}

export async function getGoalById(goalId: string, uprId: string, period: string): Promise<Goal | null> {
  try {
    const goalRef = doc(db, GOALS_COLLECTION, goalId);
    const docSnap = await getDoc(goalRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      // Validate against current UPR and Period context
      if (data.uprId !== uprId || data.period !== period) {
        console.warn(`Goal ${goalId} found, but does not match current UPR/Period context. Expected UPR: ${uprId}, Period: ${period}. Found: UPR: ${data.uprId}, Period: ${data.period}`);
        return null;
      }

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
    throw new Error(`Gagal mengambil detail sasaran. Pesan: ${error.message || String(error)}`);
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
    throw new Error(`Gagal memperbarui sasaran di database. Pesan: ${error.message || String(error)}`);
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
      // deletePotentialRiskAndSubCollections will handle deleting PR, its RiskCauses, and their ControlMeasures
      await deletePotentialRiskAndSubCollections(prDoc.id, uprId, period, batch);
    }
    await batch.commit();
  } catch (error: any) {
    console.error("Error deleting goal and related data from Firestore. Message:", error.message);
    throw new Error(`Gagal menghapus sasaran dan data terkait. Pesan: ${error.message || String(error)}`);
  }
}

    