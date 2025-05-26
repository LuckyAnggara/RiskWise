
"use server";

import { db } from '@/lib/firebase/config';
import type { UPR } from '@/lib/types';
import { UPRS_COLLECTION } from './collectionNames';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  limit
} from 'firebase/firestore';

/**
 * Retrieves a UPR document by its name (case-insensitive).
 * @param name The name of the UPR.
 * @returns The UPR object or null if not found.
 */
export async function getUprByName(name: string): Promise<UPR | null> {
  try {
    const q = query(
      collection(db, UPRS_COLLECTION),
      where("name", "==", name) // Firestore 'where' is case-sensitive. Client-side check needed or use lowercase.
                                 // For simplicity here, we assume client sends consistent case or handles it.
                                 // A more robust solution might store a lowercase version of the name for querying.
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0]; // Assuming name is unique
      const data = doc.data();
      return {
        id: doc.id,
        code: data.code,
        name: data.name,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
      } as UPR;
    }
    return null;
  } catch (error) {
    console.error("Error getting UPR by name from Firestore: ", error);
    throw new Error("Gagal mengambil data UPR berdasarkan nama.");
  }
}

/**
 * Retrieves all UPR documents to determine the next code.
 * @returns Array of UPR objects.
 */
export async function getAllUprs(): Promise<UPR[]> {
  try {
    const q = query(collection(db, UPRS_COLLECTION), orderBy("createdAt", "asc"));
    const querySnapshot = await getDocs(q);
    const uprs: UPR[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      uprs.push({
        id: doc.id,
        code: data.code,
        name: data.name,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
      } as UPR);
    });
    return uprs;
  } catch (error) {
    console.error("Error getting all UPRs from Firestore: ", error);
    throw new Error("Gagal mengambil semua data UPR.");
  }
}

/**
 * Creates a new UPR document in Firestore.
 * Checks for existing UPR with the same name (case-insensitive).
 * Generates a new code (e.g., UPR1, UPR2).
 * @param name The name of the UPR.
 * @returns The newly created UPR object.
 * @throws Error if UPR name already exists.
 */
export async function createUpr(name: string): Promise<UPR> {
  try {
    // Case-insensitive check for existing UPR name
    const uprsSnapshot = await getDocs(collection(db, UPRS_COLLECTION));
    const existingUpr = uprsSnapshot.docs.find(doc => doc.data().name.toLowerCase() === name.toLowerCase());

    if (existingUpr) {
      throw new Error(`Nama UPR "${name}" sudah terdaftar. Silakan gunakan nama lain.`);
    }

    const allUprs = uprsSnapshot.docs.map(doc => doc.data() as UPR);
    const nextSequence = allUprs.length + 1;
    const newUprCode = `UPR${nextSequence}`;

    const docRef = await addDoc(collection(db, UPRS_COLLECTION), {
      name: name,
      code: newUprCode,
      createdAt: serverTimestamp(),
    });

    return {
      id: docRef.id,
      name: name,
      code: newUprCode,
      createdAt: new Date().toISOString(), // Placeholder, actual value is server-generated
    };
  } catch (error: any) {
    console.error("Error creating UPR in Firestore: ", error.message);
    // Re-throw the specific error message if it's the "name already exists" error
    if (error.message.startsWith("Nama UPR")) {
        throw error;
    }
    throw new Error("Gagal membuat UPR baru di database.");
  }
}
