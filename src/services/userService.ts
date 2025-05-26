
// src/services/userService.ts
"use server";

import { db } from '@/lib/firebase/config';
import type { AppUser, UserRole } from '@/lib/types';
import { USERS_COLLECTION } from './collectionNames';
import { Timestamp, serverTimestamp, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';

const DEFAULT_PERIOD = new Date().getFullYear().toString();
const DEFAULT_AVAILABLE_PERIODS = [
  (new Date().getFullYear() - 1).toString(),
  DEFAULT_PERIOD,
  (new Date().getFullYear() + 1).toString()
];

export async function getUserDocument(uid: string): Promise<AppUser | null> {
  console.log(`[userService] getUserDocument: Attempting to get user document for UID: ${uid}`);
  try {
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      console.log(`[userService] getUserDocument: User document found for UID ${uid}. Raw data:`, data);
      
      const createdAt = data.createdAt instanceof Timestamp
                        ? data.createdAt.toDate().toISOString()
                        : (typeof data.createdAt === 'string' ? new Date(data.createdAt).toISOString() : new Date().toISOString());
      
      const updatedAt = data.updatedAt instanceof Timestamp
                        ? data.updatedAt.toDate().toISOString()
                        : (typeof data.updatedAt === 'string' ? new Date(data.updatedAt).toISOString() : undefined);

      return {
        uid: userDocSnap.id,
        email: data.email || null,
        displayName: data.displayName || null,
        photoURL: data.photoURL === undefined ? null : (data.photoURL || null),
        role: data.role || 'userSatker',
        uprId: data.uprId || data.displayName || null,
        createdAt,
        updatedAt,
        activePeriod: data.activePeriod || DEFAULT_PERIOD,
        availablePeriods: data.availablePeriods || [...DEFAULT_AVAILABLE_PERIODS],
      } as AppUser;
    }
    console.log(`[userService] getUserDocument: User document with UID ${uid} not found.`);
    return null;
  } catch (error: any) {
    console.error("[userService] Error getting user document from Firestore. Message:", error.message);
    if (error.name === 'FirebaseError') {
        console.error("[userService] FirebaseError Details:", JSON.stringify(error));
    }
    // Re-throw a simpler error to avoid potential stack overflow from complex Firebase error objects
    throw new Error(`Gagal mengambil data profil pengguna: ${error.message || String(error)}`);
  }
}

async function _createUserProfileInFirestore(
  userDocRef: ReturnType<typeof doc>,
  firebaseUser: FirebaseUser,
  finalDisplayName: string,
  defaultRole: UserRole
): Promise<void> {
  // Minimal data for diagnosing stack overflow
  const newUserDocData = {
    uid: firebaseUser.uid,
    email: firebaseUser.email || null,
    displayName: finalDisplayName, // Assumed to be a valid string
    role: defaultRole,
    // uprId: finalDisplayName, // Temporarily removed for diagnosis
    // photoURL: firebaseUser.photoURL || null, // Temporarily removed for diagnosis
    createdAt: serverTimestamp(),
    activePeriod: DEFAULT_PERIOD,
    availablePeriods: [...DEFAULT_AVAILABLE_PERIODS],
  };
  console.log('[userService] Attempting to create new user document with (minimal data for diagnosis):', JSON.stringify(newUserDocData));
  await setDoc(userDocRef, newUserDocData);
  console.log('[userService] Minimal new user document created successfully for UID:', firebaseUser.uid);
}

async function _updateUserProfileInFirestore(
  userDocRef: ReturnType<typeof doc>,
  existingData: AppUser,
  firebaseUser: FirebaseUser,
  finalDisplayName: string
): Promise<boolean> {
  const updates: Partial<Omit<AppUser, 'uid' | 'email' | 'role' | 'createdAt' | 'activePeriod' | 'availablePeriods'>> = {};
  let needsUpdate = false;

  // Only update displayName for diagnosis
  if (finalDisplayName && existingData.displayName !== finalDisplayName) {
    updates.displayName = finalDisplayName;
    // updates.uprId = finalDisplayName; // Temporarily removed, as uprId logic is tied to displayName
    needsUpdate = true;
    console.log("[userService] displayName change detected. New displayName:", finalDisplayName);
  }

  // Temporarily remove photoURL update for diagnosis
  // const currentPhotoURL = firebaseUser.photoURL || null;
  // if (existingData.photoURL !== currentPhotoURL) {
  //   updates.photoURL = currentPhotoURL;
  //   needsUpdate = true;
  //   console.log("[userService] photoURL change detected.");
  // }

  if (needsUpdate && Object.keys(updates).length > 0) {
    console.log('[userService] Attempting to update existing user document for UID:', firebaseUser.uid, 'with (minimal data for diagnosis):', JSON.stringify(updates));
    await updateDoc(userDocRef, {...updates, updatedAt: serverTimestamp()});
    console.log('[userService] Minimal existing user document updated successfully for UID:', firebaseUser.uid);
    return true;
  } else {
    console.log('[userService] No (minimal) updates needed for existing user document for UID:', firebaseUser.uid);
    return false;
  }
}

export async function checkAndCreateUserDocument(
  firebaseUser: FirebaseUser,
  defaultRole: UserRole = 'userSatker',
  displayNameFromForm?: string
): Promise<AppUser> {
  console.log("[userService] checkAndCreateUserDocument called for UID:", firebaseUser.uid, "with displayNameFromForm:", displayNameFromForm);
  const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);

  try {
    const finalDisplayName = displayNameFromForm?.trim() || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || `Pengguna_${firebaseUser.uid.substring(0, 5)}`;
    console.log(`[userService] Determined finalDisplayName for UID ${firebaseUser.uid}: "${finalDisplayName}"`);

    const existingUserDoc = await getUserDocument(firebaseUser.uid);

    if (existingUserDoc) {
      console.log("[userService] User document exists for UID:", firebaseUser.uid);
      await _updateUserProfileInFirestore(userDocRef, existingUserDoc, firebaseUser, finalDisplayName);
    } else {
      console.log("[userService] User document does not exist for UID:", firebaseUser.uid, "Creating new one (minimal).");
      await _createUserProfileInFirestore(userDocRef, firebaseUser, finalDisplayName, defaultRole);
    }
    
    const updatedUserDoc = await getUserDocument(firebaseUser.uid);
    if (!updatedUserDoc) {
      console.error("[userService] CRITICAL: Failed to re-fetch user document after create/update for UID:", firebaseUser.uid);
      throw new Error("Gagal memuat profil pengguna setelah operasi penyimpanan.");
    }
    console.log("[userService] checkAndCreateUserDocument successfully returning AppUser for UID:", firebaseUser.uid);
    return updatedUserDoc;

  } catch (error: any) {
    console.error("[userService] Error in checkAndCreateUserDocument for UID:", firebaseUser.uid, "Message:", error.message);
    if (error.name === 'FirebaseError') {
        console.error("[userService] FirebaseError Details:", JSON.stringify(error));
    }
    // Re-throw a simpler error
    throw new Error(`Gagal menyimpan atau memperbarui profil pengguna di database. Detail: ${error.message || String(error)}`);
  }
}

export async function updateUserProfileData(
  uid: string,
  data: Partial<Pick<AppUser, 'displayName' | 'activePeriod' | 'availablePeriods'>> // photoURL temporarily removed
): Promise<void> {
  console.log(`[userService] updateUserProfileData called for UID: ${uid} with data:`, JSON.stringify(data));
  const userDocRef = doc(db, USERS_COLLECTION, uid);
  
  try {
    const userDocSnap = await getDoc(userDocRef);
    const updates: { [key: string]: any } = {};
    let dataExists = userDocSnap.exists();

    if (data.displayName !== undefined) {
      updates.displayName = data.displayName || null;
      updates.uprId = data.displayName || null; // uprId follows displayName
    }
    // photoURL update temporarily removed
    // if (data.photoURL !== undefined) {
    //   updates.photoURL = data.photoURL || null;
    // }
    if (data.activePeriod !== undefined) {
      updates.activePeriod = data.activePeriod || DEFAULT_PERIOD;
    }
    if (data.availablePeriods !== undefined) {
      updates.availablePeriods = Array.isArray(data.availablePeriods) && data.availablePeriods.length > 0 
                                  ? data.availablePeriods 
                                  : [...DEFAULT_AVAILABLE_PERIODS];
    }
    
    if (Object.keys(updates).length === 0 && dataExists) {
      console.log("[userService] No changes to update for user profile for UID:", uid);
      return;
    }
    
    updates.updatedAt = serverTimestamp();

    if (dataExists) {
      console.log(`[userService] Attempting to update user document for UID ${uid} with (minimal):`, JSON.stringify(updates));
      await updateDoc(userDocRef, updates);
    } else {
      // If document doesn't exist, create it with the provided updates + defaults
      console.warn(`[userService] User document for UID ${uid} not found during update. Creating new document instead (minimal).`);
      const newDocData = {
        uid: uid,
        email: null, // Cannot reliably get email here, should be set on initial creation
        displayName: data.displayName || `Pengguna_${uid.substring(0,5)}`,
        // photoURL: data.photoURL || null, // Temporarily removed
        role: 'userSatker', 
        uprId: data.displayName || `Pengguna_${uid.substring(0,5)}`,
        activePeriod: data.activePeriod || DEFAULT_PERIOD,
        availablePeriods: data.availablePeriods || [...DEFAULT_AVAILABLE_PERIODS],
        createdAt: serverTimestamp(), 
        updatedAt: serverTimestamp(),
      };
      console.log('[userService] Attempting to create new user document (from update path, minimal) for UID:', uid, 'with:', JSON.stringify(newDocData));
      await setDoc(userDocRef, newDocData);
    }
    console.log(`[userService] User document updated/created successfully for UID ${uid}.`);
  } catch (error: any) {
    console.error("[userService] Error updating/creating user profile data in Firestore for UID:", uid, "Message:", error.message);
    if (error.name === 'FirebaseError') {
        console.error("[userService] FirebaseError Details:", JSON.stringify(error));
    }
    throw new Error(`Gagal memperbarui data profil pengguna. Detail: ${error.message || String(error)}`);
  }
}

    