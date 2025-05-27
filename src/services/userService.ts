
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

async function _createUserProfileInFirestore(
  firebaseUser: FirebaseUser,
  defaultRole: UserRole,
  finalDisplayName: string
): Promise<void> {
  const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
  
  // DIAGNOSTIC: Extremely minimal data, and comment out the actual write
  const minimalUserData = {
    uid: firebaseUser.uid,
    email: firebaseUser.email || null,
    displayName: finalDisplayName, // This is now the UPR name/ID
    // photoURL: null, // Removed for diagnosis
    role: defaultRole,
    // uprId: finalDisplayName, // Removed for diagnosis, will be same as displayName
    // activePeriod: null, // Removed for diagnosis
    // availablePeriods: [], // Removed for diagnosis
    createdAt: serverTimestamp(), // This is a placeholder object, not a value
  };

  console.log('[DIAGNOSTIC userService] _createUserProfileInFirestore: MINIMAL user document data prepared:', JSON.stringify(minimalUserData));
  
  // Temporarily comment out the Firestore write operation for diagnosis
  // try {
  //   await setDoc(userDocRef, minimalUserData);
  //   console.log('[DIAGNOSTIC userService] _createUserProfileInFirestore: Simulated setDoc for UID:', firebaseUser.uid);
  // } catch (error: any) {
  //   console.error("[DIAGNOSTIC userService] _createUserProfileInFirestore: Error during (simulated) setDoc:", error.message || String(error));
  //   throw new Error(`Gagal membuat profil pengguna minimal di database: ${error.message || String(error)}`);
  // }
  console.log('[DIAGNOSTIC userService] _createUserProfileInFirestore: SKIPPING ACTUAL setDoc for UID:', firebaseUser.uid);
  await Promise.resolve(); // Simulate async operation
}

async function _updateUserProfileInFirestore(
  firebaseUser: FirebaseUser,
  existingData: AppUser,
  finalDisplayName: string
): Promise<boolean> {
  const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
  const updates: Partial<AppUser> = {};
  let needsUpdate = false;

  // Only attempting to update displayName for diagnosis
  if (finalDisplayName && existingData.displayName !== finalDisplayName) {
    updates.displayName = finalDisplayName;
    updates.uprId = finalDisplayName; // Keep UPR ID in sync with displayName
    needsUpdate = true;
  }
  
  // Temporarily remove photoURL update for diagnosis
  // if (firebaseUser.photoURL !== undefined) { // Check undefined explicitly
  //   if (existingData.photoURL !== (firebaseUser.photoURL || null)) {
  //     updates.photoURL = firebaseUser.photoURL || null;
  //     needsUpdate = true;
  //   }
  // }

  if (needsUpdate && Object.keys(updates).length > 0) {
    console.log('[DIAGNOSTIC userService] _updateUserProfileInFirestore: Updates prepared:', JSON.stringify(updates));
    // Temporarily comment out the Firestore write operation for diagnosis
    // try {
    //   await updateDoc(userDocRef, { ...updates, updatedAt: serverTimestamp() });
    //   console.log('[DIAGNOSTIC userService] _updateUserProfileInFirestore: Simulated updateDoc for UID:', firebaseUser.uid);
    //   return true;
    // } catch (error: any) {
    //   console.error("[DIAGNOSTIC userService] _updateUserProfileInFirestore: Error during (simulated) updateDoc:", error.message || String(error));
    //   throw new Error(`Gagal memperbarui profil pengguna (info tambahan) di database: ${error.message || String(error)}`);
    // }
    console.log('[DIAGNOSTIC userService] _updateUserProfileInFirestore: SKIPPING ACTUAL updateDoc for UID:', firebaseUser.uid);
    await Promise.resolve(); // Simulate async operation
    return true; // Simulate successful update
  }
  console.log('[DIAGNOSTIC userService] _updateUserProfileInFirestore: No updates deemed necessary for UID:', firebaseUser.uid);
  return false; // No update was performed
}

export async function getUserDocument(uid: string): Promise<AppUser | null> {
  if (!uid) {
    console.warn("[userService] getUserDocument: UID is null or undefined, returning null.");
    return null;
  }
  console.log("[DIAGNOSTIC userService] getUserDocument: Called for UID:", uid, ". Returning null for diagnostic purposes.");
  return null; // DIAGNOSTIC: Always return null to simulate new user / force create path.
}

export async function checkAndCreateUserDocument(
  firebaseUser: FirebaseUser,
  defaultRole: UserRole = 'userSatker',
  displayNameFromForm?: string | null
): Promise<AppUser | null> { // Modified to return AppUser | null
  console.log("[DIAGNOSTIC userService] checkAndCreateUserDocument called for UID:", firebaseUser.uid, "displayNameFromForm:", displayNameFromForm);

  try {
    const finalDisplayName = displayNameFromForm?.trim() || firebaseUser.displayName?.trim() || firebaseUser.email?.split('@')[0] || `Pengguna_${firebaseUser.uid.substring(0, 5)}`;
    console.log("[DIAGNOSTIC userService] finalDisplayName determined:", finalDisplayName);

    // DIAGNOSTIC: Forcing the "create" path by relying on getUserDocument returning null
    // const existingUserApp = await getUserDocument(firebaseUser.uid); 
    // console.log("[DIAGNOSTIC userService] Existing user app from (diagnostic) getUserDocument:", existingUserApp);


    // Always attempt "create" path for diagnosis because getUserDocument returns null
    console.log('[DIAGNOSTIC userService] No existing user document (simulated), creating new one.');
    await _createUserProfileInFirestore(firebaseUser, defaultRole, finalDisplayName);
    
    // After "creation" (which is now simulated), try to "fetch" it again
    // This will also return null because of the diagnostic getUserDocument
    const userAfterCreation = await getUserDocument(firebaseUser.uid); 
    if (userAfterCreation) {
      console.log("[DIAGNOSTIC userService] Successfully fetched user data after simulated creation:", JSON.stringify(userAfterCreation));
      return userAfterCreation;
    } else {
      // This branch will be hit in diagnostic mode.
      // We need to construct a "complete enough" AppUser object for AppLayout to proceed to /profile-setup
      // or, if profile-setup is the goal, an "incomplete" one.
      // For now, let's simulate an "incomplete" profile so AppLayout redirects to profile-setup
      console.log("[DIAGNOSTIC userService] User document still null after simulated creation (as expected in diagnostic mode). Returning 'incomplete' mock AppUser.");
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email || null,
        displayName: null, // Mark as incomplete
        photoURL: firebaseUser.photoURL || null,
        role: defaultRole,
        uprId: null, // Mark as incomplete
        activePeriod: null, // Mark as incomplete
        availablePeriods: [], // Mark as incomplete
        createdAt: new Date().toISOString(), // Placeholder
      } as AppUser;
    }

  } catch (error: any) {
    const errorMessage = error instanceof Error && error.message ? error.message : String(error);
    console.error("[DIAGNOSTIC userService] Critical error in checkAndCreateUserDocument for UID:", firebaseUser.uid, "Message:", errorMessage);
    // To prevent stack overflow from re-throwing complex error objects
    if (errorMessage.includes("Maximum call stack size exceeded")) {
      throw new Error("Maximum call stack size exceeded within userService.checkAndCreateUserDocument");
    }
    throw new Error(`Gagal memproses profil pengguna di database (diagnostic): ${errorMessage}`);
  }
}

export async function updateUserProfileData(
  uid: string,
  data: Partial<Pick<AppUser, "displayName" | "photoURL" | "activePeriod" | "availablePeriods">>
): Promise<void> {
  if (!uid) throw new Error("UID pengguna diperlukan untuk memperbarui profil.");
  console.log(`[userService] updateUserProfileData called for UID: ${uid} with data:`, JSON.stringify(data));

  const userDocRef = doc(db, USERS_COLLECTION, uid);
  const updates: Partial<AppUser> & { updatedAt?: any } = {};

  if (data.displayName !== undefined) {
    updates.displayName = data.displayName || null;
    updates.uprId = data.displayName || null; // Keep uprId in sync
  }
  if (data.photoURL !== undefined) {
    updates.photoURL = data.photoURL || null;
  }
  if (data.activePeriod !== undefined) {
    updates.activePeriod = data.activePeriod || null;
  }
  if (data.availablePeriods !== undefined) {
    updates.availablePeriods = (Array.isArray(data.availablePeriods) && data.availablePeriods.length > 0)
      ? data.availablePeriods
      : []; // Default to empty array if not valid
  }

  if (Object.keys(updates).length === 0) {
    console.log('[userService] No actual data changes to update for UID:', uid);
    return;
  }

  updates.updatedAt = serverTimestamp();

  try {
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      console.log('[DIAGNOSTIC userService] updateUserProfileData: Updates to be applied:', JSON.stringify(updates));
      // Temporarily comment out the Firestore write operation for diagnosis
      // await updateDoc(userDocRef, updates);
      console.log('[DIAGNOSTIC userService] updateUserProfileData: SKIPPING ACTUAL updateDoc for UID:', uid);
      await Promise.resolve(); // Simulate async
    } else {
      // If document doesn't exist, we might need to create it, similar to profile setup.
      // For this diagnostic, let's just log. In production, this path might need to call a create function.
      console.warn('[DIAGNOSTIC userService] Document not found for update during updateUserProfileData. UID:', uid, 'Data:', JSON.stringify(updates));
      // For now, to ensure flow continues, we'll simulate creating a basic doc so appUser isn't null
      // This is a hack for diagnosis and should not be production logic
      const minimalForUpdatePath = {
        uid,
        email: null, // We don't have email here
        displayName: updates.displayName || null,
        photoURL: updates.photoURL || null,
        role: 'userSatker' as UserRole, // Default role
        uprId: updates.uprId || null,
        activePeriod: updates.activePeriod || DEFAULT_INITIAL_PERIOD,
        availablePeriods: updates.availablePeriods || DEFAULT_AVAILABLE_PERIODS,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      console.log('[DIAGNOSTIC userService] updateUserProfileData: SKIPPING ACTUAL setDoc for non-existing UID (update path):', uid);
      // await setDoc(userDocRef, minimalForUpdatePath);
      await Promise.resolve();
    }
  } catch (error: any) {
    const errorMessage = error instanceof Error && error.message ? error.message : String(error);
    console.error("[userService] Error updating user profile data in Firestore. Message:", errorMessage);
    if (errorMessage.includes("Maximum call stack size exceeded")) {
        throw new Error("Maximum call stack size exceeded within userService.updateUserProfileData");
    }
    throw new Error(`Gagal memperbarui data profil pengguna (diagnostic): ${errorMessage}`);
  }
}

    