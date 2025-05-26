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
      console.log(`[userService] getUserDocument: User document found for UID ${uid}. Data:`, data);
      
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
    throw new Error(`Gagal mengambil data profil pengguna: ${error.message || String(error)}`);
  }
}

async function _createUserProfileInFirestore(
  userDocRef: ReturnType<typeof doc>,
  firebaseUser: FirebaseUser,
  finalDisplayName: string,
  defaultRole: UserRole
): Promise<void> {
  const newUserDocData = {
    uid: firebaseUser.uid,
    email: firebaseUser.email || null,
    displayName: finalDisplayName,
    photoURL: firebaseUser.photoURL || null,
    role: defaultRole,
    uprId: finalDisplayName, // uprId IS the displayName
    createdAt: serverTimestamp(),
    activePeriod: DEFAULT_PERIOD,
    availablePeriods: [...DEFAULT_AVAILABLE_PERIODS],
  };
  console.log('[userService] Creating new user document with:', JSON.stringify(newUserDocData));
  await setDoc(userDocRef, newUserDocData);
  console.log('[userService] New user document created successfully for UID:', firebaseUser.uid);
}

async function _updateUserProfileInFirestore(
  userDocRef: ReturnType<typeof doc>,
  existingData: AppUser,
  firebaseUser: FirebaseUser,
  finalDisplayName: string
): Promise<boolean> {
  const updates: Partial<AppUser> = {};
  let needsUpdate = false;

  if (finalDisplayName && (existingData.displayName !== finalDisplayName || existingData.uprId !== finalDisplayName)) {
    updates.displayName = finalDisplayName;
    updates.uprId = finalDisplayName; // Ensure uprId is also updated to match displayName
    needsUpdate = true;
    console.log("[userService] displayName or uprId change detected. New displayName/uprId:", finalDisplayName);
  }

  const currentPhotoURL = firebaseUser.photoURL || null;
  if (existingData.photoURL !== currentPhotoURL) {
    updates.photoURL = currentPhotoURL;
    needsUpdate = true;
    console.log("[userService] photoURL change detected.");
  }

  if (needsUpdate && Object.keys(updates).length > 0) {
    console.log('[userService] Updating existing user document for UID:', firebaseUser.uid, 'with:', JSON.stringify(updates));
    updates.updatedAt = serverTimestamp() as any;
    await updateDoc(userDocRef, updates);
    console.log('[userService] Existing user document updated successfully for UID:', firebaseUser.uid);
    return true;
  } else {
    console.log('[userService] No updates needed for existing user document for UID:', firebaseUser.uid);
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
    // Determine the final display name
    const finalDisplayName = displayNameFromForm?.trim() || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || `Pengguna_${firebaseUser.uid.substring(0, 5)}`;
    console.log(`[userService] Determined finalDisplayName (and uprId): "${finalDisplayName}" for UID: ${firebaseUser.uid}`);

    const existingUserDoc = await getUserDocument(firebaseUser.uid);

    if (existingUserDoc) {
      console.log("[userService] User document exists for UID:", firebaseUser.uid);
      await _updateUserProfileInFirestore(userDocRef, existingUserDoc, firebaseUser, finalDisplayName);
    } else {
      console.log("[userService] User document does not exist for UID:", firebaseUser.uid, "Creating new one.");
      await _createUserProfileInFirestore(userDocRef, firebaseUser, finalDisplayName, defaultRole);
    }
    
    // Re-fetch the document to get the latest data including server-generated timestamps and any updates
    const updatedUserDoc = await getUserDocument(firebaseUser.uid);
    if (!updatedUserDoc) {
      // This should ideally not happen if create/update was successful
      console.error("[userService] CRITICAL: Failed to re-fetch user document after create/update for UID:", firebaseUser.uid);
      throw new Error("Gagal memuat profil pengguna setelah operasi penyimpanan.");
    }
    return updatedUserDoc;

  } catch (error: any) {
    console.error("[userService] Error in checkAndCreateUserDocument for UID:", firebaseUser.uid, "Message:", error.message);
    if (error.name === 'FirebaseError') {
        console.error("[userService] FirebaseError Details:", JSON.stringify(error));
    }
    throw new Error(`Gagal menyimpan atau memperbarui profil pengguna di database: ${error.message || String(error)}`);
  }
}


export async function updateUserProfileData(
  uid: string,
  data: Partial<Pick<AppUser, 'displayName' | 'photoURL' | 'activePeriod' | 'availablePeriods'>>
): Promise<void> {
  console.log(`[userService] updateUserProfileData called for UID: ${uid} with data:`, JSON.stringify(data));
  const userDocRef = doc(db, USERS_COLLECTION, uid);
  
  try {
    const userDocSnap = await getDoc(userDocRef);
    const updates: { [key: string]: any } = {};

    if (data.displayName !== undefined) {
      updates.displayName = data.displayName || null;
      updates.uprId = data.displayName || null; // uprId is always the displayName
    }
    if (data.photoURL !== undefined) {
      updates.photoURL = data.photoURL || null;
    }
    if (data.activePeriod !== undefined) {
      updates.activePeriod = data.activePeriod || DEFAULT_PERIOD;
    }
    if (data.availablePeriods !== undefined) {
      updates.availablePeriods = Array.isArray(data.availablePeriods) && data.availablePeriods.length > 0 
                                  ? data.availablePeriods 
                                  : [...DEFAULT_AVAILABLE_PERIODS];
    }
    
    if (Object.keys(updates).length === 0) {
      console.log("[userService] No changes to update for user profile for UID:", uid);
      return;
    }
    
    updates.updatedAt = serverTimestamp();
    if (userDocSnap.exists()) {
      console.log(`[userService] Updating user document for UID ${uid} with:`, JSON.stringify(updates));
      await updateDoc(userDocRef, updates);
    } else {
      console.warn(`[userService] User document for UID ${uid} not found during update. Creating new document instead.`);
      const newDocData = {
        uid: uid,
        email: null, // Cannot determine email if user doesn't exist
        displayName: data.displayName || `Pengguna_${uid.substring(0,5)}`,
        photoURL: data.photoURL || null,
        role: 'userSatker', 
        uprId: data.displayName || `Pengguna_${uid.substring(0,5)}`, // uprId is displayName
        activePeriod: data.activePeriod || DEFAULT_PERIOD,
        availablePeriods: data.availablePeriods || [...DEFAULT_AVAILABLE_PERIODS],
        createdAt: serverTimestamp(), 
        updatedAt: serverTimestamp(),
      };
      console.log('[userService] Creating new user document (from update path) for UID:', uid, 'with:', JSON.stringify(newDocData));
      await setDoc(userDocRef, newDocData);
    }
    console.log(`[userService] User document updated/created successfully for UID ${uid}.`);
  } catch (error: any) {
    console.error("[userService] Error updating/creating user profile data in Firestore for UID:", uid, "Message:", error.message);
    if (error.name === 'FirebaseError') {
        console.error("[userService] FirebaseError Details:", JSON.stringify(error));
    }
    throw new Error(`Gagal memperbarui data profil pengguna: ${error.message || String(error)}`);
  }
}

    