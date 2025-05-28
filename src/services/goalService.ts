
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
} from '@/services/collectionNames';
import { deletePotentialRiskAndSubCollections } from './potentialRiskService';

export interface GoalsResult {
  success: boolean;
  goals?: Goal[];
  message?: string;
}

export async function addGoal(
  goalData: Omit<Goal, 'id' | 'code' | 'createdAt' | 'period' | 'userId'>,
  userId: string,
  period: string
): Promise<Goal> {
  try {
    const goalsCollectionRef = collection(db, GOALS_COLLECTION);
    
    const q = query(
        goalsCollectionRef,
        where("userId", "==", userId),
        where("period", "==", period)
    );
    const querySnapshot = await getDocs(q);
    const existingGoalsForContext: Goal[] = [];
    querySnapshot.forEach(doc => {
        const data = doc.data();
        existingGoalsForContext.push({ id: doc.id, code: data.code, ...data } as Goal);
    });

    const firstLetter = goalData.name.charAt(0).toUpperCase();
    const prefix = /^[A-Z]$/.test(firstLetter) ? firstLetter : 'S'; // Default to 'S' (Sasaran)
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
      code: newGoalCode, // Keep the generated code
      userId,
      period,
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(goalsCollectionRef, docData);

    return {
        id: docRef.id,
        ...goalData,
        code: newGoalCode,
        userId,
        period,
        createdAt: new Date().toISOString() 
    };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error adding goal to Firestore. Message:", errorMessage);
    throw new Error(`Gagal menambahkan sasaran ke database. Pesan: ${errorMessage}`);
  }
}

export async function getGoals(userId: string | null | undefined, period: string | null | undefined): Promise<GoalsResult> {
  try {
    if (!userId || !period) {
      console.warn("[goalService] getGoals: userId or period is missing.", {userId, period});
      return {
        success: false,
        message: "Konteks pengguna (ID Pengguna atau Periode) tidak tersedia.",
        goals: []
      };
    }

    console.log("[goalService] getGoals: Querying with userId:", userId, "and period:", period);
    const q = query(
      collection(db, GOALS_COLLECTION),
      where("userId", "==", userId),
      where("period", "==", period),
      orderBy("code", "asc")
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
        userId: data.userId,
        period: data.period,
      } as Goal);
    });

    console.log("[goalService] getGoals: querySnapshot size:", querySnapshot.size, "Fetched goals:", goals);
    return { success: true, goals: goals };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error getting goals from Firestore. Message:", errorMessage, error.code, error);
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

export async function getGoalById(goalId: string, userId: string, period: string): Promise<Goal | null> {
  try {
    if (!userId || !period) {
      console.warn(`[goalService] getGoalById: userId or period is missing for goalId ${goalId}`);
      return null;
    }
    const goalRef = doc(db, GOALS_COLLECTION, goalId);
    const docSnap = await getDoc(goalRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.userId !== userId || data.period !== period) {
        console.warn(`Goal ${goalId} found, but does not match current user/period context. Expected User: ${userId}, Period: ${period}. Found: User: ${data.userId}, Period: ${data.period}`);
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
        userId: data.userId,
        period: data.period,
      } as Goal;
    } else {
      console.log(`Goal dengan ID ${goalId} tidak ditemukan.`);
      return null;
    }
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error getting goal by ID ${goalId} from Firestore: `, errorMessage);
    throw new Error(`Gagal mengambil detail sasaran. Pesan: ${errorMessage}`);
  }
}

export async function updateGoal(goalId: string, updatedData: Partial<Omit<Goal, 'id' | 'userId' | 'period' | 'code' | 'createdAt'>>): Promise<void> {
  try {
    const goalRef = doc(db, GOALS_COLLECTION, goalId);
    await updateDoc(goalRef, {
      ...updatedData,
      updatedAt: serverTimestamp()
    });
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error updating goal in Firestore. Message:", errorMessage);
    throw new Error(`Gagal memperbarui sasaran di database. Pesan: ${errorMessage}`);
  }
}

export async function deleteGoal(goalId: string, userId: string, period: string): Promise<void> {
  const batch = writeBatch(db);
  try {
    const goalRef = doc(db, GOALS_COLLECTION, goalId);
    
    // Ensure the goal belongs to the user and period before deleting
    const goalDoc = await getDoc(goalRef);
    if (goalDoc.exists()) {
        const goalData = goalDoc.data();
        if (goalData.userId !== userId || goalData.period !== period) {
            throw new Error("Sasaran tidak dapat dihapus: tidak cocok dengan konteks pengguna/periode.");
        }
    } else {
        throw new Error("Sasaran tidak ditemukan untuk dihapus.");
    }
    batch.delete(goalRef);
    
    // Delete related PotentialRisks (and their sub-collections)
    // This requires fetching potential risks for this goal, userId, and period
    const q = query(
      collection(db, "potentialRisks"), // Assuming POTENTIAL_RISKS_COLLECTION is "potentialRisks"
      where("goalId", "==", goalId),
      where("userId", "==", userId),
      where("period", "==", period)
    );
    const potentialRisksSnapshot = await getDocs(q);
    
    for (const prDoc of potentialRisksSnapshot.docs) {
      // deletePotentialRiskAndSubCollections needs to be adapted to use userId and period
      await deletePotentialRiskAndSubCollections(prDoc.id, userId, period, batch);
    }
    await batch.commit();
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error deleting goal and related data from Firestore. Message:", errorMessage);
    throw new Error(`Gagal menghapus sasaran dan data terkait. Pesan: ${errorMessage}`);
  }
}
