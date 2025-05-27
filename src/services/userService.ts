// src/services/userService.ts
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

// --- DIAGNOSTIC VERSION ---
// This version is extremely simplified to help diagnose "Maximum call stack size exceeded".
// All Firestore operations are commented out.

export async function getUserDocument(uid: string): Promise<AppUser | null> {
  console.log("[DIAGNOSTIC userService] getUserDocument: Called for UID:", uid, ". Returning null for diagnostic purposes.");
  return null; // Simulate user not found to force create path in checkAndCreateUserDocument
}

async function _createUserProfileInFirestore(
  firebaseUser: FirebaseUser,
  defaultRole: UserRole,
  finalDisplayName: string
): Promise<void> {
  const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
  const minimalUserData = {
    uid: firebaseUser.uid,
    email: firebaseUser.email || null,
    displayName: finalDisplayName,
    role: defaultRole,
    // photoURL, uprId, activePeriod, availablePeriods are intentionally omitted for this minimal create
    createdAt: serverTimestamp(), // This is a placeholder, actual write is commented
  };
  console.log('[DIAGNOSTIC userService] _createUserProfileInFirestore: MINIMAL user document data prepared (actual Firestore write is COMMENTED OUT):', JSON.stringify(minimalUserData));
  // await setDoc(userDocRef, minimalUserData); // DIAGNOSTIC: Keep Firestore write commented out
  console.log('[DIAGNOSTIC userService] _createUserProfileInFirestore: SKIPPING ACTUAL setDoc for UID:', firebaseUser.uid);
  await Promise.resolve(); // Simulate async operation
}

async function _updateUserProfileInFirestore(
  userDocRef: any, // Type as any for diagnostic simplicity
  existingData: AppUser,
  firebaseUser: FirebaseUser,
  finalDisplayName: string,
  defaultRole: UserRole
): Promise<boolean> {
  const updates: Partial<AppUser> = {};
  let needsUpdate = false;

  // Only attempt to "update" displayName for this diagnostic step
  if (finalDisplayName && existingData.displayName !== finalDisplayName) {
    updates.displayName = finalDisplayName;
    // updates.uprId = finalDisplayName; // uprId logic is part of what we are testing
    needsUpdate = true;
  }

  // Other fields (photoURL, activePeriod, etc.) are intentionally omitted for this minimal update diagnostic

  if (needsUpdate && Object.keys(updates).length > 0) {
    console.log('[DIAGNOSTIC userService] _updateUserProfileInFirestore: Updates prepared (actual Firestore write is COMMENTED OUT):', JSON.stringify(updates));
    // await updateDoc(userDocRef, { ...updates, updatedAt: serverTimestamp() }); // DIAGNOSTIC: Keep Firestore write commented out
    console.log('[DIAGNOSTIC userService] _updateUserProfileInFirestore: SKIPPING ACTUAL updateDoc for UID:', firebaseUser.uid);
    await Promise.resolve(); // Simulate async operation
    return true; // Simulate successful update
  }
  console.log('[DIAGNOSTIC userService] _updateUserProfileInFirestore: No updates deemed necessary for UID:', firebaseUser.uid);
  return false;
}

export async function checkAndCreateUserDocument(
  firebaseUser: FirebaseUser,
  defaultRole: UserRole = "userSatker",
  displayNameFromForm?: string | null
): Promise<AppUser | null> {
  console.log("[DIAGNOSTIC userService] checkAndCreateUserDocument (DIAGNOSTIC VERSION) called for UID:", firebaseUser.uid);

  try {
    // Simulate that user document doesn't exist to always go through "create" path for diagnostics
    // const existingUserApp = await getUserDocument(firebaseUser.uid); // This will return null due to diagnostic getUserDocument

    const finalDisplayName = displayNameFromForm?.trim() || firebaseUser.displayName?.trim() || firebaseUser.email?.split('@')[0] || `Pengguna_${firebaseUser.uid.substring(0, 5)}`;
    console.log("[DIAGNOSTIC userService] finalDisplayName determined:", finalDisplayName);

    // Simulate "create" path always for this diagnostic
    console.log('[DIAGNOSTIC userService] Simulating create path. Calling (diagnostic) _createUserProfileInFirestore...');
    // await _createUserProfileInFirestore(firebaseUser, defaultRole, finalDisplayName); // This is diagnostic and doesn't write

    // Forcing a "profile incomplete" return to test AppLayout redirection
    console.log("[DIAGNOSTIC userService] Returning MOCK INCOMPLETE AppUser for /profile-setup test.");
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email || null,
      displayName: null, // Mark as incomplete for /profile-setup
      photoURL: firebaseUser.photoURL || null,
      role: defaultRole,
      uprId: null, // Mark as incomplete
      activePeriod: null, // Mark as incomplete
      availablePeriods: [], // Mark as incomplete
      createdAt: new Date().toISOString(), // Placeholder for return
    } as AppUser;

  } catch (error: any) {
    const errorMessage = error instanceof Error && error.message ? error.message : String(error);
    console.error("[DIAGNOSTIC userService] Critical error in checkAndCreateUserDocument (DIAGNOSTIC VERSION) for UID:", firebaseUser.uid, "Message:", errorMessage);
    // To prevent stack overflow from re-throwing complex error objects
    if (errorMessage.includes("Maximum call stack size exceeded")) {
      throw new Error("Maximum call stack size exceeded within userService.checkAndCreateUserDocument (DIAGNOSTIC)");
    }
    throw new Error(`Gagal memproses profil pengguna di database (diagnostic): ${errorMessage}`);
  }
}

export async function updateUserProfileData(
  uid: string,
  data: Partial<Pick<AppUser, "displayName" | "photoURL" | "activePeriod" | "availablePeriods">>
): Promise<void> {
  if (!uid) throw new Error("UID pengguna diperlukan untuk memperbarui profil.");
  console.log(`[DIAGNOSTIC userService] updateUserProfileData (DIAGNOSTIC VERSION) called for UID: ${uid} with data:`, JSON.stringify(data));

  const userDocRef = doc(db, USERS_COLLECTION, uid);
  const updates: Partial<AppUser> & { updatedAt?: any } = {};

  if (data.displayName !== undefined) {
    updates.displayName = data.displayName || null;
    updates.uprId = data.displayName || null; // Keep uprId in sync with displayName
  }
  // photoURL update is removed for this diagnostic step
  if (data.activePeriod !== undefined) {
    updates.activePeriod = data.activePeriod || null;
  }
  if (data.availablePeriods !== undefined) {
    updates.availablePeriods = Array.isArray(data.availablePeriods) ? data.availablePeriods : [];
  }

  if (Object.keys(updates).length === 0) {
    console.log('[DIAGNOSTIC userService] No actual data changes to update for UID:', uid);
    return;
  }
  updates.updatedAt = serverTimestamp();

  try {
    // const docSnap = await getDoc(userDocRef); // DIAGNOSTIC: Comment out Firestore read
    // if (docSnap.exists()) {
    console.log('[DIAGNOSTIC userService] updateUserProfileData: Updates prepared (actual Firestore write is COMMENTED OUT):', JSON.stringify(updates));
    // await updateDoc(userDocRef, updates); // DIAGNOSTIC: Keep Firestore write commented out
    console.log('[DIAGNOSTIC userService] updateUserProfileData: SKIPPING ACTUAL updateDoc for UID:', uid);
    await Promise.resolve();
    // } else {
    //   console.warn('[DIAGNOSTIC userService] Document not found for update during updateUserProfileData. UID:', uid, 'Data:', JSON.stringify(updates));
    //   // Simulate creating a very basic doc if it doesn't exist, to allow profile-setup to proceed
    //   const minimalForUpdatePath = {
    //     uid,
    //     email: null,
    //     displayName: updates.displayName || null,
    //     photoURL: null,
    //     role: 'userSatker' as UserRole,
    //     uprId: updates.uprId || null,
    //     activePeriod: updates.activePeriod || DEFAULT_INITIAL_PERIOD,
    //     availablePeriods: updates.availablePeriods || DEFAULT_AVAILABLE_PERIODS,
    //     createdAt: serverTimestamp(),
    //     updatedAt: serverTimestamp()
    //   };
    //   console.log('[DIAGNOSTIC userService] updateUserProfileData: SKIPPING ACTUAL setDoc for non-existing UID (update path) - DIAGNOSTIC:', uid);
    //   // await setDoc(userDocRef, minimalForUpdatePath); // DIAGNOSTIC: Keep Firestore write commented out
    //   await Promise.resolve();
    // }
  } catch (error: any) {
    const errorMessage = error instanceof Error && error.message ? error.message : String(error);
    console.error("[DIAGNOSTIC userService] Error updating user profile data in Firestore (DIAGNOSTIC). Message:", errorMessage);
    if (errorMessage.includes("Maximum call stack size exceeded")) {
        throw new Error("Maximum call stack size exceeded within userService.updateUserProfileData (DIAGNOSTIC)");
    }
    throw new Error(`Gagal memperbarui data profil pengguna (diagnostic): ${errorMessage}`);
  }
}
