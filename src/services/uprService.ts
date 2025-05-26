
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
  limit,
  doc,
  getDoc,
  setDoc
} from 'firebase/firestore';

/**
 * Retrieves a UPR document by its name (case-insensitive).
 * @param name The name of the UPR.
 * @returns The UPR object or null if not found.
 */
export async function getUprByName(name: string): Promise<UPR | null> {
  try {
    const uprsCollectionRef = collection(db, UPRS_COLLECTION);
    
    // Attempt direct match first (common case, case-sensitive)
    const qDirect = query(uprsCollectionRef, where("name", "==", name.trim()), limit(1));
    const directSnapshot = await getDocs(qDirect);

    if (!directSnapshot.empty) {
      const uprDoc = directSnapshot.docs[0];
      const data = uprDoc.data();
      const createdAt = data.createdAt instanceof Timestamp 
                        ? data.createdAt.toDate().toISOString() 
                        : (data.createdAt && typeof data.createdAt === 'string' ? new Date(data.createdAt).toISOString() : new Date().toISOString());
      return {
        id: uprDoc.id,
        code: data.code,
        name: data.name,
        createdAt,
      } as UPR;
    }

    // Fallback for case-insensitive check - can be slow on large datasets
    // Consider storing a normalized (e.g., lowercase) name field for efficient case-insensitive queries
    const allUprsSnapshot = await getDocs(uprsCollectionRef);
    const foundDoc = allUprsSnapshot.docs.find(d => d.data().name.toLowerCase() === name.trim().toLowerCase());
    if (foundDoc) {
      const data = foundDoc.data();
      const createdAt = data.createdAt instanceof Timestamp 
                        ? data.createdAt.toDate().toISOString() 
                        : (data.createdAt && typeof data.createdAt === 'string' ? new Date(data.createdAt).toISOString() : new Date().toISOString());
      return {
        id: foundDoc.id,
        code: data.code,
        name: data.name,
        createdAt,
      } as UPR;
    }

    return null;
  } catch (error: any) {
    console.error("Error getting UPR by name from Firestore. Message:", error.message);
    throw new Error(`Gagal mengambil data UPR berdasarkan nama: ${error.message || String(error)}`);
  }
}

/**
 * Retrieves all UPR documents to determine the next code.
 * @returns Array of UPR objects.
 */
export async function getAllUprs(): Promise<UPR[]> {
  try {
    const q = query(collection(db, UPRS_COLLECTION), orderBy("code", "asc")); 
    const querySnapshot = await getDocs(q);
    const uprs: UPR[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt instanceof Timestamp 
                        ? data.createdAt.toDate().toISOString() 
                        : (data.createdAt && typeof data.createdAt === 'string' ? new Date(data.createdAt).toISOString() : new Date().toISOString());
      uprs.push({
        id: doc.id,
        code: data.code,
        name: data.name,
        createdAt,
      } as UPR);
    });
    return uprs;
  } catch (error: any) {
    console.error("Error getting all UPRs from Firestore. Message:", error.message);
    throw new Error(`Gagal mengambil semua data UPR: ${error.message || String(error)}`);
  }
}

/**
 * Creates a new UPR document in Firestore.
 * Checks for existing UPR with the same name (case-insensitive).
 * Generates a new code (e.g., UPR1, UPR2).
 * @param name The name of the UPR.
 * @returns The newly created UPR object.
 * @throws Error if UPR name already exists or other Firestore error.
 */
export async function createUpr(name: string): Promise<UPR> {
  try {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error("Nama UPR tidak boleh kosong.");
    }

    const existingUpr = await getUprByName(trimmedName); 
    if (existingUpr) {
      throw new Error(`Nama UPR "${trimmedName}" sudah terdaftar. Silakan gunakan nama lain.`);
    }

    const allUprs = await getAllUprs();
    const existingCodes = allUprs.map(u => u.code).filter(c => c && typeof c === 'string' && c.startsWith("UPR"));
    let nextSequence = 1;
    if (existingCodes.length > 0) {
      const numericParts = existingCodes.map(c => parseInt(c.replace("UPR", ""), 10)).filter(n => !isNaN(n));
      if (numericParts.length > 0) {
        nextSequence = Math.max(0, ...numericParts) + 1; // Ensure Math.max has arguments or defaults to 0
      }
    }
    const newUprCode = `UPR${nextSequence}`;

    const uprDataToSave = {
      name: trimmedName, 
      code: newUprCode,
      createdAt: serverTimestamp(),
    };

    console.log('Data to create UPR:', JSON.stringify(uprDataToSave)); // Log data before write

    const docRef = await addDoc(collection(db, UPRS_COLLECTION), uprDataToSave);

    return {
      id: docRef.id,
      name: trimmedName,
      code: newUprCode,
      createdAt: new Date().toISOString(), // Placeholder, actual value is server-generated
    };
  } catch (error: any) {
    console.error("Error creating UPR in Firestore. Message:", error.message);
    // Re-throw specific known errors, otherwise a generic one with the original message
    if (error.message && error.message.startsWith("Nama UPR")) {
        throw error; // Re-throw the specific "Nama UPR sudah terdaftar" error
    }
    throw new Error(`Gagal membuat UPR baru di database: ${error.message || String(error)}`);
  }
}
