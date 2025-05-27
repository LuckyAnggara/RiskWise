
// src/services/userService.ts
"use server";

import { db } from '@/lib/firebase/config';
import type { AppUser, UserRole } from '@/lib/types';
import { USERS_COLLECTION } from './collectionNames';
import { Timestamp, serverTimestamp, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';

const DEFAULT_INITIAL_PERIOD = new Date().getFullYear().toString();
const DEFAULT_AVAILABLE_PERIODS = [
  (new Date().getFullYear() - 1).toString(),
  DEFAULT_INITIAL_PERIOD,
  (new Date().getFullYear() + 1).toString()
];

async function _createUserProfileInFirestore(
  uid: string,
  email: string | null,
  role: UserRole,
  initialDisplayName: string // This is the determined displayName, also used for uprId
): Promise<void> {
  const userDocRef = doc(db, USERS_COLLECTION, uid);
  const minimalUserDocData = {
    uid: uid,
    email: email, // Already handled for null if firebaseUser.email is null
    displayName: initialDisplayName, // Save determined displayName
    uprId: initialDisplayName,       // Save determined uprId (same as displayName)
    role: role,
    activePeriod: DEFAULT_INITIAL_PERIOD,
    availablePeriods: [...DEFAULT_AVAILABLE_PERIODS],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(), // Set updatedAt at creation as well
    photoURL: null, // Initialize photoURL as null
  };
  console.log('[userService] _createUserProfileInFirestore: MINIMAL user document data to save:', JSON.stringify(minimalUserDocData));
  try {
    await setDoc(userDocRef, minimalUserDocData);
    console.log('[userService] _createUserProfileInFirestore: MINIMAL user document created successfully for UID:', uid);
  } catch (error: any) {
    console.error("[userService] _createUserProfileInFirestore: Firestore setDoc error:", error.message, error.code, error.details);
    throw new Error(`Gagal membuat profil pengguna minimal di database: ${error.message || String(error)}`);
  }
}

async function _updateUserProfileInFirestore(
  uid: string,
  updates: Partial<Omit<AppUser, 'uid' | 'createdAt' | 'role'>> // Role and createdAt are generally not updated this way
): Promise<void> {
  if (Object.keys(updates).length === 0) {
    console.log('[userService] _updateUserProfileInFirestore: No updates to apply for UID:', uid);
    return;
  }
  const userDocRef = doc(db, USERS_COLLECTION, uid);
  const dataToUpdate = {
    ...updates,
    updatedAt: serverTimestamp(),
  };
  console.log('[userService] _updateUserProfileInFirestore: Data to update for UID:', uid, JSON.stringify(dataToUpdate));
  try {
    await updateDoc(userDocRef, dataToUpdate);
    console.log('[userService] _updateUserProfileInFirestore: User document updated successfully for UID:', uid);
  } catch (error: any) {
    console.error("[userService] _updateUserProfileInFirestore: Firestore updateDoc error:", error.message, error.code, error.details);
    throw new Error(`Gagal memperbarui profil pengguna di database: ${error.message || String(error)}`);
  }
}

export async function checkAndCreateUserDocument(
  firebaseUser: FirebaseUser,
  defaultRole: UserRole = 'userSatker',
  displayNameFromForm?: string | null
): Promise<AppUser> {
  console.log("[userService] checkAndCreateUserDocument called for UID:", firebaseUser.uid, "with displayNameFromForm:", displayNameFromForm);
  console.log("[userService] Raw firebaseUser object:", JSON.stringify(firebaseUser));

  const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);

  try {
    const finalDisplayName = displayNameFromForm || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || `Pengguna_${firebaseUser.uid.substring(0, 5)}`;
    if (!finalDisplayName) {
        // This case should be extremely rare, but as a fallback.
        throw new Error("Tidak dapat menentukan nama tampilan untuk pengguna.");
    }

    const existingUserDocSnap = await getDoc(userDocRef);

    if (!existingUserDocSnap.exists()) {
      console.log('[userService] Document does not exist for UID:', firebaseUser.uid, 'Creating new one.');
      await _createUserProfileInFirestore(
        firebaseUser.uid,
        firebaseUser.email || null,
        defaultRole,
        finalDisplayName // Pass the determined displayName
      );
      // After creating, immediately update with photoURL if available from Google Sign-In
      // (or other providers that might give it on first auth)
      if (firebaseUser.photoURL) {
        console.log('[userService] New user, attempting to update photoURL:', firebaseUser.photoURL);
        await _updateUserProfileInFirestore(firebaseUser.uid, { photoURL: firebaseUser.photoURL });
      }
    } else {
      console.log('[userService] Document exists for UID:', firebaseUser.uid, 'Checking for updates.');
      const existingData = existingUserDocSnap.data() as AppUser;
      const updates: Partial<Omit<AppUser, 'uid' | 'createdAt' | 'role'>> = {};
      let needsUpdate = false;

      // Check displayName and uprId (which should be synced to displayName)
      if (existingData.displayName !== finalDisplayName || existingData.uprId !== finalDisplayName) {
        updates.displayName = finalDisplayName;
        updates.uprId = finalDisplayName; // Sync uprId
        needsUpdate = true;
      }
      // Check photoURL
      if (firebaseUser.photoURL && existingData.photoURL !== firebaseUser.photoURL) {
        updates.photoURL = firebaseUser.photoURL;
        needsUpdate = true;
      } else if (!firebaseUser.photoURL && existingData.photoURL != null) { // Handle case where photoURL was removed
        updates.photoURL = null;
        needsUpdate = true;
      }
      // Check and initialize periods if they are missing (can happen for older users)
      if (!existingData.activePeriod) {
        updates.activePeriod = DEFAULT_INITIAL_PERIOD;
        needsUpdate = true;
      }
      if (!existingData.availablePeriods || existingData.availablePeriods.length === 0) {
        updates.availablePeriods = [...DEFAULT_AVAILABLE_PERIODS];
        needsUpdate = true;
      }

      if (needsUpdate) {
        await _updateUserProfileInFirestore(firebaseUser.uid, updates);
      }
    }

    // Always re-fetch the document to return the latest state, including server-generated timestamps
    const finalUserDoc = await getUserDocument(firebaseUser.uid);
    if (!finalUserDoc) {
      console.error("[userService] checkAndCreateUserDocument: CRITICAL - Failed to retrieve user document after create/update for UID:", firebaseUser.uid);
      throw new Error("Gagal memuat data profil pengguna setelah pembuatan/pembaruan.");
    }
    console.log("[userService] checkAndCreateUserDocument: Successfully fetched/created/updated user document for UID:", firebaseUser.uid);
    return finalUserDoc;

  } catch (error: any) {
    console.error("[userService] Error in checkAndCreateUserDocument for UID:", firebaseUser.uid, "Message:", error.message);
    if (error.name === 'FirebaseError') {
      console.error("[userService] Firestore Error Details (checkAndCreateUserDocument outer catch):", JSON.stringify(error));
    }
    // Ensure a simple string message is thrown
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Gagal memproses profil pengguna di database: ${errorMessage}`);
  }
}

export async function getUserDocument(uid: string): Promise<AppUser | null> {
  if (!uid) {
    console.warn("[userService] getUserDocument: Called with no UID.");
    return null;
  }
  const userDocRef = doc(db, USERS_COLLECTION, uid);
  console.log(`[userService] getUserDocument: Attempting to fetch document for UID: ${uid}`);
  try {
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      console.log(`[userService] getUserDocument: Raw data for UID ${uid}:`, JSON.stringify(data));

      const createdAtTimestamp = data.createdAt as Timestamp | undefined;
      let createdAtISO: string;
      if (createdAtTimestamp instanceof Timestamp) {
        createdAtISO = createdAtTimestamp.toDate().toISOString();
      } else if (typeof data.createdAt === 'string') {
        createdAtISO = new Date(data.createdAt).toISOString(); // Attempt to parse if already string
      } else {
        // Fallback if createdAt is missing or invalid, though setDoc should ensure it
        console.warn(`[userService] getUserDocument: createdAt missing or invalid for UID ${uid}. Using current date.`);
        createdAtISO = new Date().toISOString();
      }

      const updatedAtTimestamp = data.updatedAt as Timestamp | undefined;
      let updatedAtISO: string | undefined = undefined;
      if (updatedAtTimestamp instanceof Timestamp) {
        updatedAtISO = updatedAtTimestamp.toDate().toISOString();
      } else if (typeof data.updatedAt === 'string') {
        updatedAtISO = new Date(data.updatedAt).toISOString();
      } else if (updatedAtTimestamp) { // If it exists but not a Timestamp or string, log warning
         console.warn(`[userService] getUserDocument: updatedAt has an unexpected type for UID ${uid}.`);
      }


      const appUser: AppUser = {
        uid: data.uid,
        email: data.email || null,
        displayName: data.displayName || null,
        photoURL: data.photoURL === undefined ? null : (data.photoURL || null),
        role: data.role || 'userSatker',
        uprId: data.uprId || data.displayName || null, // Ensure uprId is displayName if null
        activePeriod: data.activePeriod || DEFAULT_INITIAL_PERIOD,
        availablePeriods: Array.isArray(data.availablePeriods) && data.availablePeriods.length > 0
                          ? data.availablePeriods
                          : [...DEFAULT_AVAILABLE_PERIODS],
        createdAt: createdAtISO,
        updatedAt: updatedAtISO,
      };
      console.log(`[userService] getUserDocument: Document found and processed for UID: ${uid}`, JSON.stringify(appUser));
      return appUser;
    } else {
      console.log(`[userService] getUserDocument: No document found for UID: ${uid}`);
      return null;
    }
  } catch (error: any) {
    console.error(`[userService] getUserDocument: Error fetching user document for UID ${uid}:`, error.message);
    if (error.name === 'FirebaseError') {
        console.error("[userService] Firestore Error Details (getUserDocument catch):", JSON.stringify(error));
    }
    throw new Error(`Gagal mengambil data profil pengguna: ${error.message || String(error)}`);
  }
}

export async function updateUserProfileData(
  uid: string,
  data: Partial<Pick<AppUser, 'displayName' | 'photoURL' | 'activePeriod' | 'availablePeriods'>>
): Promise<void> {
  console.log(`[userService] updateUserProfileData called for UID: ${uid} with data:`, JSON.stringify(data));
  if (!uid) {
    throw new Error("UID pengguna tidak valid untuk memperbarui profil.");
  }
  
  const updates: { [key: string]: any } = {};

  if (data.displayName !== undefined) {
    updates.displayName = data.displayName || null;
    updates.uprId = data.displayName || null; // Sinkronkan uprId dengan displayName
  }
  if (data.photoURL !== undefined) {
    updates.photoURL = data.photoURL || null;
  }
  if (data.activePeriod !== undefined) {
    updates.activePeriod = data.activePeriod || DEFAULT_INITIAL_PERIOD;
  }
  if (data.availablePeriods !== undefined) {
    updates.availablePeriods = Array.isArray(data.availablePeriods) && data.availablePeriods.length > 0
                                ? data.availablePeriods
                                : [...DEFAULT_AVAILABLE_PERIODS];
  }
  
  if (Object.keys(updates).length === 0) {
    console.log("[userService] updateUserProfileData: No changes to update for user profile for UID:", uid);
    return;
  }
  
  updates.updatedAt = serverTimestamp();

  try {
    await _updateUserProfileInFirestore(uid, updates);
    console.log(`[userService] updateUserProfileData: User document update initiated successfully for UID ${uid}.`);
  } catch (error: any) {
    console.error("[userService] updateUserProfileData: Error from _updateUserProfileInFirestore for UID:", uid, "Message:", error.message);
    // Re-throw with a simple message to avoid stack overflow from complex error objects
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Gagal memperbarui data profil pengguna: ${errorMessage}`);
  }
}

    