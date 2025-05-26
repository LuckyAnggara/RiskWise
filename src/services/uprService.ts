
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
    // Firestore queries are case-sensitive by default.
    // To do a case-insensitive search efficiently, you'd typically store a normalized version (e.g., lowercase)
    // of the name. For a small number of UPRs, fetching all and filtering client-side might be acceptable,
    // but it's not scalable. For now, we'll query for exact match and then try filtering if not too many docs.
    // A more robust solution would involve structuring data for case-insensitive queries if needed.
    
    const q = query(uprsCollectionRef, where("name", "==", name), limit(1));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const uprDoc = querySnapshot.docs[0];
      const data = uprDoc.data();
      const createdAt = data.createdAt instanceof Timestamp 
                        ? data.createdAt.toDate().toISOString() 
                        : (data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString());
      return {
        id: uprDoc.id,
        code: data.code,
        name: data.name,
        createdAt,
      } as UPR;
    }

    // Fallback for case-insensitive check if few documents - NOT SCALABLE
    const allUprsSnapshot = await getDocs(uprsCollectionRef);
    const foundDoc = allUprsSnapshot.docs.find(d => d.data().name.toLowerCase() === name.toLowerCase());
    if (foundDoc) {
      const data = foundDoc.data();
      const createdAt = data.createdAt instanceof Timestamp 
                        ? data.createdAt.toDate().toISOString() 
                        : (data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString());
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
    throw new Error(`Gagal mengambil data UPR berdasarkan nama: ${error.message || error}`);
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
                        : (data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString());
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
    throw new Error(`Gagal mengambil semua data UPR: ${error.message || error}`);
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
    const existingUpr = await getUprByName(name); 
    if (existingUpr) {
      throw new Error(`Nama UPR "${name}" sudah terdaftar. Silakan gunakan nama lain.`);
    }

    const allUprs = await getAllUprs();
    const existingCodes = allUprs.map(u => u.code).filter(c => c && c.startsWith("UPR"));
    let nextSequence = 1;
    if (existingCodes.length > 0) {
      const numericParts = existingCodes.map(c => parseInt(c.replace("UPR", ""), 10)).filter(n => !isNaN(n));
      if (numericParts.length > 0) {
        nextSequence = Math.max(...numericParts) + 1;
      }
    }
    const newUprCode = `UPR${nextSequence}`;

    const uprDataToSave = {
      name: name.trim(), 
      code: newUprCode,
      createdAt: serverTimestamp(),
    };

    console.log('Data to save for new UPR:', uprDataToSave); // Logging data before write

    const docRef = await addDoc(collection(db, UPRS_COLLECTION), uprDataToSave);

    return {
      id: docRef.id,
      name: name.trim(),
      code: newUprCode,
      createdAt: new Date().toISOString(), // Placeholder, actual value is server-generated
    };
  } catch (error: any) {
    console.error("Error creating UPR in Firestore. Message:", error.message);
    if (error.message.startsWith("Nama UPR")) {
        throw error;
    }
    throw new Error(`Gagal membuat UPR baru di database: ${error.message || error}`);
  }
}
