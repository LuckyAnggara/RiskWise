
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
} from "firebase/firestore";
import type { User as FirebaseUser } from "firebase/auth";
import type { AppUser, UserRole } from "@/lib/types";

const DEFAULT_INITIAL_PERIOD = new Date().getFullYear().toString();
const DEFAULT_AVAILABLE_PERIODS = [
  (new Date().getFullYear() - 1).toString(),
  DEFAULT_INITIAL_PERIOD,
  (new Date().getFullYear() + 1).toString(),
];

// Fungsi internal untuk membuat profil pengguna di Firestore
async function _createUserProfileInFirestore(
  firebaseUser: FirebaseUser,
  defaultRole: UserRole,
  displayNameFromForm?: string | null
): Promise<void> {
  const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
  const finalDisplayName = displayNameFromForm?.trim() || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || `Pengguna_${firebaseUser.uid.substring(0, 5)}`;

  const newUserDocData = {
    uid: firebaseUser.uid,
    email: firebaseUser.email || null,
    displayName: finalDisplayName, // This is also the UPR Name
    photoURL: firebaseUser.photoURL || null,
    role: defaultRole,
    // uprId: finalDisplayName, // uprId is now conceptually the displayName, no separate field needed for this model on AppUser
    activePeriod: DEFAULT_INITIAL_PERIOD, // Default active period
    availablePeriods: [...DEFAULT_AVAILABLE_PERIODS], // Default available periods
    createdAt: serverTimestamp(),
  };
  
  console.log('[userService] _createUserProfileInFirestore: MINIMAL user document data to save:', JSON.stringify(newUserDocData));
  await setDoc(userDocRef, newUserDocData);
  console.log('[userService] _createUserProfileInFirestore: MINIMAL user document created successfully for UID:', firebaseUser.uid);
}

// Fungsi internal untuk memperbarui profil pengguna di Firestore jika diperlukan
async function _updateUserProfileInFirestore(
  firebaseUser: FirebaseUser,
  existingData: AppUser, // Data Firestore yang sudah ada
  displayNameFromForm?: string | null
): Promise<void> {
  const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
  const updates: Partial<AppUser> = {};
  let needsUpdate = false;

  const finalDisplayName = displayNameFromForm?.trim() || firebaseUser.displayName || existingData.displayName || firebaseUser.email?.split('@')[0] || `Pengguna_${firebaseUser.uid.substring(0, 5)}`;

  if (finalDisplayName && existingData.displayName !== finalDisplayName) {
    updates.displayName = finalDisplayName;
    // updates.uprId = finalDisplayName; // No longer needed as separate field
    needsUpdate = true;
  }
  if (firebaseUser.photoURL && existingData.photoURL !== firebaseUser.photoURL) {
    updates.photoURL = firebaseUser.photoURL;
    needsUpdate = true;
  } else if (firebaseUser.photoURL === null && existingData.photoURL !== null) {
    updates.photoURL = null;
    needsUpdate = true;
  }

  // Inisialisasi periode jika belum ada di data lama
  if (!existingData.activePeriod) {
    updates.activePeriod = DEFAULT_INITIAL_PERIOD;
    needsUpdate = true;
  }
  if (!existingData.availablePeriods || existingData.availablePeriods.length === 0) {
    updates.availablePeriods = [...DEFAULT_AVAILABLE_PERIODS];
    needsUpdate = true;
  }

  if (needsUpdate && Object.keys(updates).length > 0) {
    console.log('[userService] _updateUserProfileInFirestore: Updating existing user document with:', JSON.stringify(updates));
    await updateDoc(userDocRef, { ...updates, updatedAt: serverTimestamp() });
    console.log('[userService] _updateUserProfileInFirestore: User document updated successfully for UID:', firebaseUser.uid);
  } else {
    console.log('[userService] _updateUserProfileInFirestore: No updates needed for user document UID:', firebaseUser.uid);
  }
}

export async function getUserDocument(uid: string): Promise<AppUser | null> {
  if (!uid) {
    console.warn("[userService] getUserDocument: UID is null or undefined.");
    return null;
  }
  console.log("[userService] getUserDocument called for UID:", uid);
  const userDocRef = doc(db, USERS_COLLECTION, uid);
  try {
    const userDocSnap = await getDoc(userDocRef);
    if (!userDocSnap.exists()) {
      console.log("[userService] getUserDocument: No document found for UID:", uid);
      return null;
    }
    const data = userDocSnap.data();
    console.log("[userService] getUserDocument: Raw data from Firestore for UID:", uid, JSON.stringify(data));

    const createdAt = data.createdAt instanceof Timestamp
      ? data.createdAt.toDate().toISOString()
      : (data.createdAt && typeof data.createdAt === 'string' ? new Date(data.createdAt).toISOString() : new Date().toISOString());

    const updatedAt = data.updatedAt instanceof Timestamp
      ? data.updatedAt.toDate().toISOString()
      : (data.updatedAt && typeof data.updatedAt === 'string' ? new Date(data.updatedAt).toISOString() : undefined);

    const appUser: AppUser = {
      uid: data.uid,
      email: data.email || null,
      displayName: data.displayName || null,
      photoURL: data.photoURL === undefined ? null : data.photoURL,
      role: data.role || "userSatker",
      activePeriod: data.activePeriod || DEFAULT_INITIAL_PERIOD,
      availablePeriods: (Array.isArray(data.availablePeriods) && data.availablePeriods.length > 0)
        ? data.availablePeriods
        : [...DEFAULT_AVAILABLE_PERIODS],
      createdAt,
      updatedAt,
    };
    console.log("[userService] getUserDocument: Parsed AppUser for UID:", uid, JSON.stringify(appUser));
    return appUser;
  } catch (error: any) {
    console.error("[userService] Error in getUserDocument for UID:", uid, "Message:", error.message);
    throw new Error(`Gagal mengambil data profil pengguna: ${error.message || String(error)}`);
  }
}

export async function checkAndCreateUserDocument(
  firebaseUser: FirebaseUser,
  defaultRole: UserRole = 'userSatker',
  displayNameFromForm?: string | null
): Promise<AppUser> {
  console.log("[userService] checkAndCreateUserDocument called for UID:", firebaseUser.uid, "with displayNameFromForm:", displayNameFromForm);

  try {
    const existingUserApp = await getUserDocument(firebaseUser.uid);

    if (existingUserApp) {
      console.log('[userService] User document exists for UID:', firebaseUser.uid, '. Attempting update if necessary.');
      await _updateUserProfileInFirestore(firebaseUser, existingUserApp, displayNameFromForm);
    } else {
      console.log('[userService] No user document found for UID:', firebaseUser.uid, '. Creating new one.');
      await _createUserProfileInFirestore(firebaseUser, defaultRole, displayNameFromForm);
    }
    
    // Always re-fetch to get the latest data, including server-generated timestamps
    const finalAppUser = await getUserDocument(firebaseUser.uid);
    if (!finalAppUser) {
      console.error("[userService] CRITICAL: Failed to retrieve user document after create/update for UID:", firebaseUser.uid);
      throw new Error("Gagal mengambil data profil pengguna setelah pembuatan/pembaruan.");
    }
    console.log("[userService] Successfully fetched/created AppUser for UID:", firebaseUser.uid, JSON.stringify(finalAppUser));
    return finalAppUser;

  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[userService] Critical error in checkAndCreateUserDocument for UID:", firebaseUser.uid, "Message:", errorMessage);
    throw new Error(`Gagal memproses profil pengguna di database: ${errorMessage}`);
  }
}

export async function updateUserProfileData(
  uid: string,
  data: Partial<Pick<AppUser, "displayName" | "photoURL" | "activePeriod" | "availablePeriods">>
): Promise<void> {
  if (!uid) throw new Error("UID pengguna diperlukan untuk memperbarui profil.");
  console.log(`[userService] updateUserProfileData called for UID: ${uid} with data:`, JSON.stringify(data));

  const userDocRef = doc(db, USERS_COLLECTION, uid);
  const updates: any = {}; // Use 'any' for flexibility with serverTimestamp

  if (data.displayName !== undefined) {
    updates.displayName = data.displayName || null;
    // updates.uprId = data.displayName || null; // No longer needed, uprId is conceptual from displayName
  }
  if (data.photoURL !== undefined) {
    updates.photoURL = data.photoURL || null;
  }
  if (data.activePeriod !== undefined) {
    updates.activePeriod = data.activePeriod;
  }
  if (data.availablePeriods !== undefined) {
    updates.availablePeriods = (Array.isArray(data.availablePeriods) && data.availablePeriods.length > 0)
      ? data.availablePeriods
      : [...DEFAULT_AVAILABLE_PERIODS];
  }

  if (Object.keys(updates).length === 0) {
    console.log('[userService] No actual data changes to update for UID:', uid);
    return;
  }

  updates.updatedAt = serverTimestamp();

  try {
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      console.log('[userService] Document found for update. Applying updates for UID:', uid, JSON.stringify(updates));
      await updateDoc(userDocRef, updates);
      console.log('[userService] User profile updated successfully for UID:', uid);
    } else {
      console.warn('[userService] Document not found for update during updateUserProfileData. Creating new document for UID:', uid);
      const baseDisplayName = data.displayName || `Pengguna_${uid.substring(0,5)}`;
      const newUserData = {
        uid,
        email: null, // Cannot get email here
        displayName: baseDisplayName,
        photoURL: data.photoURL || null,
        role: 'userSatker' as UserRole,
        //uprId: baseDisplayName, // No longer needed
        activePeriod: data.activePeriod || DEFAULT_INITIAL_PERIOD,
        availablePeriods: data.availablePeriods || [...DEFAULT_AVAILABLE_PERIODS],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      console.log('[userService] Data for new document during updateUserProfileData attempt:', JSON.stringify(newUserData));
      await setDoc(userDocRef, newUserData);
      console.log('[userService] New user document created during updateUserProfileData attempt for UID:', uid);
    }
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[userService] Error updating user profile data in Firestore. Message:", errorMessage);
    throw new Error(`Gagal memperbarui data profil pengguna: ${errorMessage}`);
  }
}
