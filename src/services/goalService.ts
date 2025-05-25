
// src/services/goalService.ts
"use server"; // Jika fungsi ini akan dipanggil dari Server Components atau Server Actions

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
  serverTimestamp
} from 'firebase/firestore';

const GOALS_COLLECTION = 'goals';

export async function addGoal(
  goalData: Omit<Goal, 'id' | 'createdAt' | 'uprId' | 'period' | 'userId'>,
  uprId: string,
  period: string,
  userId: string
): Promise<Goal> {
  try {
    const goalsWithSamePrefix = await getGoals(uprId, period); // Ambil semua goal untuk UPR dan periode ini
    const firstLetter = goalData.name.charAt(0).toUpperCase();
    const prefix = /^[A-Z]$/.test(firstLetter) ? firstLetter : 'X';
    
    const relevantGoals = goalsWithSamePrefix.filter(g => g.code && g.code.startsWith(prefix));
    let maxNum = 0;
    relevantGoals.forEach(g => {
      if (g.code) {
        const numPart = parseInt(g.code.substring(prefix.length), 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    });
    const newNumericPart = maxNum + 1;
    const newGoalCode = `${prefix}${newNumericPart}`;

    const docRef = await addDoc(collection(db, GOALS_COLLECTION), {
      ...goalData,
      code: newGoalCode,
      uprId,
      period,
      userId,
      createdAt: serverTimestamp() // Gunakan serverTimestamp untuk konsistensi
    });
    return { 
        id: docRef.id, 
        ...goalData, 
        code: newGoalCode, 
        uprId, 
        period, 
        userId, 
        createdAt: new Date().toISOString() // Untuk kembalian langsung, bisa di-update dengan snapshot
    };
  } catch (error) {
    console.error("Error adding goal to Firestore: ", error);
    throw error;
  }
}

export async function getGoals(uprId: string, period: string): Promise<Goal[]> {
  try {
    const q = query(
      collection(db, GOALS_COLLECTION),
      where("uprId", "==", uprId),
      where("period", "==", period),
      orderBy("code", "asc") // Urutkan berdasarkan code
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
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(), // Handle Timestamp
        uprId: data.uprId,
        period: data.period,
        userId: data.userId,
      } as Goal);
    });
    // Pengurutan numerik yang lebih baik setelah pengambilan data
    return goals.sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, {numeric: true, sensitivity: 'base'}));
  } catch (error) {
    console.error("Error getting goals from Firestore: ", error);
    return []; // Kembalikan array kosong jika terjadi error
  }
}

export async function updateGoal(goalId: string, updatedData: Partial<Omit<Goal, 'id' | 'uprId' | 'period' | 'userId' | 'code'>>): Promise<void> {
  try {
    const goalRef = doc(db, GOALS_COLLECTION, goalId);
    await updateDoc(goalRef, updatedData);
  } catch (error) {
    console.error("Error updating goal in Firestore: ", error);
    throw error;
  }
}

export async function deleteGoal(goalId: string): Promise<void> {
  try {
    // PENTING: Ini hanya menghapus dokumen Goal.
    // Jika ada subkoleksi (PotentialRisks, dll.) di bawah Goal ini,
    // Anda perlu implementasi penghapusan berjenjang (cascading delete),
    // biasanya menggunakan Firebase Cloud Functions.
    await deleteDoc(doc(db, GOALS_COLLECTION, goalId));
  } catch (error) {
    console.error("Error deleting goal from Firestore: ", error);
    throw error;
  }
}
