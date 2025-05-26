
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
  writeBatch
} from 'firebase/firestore';
import { 
    GOALS_COLLECTION,
    POTENTIAL_RISKS_COLLECTION,
    RISK_CAUSES_COLLECTION,
    CONTROL_MEASURES_COLLECTION
} from './collectionNames';

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
  existingGoals: Goal[] // Pass existing goals to determine the next code
): Promise<Goal> {
  try {
    const goalsCollectionRef = collection(db, GOALS_COLLECTION);
    const firstLetter = goalData.name.charAt(0).toUpperCase();
    const prefix = /^[A-Z]$/.test(firstLetter) ? firstLetter : 'X'; // Default to 'X' if not a letter

    // Filter existing goals for the current UPR, Period, and starting letter
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

    const docRef = await addDoc(goalsCollectionRef, docData);

    return {
        id: docRef.id,
        name: goalData.name,
        description: goalData.description,
        code: newGoalCode,
        uprId,
        period,
        userId,
        createdAt: new Date().toISOString() // Placeholder, actual value is server-generated
    };
  } catch (error: any) {
    console.error("Error adding goal to Firestore. Message:", error.message);
    throw new Error("Gagal menambahkan sasaran ke database.");
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
      // orderBy("code", "asc") // Ordering by code will be done client-side after fetching
    );

    const querySnapshot = await getDocs(q);
    const goals: Goal[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const createdAtISO = data.createdAt instanceof Timestamp
                             ? data.createdAt.toDate().toISOString()
                             : (data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString());
      goals.push({
        id: doc.id,
        name: data.name,
        description: data.description,
        code: data.code || '', // Ensure code is always a string
        createdAt: createdAtISO,
        uprId: data.uprId,
        period: data.period,
        userId: data.userId,
      } as Goal);
    });

    // Sort client-side to handle mixed numeric/alpha codes correctly
    const sortedGoals = goals.sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, {numeric: true, sensitivity: 'base'}));

    return { success: true, goals: sortedGoals };
  } catch (error: any) {
    console.error("Error getting goals from Firestore. Message:", error.message);
    return {
      success: false,
      message: "Gagal mengambil daftar sasaran dari database.",
      code: 'UNKNOWN_ERROR'
    };
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
    // 1. Delete Goal document
    const goalRef = doc(db, GOALS_COLLECTION, goalId);
    batch.delete(goalRef);

    // 2. Find and prepare to delete related PotentialRisks
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

      // 3. Find and prepare to delete related RiskCauses for each PotentialRisk
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

        // 4. Find and prepare to delete related ControlMeasures for each RiskCause
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
