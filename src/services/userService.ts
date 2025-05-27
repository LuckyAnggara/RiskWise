
"use server";

import { db } from "@/lib/firebase/config";
import { USERS_COLLECTION } from "./collectionNames";
import {
  Timestamp,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  type DocumentReference,
  type DocumentData,
} from "firebase/firestore";
import type { User as FirebaseUser } from "firebase/auth";
import type { AppUser, UserRole } from "@/lib/types";

const DEFAULT_INITIAL_PERIOD = new Date().getFullYear().toString();
const DEFAULT_AVAILABLE_PERIODS = [
  (new Date().getFullYear() - 1).toString(),
  DEFAULT_INITIAL_PERIOD,
  (new Date().getFullYear() + 1).toString(),
];

export async function getUserDocument(uid: string): Promise<AppUser | null> {
  if (!uid) {
    console.warn("[userService] getUserDocument: UID is missing.");
    return null;
  }
  console.log("[userService] getUserDocument: Attempting to fetch user document for UID:", uid);
  const userDocRef = doc(db, USERS_COLLECTION, uid);
  try {
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log("[userService] getUserDocument: Document found for UID:", uid, "Data:", data);
      const createdAt = data.createdAt instanceof Timestamp
                        ? data.createdAt.toDate().toISOString()
                        : (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString());
      const updatedAt = data.updatedAt instanceof Timestamp
                        ? data.updatedAt.toDate().toISOString()
                        : (typeof data.updatedAt === 'string' ? data.updatedAt : undefined);
      
      return {
        uid: data.uid,
        email: data.email || null,
        displayName: data.displayName || null,
        photoURL: data.photoURL || null,
        role: data.role || 'userSatker',
        uprId: data.uprId || null,
        activePeriod: data.activePeriod || null,
        availablePeriods: Array.isArray(data.availablePeriods) ? data.availablePeriods : null,
        createdAt,
        updatedAt,
      } as AppUser;
    } else {
      console.log("[userService] getUserDocument: No document found for UID:", uid);
      return null;
    }
  } catch (error: any) {
    console.error("[userService] Error fetching user document for UID:", uid, "Error:", error.message || String(error));
    throw new Error(`Gagal mengambil data pengguna dari database: ${error.message || String(error)}`);
  }
}

// Fungsi ini sekarang utama untuk membuat ATAU memperbarui profil pengguna,
// terutama dipanggil dari halaman Pengaturan.
export async function updateUserProfileData(
  uid: string,
  data: Partial<Pick<AppUser, "displayName" | "photoURL" | "activePeriod" | "availablePeriods">>
): Promise<void> {
  if (!uid) throw new Error("UID pengguna diperlukan untuk memperbarui profil.");
  console.log(`[userService] updateUserProfileData: Called for UID: ${uid} with data:`, JSON.stringify(data));

  const userDocRef = doc(db, USERS_COLLECTION, uid);
  const updates: Partial<AppUser> & { updatedAt?: any, createdAt?: any } = {};
  let isCreatingNewDocument = false;

  // Tentukan field yang akan diupdate atau dibuat
  if (data.displayName !== undefined) {
    updates.displayName = data.displayName || null;
    updates.uprId = data.displayName || null; // Sinkronkan uprId dengan displayName
  }
  if (data.photoURL !== undefined) {
    updates.photoURL = data.photoURL || null;
  }
  if (data.activePeriod !== undefined) {
    updates.activePeriod = data.activePeriod || null;
  }
  if (data.availablePeriods !== undefined) {
    updates.availablePeriods = Array.isArray(data.availablePeriods) ? data.availablePeriods : [];
  }

  try {
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      // Dokumen sudah ada, lakukan update
      if (Object.keys(updates).length > 0) {
        updates.updatedAt = serverTimestamp();
        console.log('[userService] updateUserProfileData: Updating existing user document with:', JSON.stringify(updates));
        await updateDoc(userDocRef, updates);
        console.log('[userService] updateUserProfileData: User document updated successfully for UID:', uid);
      } else {
        console.log('[userService] updateUserProfileData: No changes to update for UID:', uid);
      }
    } else {
      // Dokumen belum ada, buat baru (ini terjadi saat pengguna melengkapi profil pertama kali)
      isCreatingNewDocument = true;
      const firebaseUser = { uid, email: data.email } as FirebaseUser; // Dapatkan email dari currentUser jika ada
      
      const authUser = (await import('firebase/auth')).getAuth().currentUser;
      const userEmail = authUser?.email || null;


      const createData: AppUser = {
        uid,
        email: userEmail, // Perlu cara untuk mendapatkan email pengguna saat ini
        role: 'userSatker', // Default role
        displayName: data.displayName || null,
        uprId: data.displayName || null,
        photoURL: data.photoURL || null,
        activePeriod: data.activePeriod || DEFAULT_INITIAL_PERIOD,
        availablePeriods: data.availablePeriods || [...DEFAULT_AVAILABLE_PERIODS],
        createdAt: new Date().toISOString(), // Placeholder, akan di-override serverTimestamp
        // updatedAt tidak di-set saat create
      };
      updates.createdAt = serverTimestamp(); // Untuk field createdAt saat buat baru
      
      console.log('[userService] updateUserProfileData: Creating new user document with:', JSON.stringify({ ...createData, ...updates }));
      await setDoc(userDocRef, { ...createData, ...updates });
      console.log('[userService] updateUserProfileData: New user document created successfully for UID:', uid);
    }
  } catch (error: any) {
    const errorMessage = error.message && typeof error.message === 'string' ? error.message : String(error);
    console.error("[userService] Error updating/creating user profile data in Firestore for UID:", uid, "Message:", errorMessage);
    throw new Error(`Gagal memperbarui/membuat data profil pengguna: ${errorMessage}`);
  }
}
