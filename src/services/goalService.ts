
// src/services/goalService.ts
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
  writeBatch
} from 'firebase/firestore';
import { 
  POTENTIAL_RISKS_COLLECTION, 
  RISK_CAUSES_COLLECTION, 
  CONTROL_MEASURES_COLLECTION 
} from '@/services/collectionNames'; // Import collection names

export const GOALS_COLLECTION = 'goals';

export async function addGoal(
  goalData: Omit<Goal, 'id' | 'code' | 'createdAt' | 'uprId' | 'period' | 'userId'>,
  uprId: string,
  period: string,
  userId: string
): Promise<Goal> {
  try {
    const goalsCollectionRef = collection(db, GOALS_COLLECTION);
    const q = query(
      goalsCollectionRef,
      where("uprId", "==", uprId),
      where("period", "==", period)
    );
    const querySnapshot = await getDocs(q);
    
    const firstLetter = goalData.name.charAt(0).toUpperCase();
    const prefix = /^[A-Z]$/.test(firstLetter) ? firstLetter : 'X';
    
    let maxNum = 0;
    querySnapshot.forEach(doc => {
      const data = doc.data();
      if (data.code && typeof data.code === 'string' && data.code.startsWith(prefix)) {
        const numPart = parseInt(data.code.substring(prefix.length), 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    });
    const newNumericPart = maxNum + 1;
    const newGoalCode = `${prefix}${newNumericPart}`;

    const docRef = await addDoc(goalsCollectionRef, {
      ...goalData,
      code: newGoalCode,
      uprId,
      period,
      userId,
      createdAt: serverTimestamp() 
    });

    return { 
        id: docRef.id, 
        ...goalData, 
        code: newGoalCode, 
        uprId, 
        period, 
        userId, 
        createdAt: new Date().toISOString() 
    };
  } catch (error) {
    console.error("Error adding goal to Firestore: ", error);
    throw new Error("Gagal menambahkan sasaran ke database.");
  }
}

export async function getGoals(uprId: string, period: string): Promise<Goal[]> {
  try {
    const q = query(
      collection(db, GOALS_COLLECTION),
      where("uprId", "==", uprId),
      where("period", "==", period),
      orderBy("code", "asc") 
    );
    const querySnapshot = await getDocs(q);
    const goals: Goal[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      goals.push({
        id: doc.id,
        name: data.name,
        description: data.description,
        code: data.code,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date(data.createdAt).toISOString(),
        uprId: data.uprId,
        period: data.period,
        userId: data.userId,
      } as Goal);
    });
    return goals.sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, {numeric: true, sensitivity: 'base'}));
  } catch (error) {
    console.error("Error getting goals from Firestore: ", error);
    throw new Error("Gagal mengambil daftar sasaran dari database.");
  }
}

export async function updateGoal(goalId: string, updatedData: Partial<Omit<Goal, 'id' | 'uprId' | 'period' | 'userId' | 'code'>>): Promise<void> {
  try {
    const goalRef = doc(db, GOALS_COLLECTION, goalId);
    await updateDoc(goalRef, {
      ...updatedData,
      updatedAt: serverTimestamp() 
    });
  } catch (error) {
    console.error("Error updating goal in Firestore: ", error);
    throw new Error("Gagal memperbarui sasaran di database.");
  }
}

export async function deleteGoal(goalId: string, uprId: string, period: string): Promise<void> {
  const batch = writeBatch(db);
  try {
    // 1. Delete Goal document
    const goalRef = doc(db, GOALS_COLLECTION, goalId);
    batch.delete(goalRef);

    // 2. Find and delete related PotentialRisks
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

      // 3. Find and delete related RiskCauses for each PotentialRisk
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

        // 4. Find and delete related ControlMeasures for each RiskCause
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
  } catch (error) {
    console.error("Error deleting goal and related data from Firestore: ", error);
    throw new Error("Gagal menghapus sasaran dan data terkait dari database.");
  }
}
