
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
  try {
    console.log(`[userService] Attempting to get user document for UID: ${uid}`);
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      console.log(`[userService] User document found for UID: ${uid}`, data);
      const createdAtTimestamp = data.createdAt as Timestamp | undefined;
      const createdAtISO = createdAtTimestamp
                        ? createdAtTimestamp.toDate().toISOString()
                        : (data.createdAt && typeof data.createdAt === 'string' ? new Date(data.createdAt).toISOString() : new Date().toISOString());
      
      const updatedAtTimestamp = data.updatedAt as Timestamp | undefined;
      const updatedAtISO = updatedAtTimestamp
                        ? updatedAtTimestamp.toDate().toISOString()
                        : (data.updatedAt && typeof data.updatedAt === 'string' ? new Date(data.updatedAt).toISOString() : undefined);

      return {
        uid: userDocSnap.id,
        email: data.email || null,
        displayName: data.displayName || null,
        photoURL: data.photoURL === undefined ? null : data.photoURL,
        role: data.role || 'userSatker',
        uprId: data.uprId || data.displayName || null,
        createdAt: createdAtISO,
        updatedAt: updatedAtISO,
        activePeriod: data.activePeriod || DEFAULT_PERIOD,
        availablePeriods: data.availablePeriods || [...DEFAULT_AVAILABLE_PERIODS],
      } as AppUser;
    }
    console.log(`[userService] User document with UID ${uid} not found.`);
    return null;
  } catch (error: any) {
    console.error("[userService] Error getting user document from Firestore. Message:", error.message);
    throw new Error(`Gagal mengambil dokumen pengguna: ${error.message || String(error)}`);
  }
}

export async function checkAndCreateUserDocument(
  firebaseUser: FirebaseUser,
  defaultRole: UserRole = 'userSatker'
): Promise<AppUser> {
  console.log("[userService] checkAndCreateUserDocument called for UID:", firebaseUser.uid);
  const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);

  try {
    const existingUserDocSnap = await getDoc(userDocRef);

    const finalDisplayName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || `Pengguna_${firebaseUser.uid.substring(0, 5)}`;
    const finalUprId = finalDisplayName;

    if (existingUserDocSnap.exists()) {
      console.log("[userService] User document exists for UID:", firebaseUser.uid);
      const existingData = existingUserDocSnap.data() as AppUser;
      const updates: Partial<AppUser> = {};
      let needsUpdate = false;

      if (finalDisplayName && existingData.displayName !== finalDisplayName) {
        updates.displayName = finalDisplayName;
        updates.uprId = finalUprId;
        needsUpdate = true;
      }
      
      const currentPhotoURL = firebaseUser.photoURL === undefined ? null : firebaseUser.photoURL;
      if (existingData.photoURL !== currentPhotoURL) {
        updates.photoURL = currentPhotoURL;
        needsUpdate = true;
      }
      
      if ((!existingData.uprId || existingData.uprId !== finalUprId) && finalUprId) {
        updates.uprId = finalUprId;
        needsUpdate = true;
      }
      
      if (existingData.activePeriod === undefined || existingData.activePeriod === null) {
        updates.activePeriod = DEFAULT_PERIOD;
        needsUpdate = true;
      }
      if (existingData.availablePeriods === undefined || existingData.availablePeriods === null || (Array.isArray(existingData.availablePeriods) && existingData.availablePeriods.length === 0)) {
        updates.availablePeriods = [...DEFAULT_AVAILABLE_PERIODS];
        needsUpdate = true;
      }

      if (needsUpdate && Object.keys(updates).length > 0) {
        console.log('[userService] Updating existing user document with:', JSON.stringify(updates));
        await updateDoc(userDocRef, {...updates, updatedAt: serverTimestamp()});
         console.log('[userService] Existing user document updated successfully.');
      } else {
        console.log('[userService] No updates needed for existing user document.');
      }
      
      const finalDocSnap = await getDoc(userDocRef);
      const finalData = finalDocSnap.data()!;
      const createdAt = finalData.createdAt instanceof Timestamp 
                        ? finalData.createdAt.toDate().toISOString() 
                        : (existingData.createdAt || new Date().toISOString());
      const updatedAt = finalData.updatedAt instanceof Timestamp
                        ? finalData.updatedAt.toDate().toISOString()
                        : (existingData.updatedAt || undefined);

      return {
        uid: firebaseUser.uid,
        email: finalData.email || firebaseUser.email || null,
        displayName: finalData.displayName || finalDisplayName,
        photoURL: finalData.photoURL === undefined ? null : finalData.photoURL,
        role: finalData.role || defaultRole,
        uprId: finalData.uprId || finalUprId,
        createdAt,
        updatedAt,
        activePeriod: finalData.activePeriod || DEFAULT_PERIOD,
        availablePeriods: finalData.availablePeriods || [...DEFAULT_AVAILABLE_PERIODS],
      } as AppUser;

    } else {
      console.log("[userService] User document does not exist for UID:", firebaseUser.uid, "Creating new one.");
      const newUserDocData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || null,
        displayName: finalDisplayName,
        photoURL: firebaseUser.photoURL === undefined ? null : firebaseUser.photoURL,
        role: defaultRole,
        uprId: finalUprId,
        activePeriod: DEFAULT_PERIOD,
        availablePeriods: [...DEFAULT_AVAILABLE_PERIODS],
        createdAt: serverTimestamp(),
      };
      
      console.log('[userService] Creating new user document with:', JSON.stringify(newUserDocData));
      await setDoc(userDocRef, newUserDocData);
      console.log('[userService] New user document created successfully.');
      
      // Fetch the just created document to get the server-generated createdAt timestamp correctly
      const createdDocSnap = await getDoc(userDocRef);
      if (createdDocSnap.exists()) {
        const createdData = createdDocSnap.data();
        const createdAtTimestamp = createdData.createdAt as Timestamp;
        return {
          uid: firebaseUser.uid,
          email: newUserDocData.email,
          displayName: newUserDocData.displayName,
          photoURL: newUserDocData.photoURL,
          role: newUserDocData.role,
          uprId: newUserDocData.uprId,
          activePeriod: newUserDocData.activePeriod,
          availablePeriods: newUserDocData.availablePeriods,
          createdAt: createdAtTimestamp.toDate().toISOString(),
        } as AppUser;
      } else {
        // Should not happen if setDoc was successful
        throw new Error("Gagal mengambil dokumen pengguna yang baru dibuat.");
      }
    }
  } catch (error: any) {
    console.error("[userService] Error in checkAndCreateUserDocument. Message:", error.message, "Code:", error.code);
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
  try {
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    const userDocSnap = await getDoc(userDocRef);

    const updates: { [key: string]: any } = {}; // Use a more generic type for updates object

    if (data.displayName !== undefined) {
      updates.displayName = data.displayName || null;
      updates.uprId = data.displayName || null; 
    }
    if (data.photoURL !== undefined) {
      updates.photoURL = data.photoURL === undefined ? null : data.photoURL;
    }
    if (data.activePeriod !== undefined) {
      updates.activePeriod = data.activePeriod || null;
    }
    if (data.availablePeriods !== undefined) {
      updates.availablePeriods = Array.isArray(data.availablePeriods) ? data.availablePeriods : [];
    }
    
    if (Object.keys(updates).length === 0 && userDocSnap.exists()) { // Only return if no updates AND doc exists
        console.log("[userService] No changes to update for user profile.");
        return;
    }

    updates.updatedAt = serverTimestamp();

    if (userDocSnap.exists()) {
      console.log(`[userService] Updating user document for UID ${uid} with:`, JSON.stringify(updates));
      await updateDoc(userDocRef, updates);
    } else {
      console.log(`[userService] User document for UID ${uid} not found. Creating new document with updates.`);
      const newDocData = {
        uid: uid,
        email: null, 
        displayName: updates.displayName || `Pengguna_${uid.substring(0,5)}`, // Default if not provided
        photoURL: updates.photoURL === undefined ? null : updates.photoURL,
        role: 'userSatker', 
        uprId: updates.uprId || updates.displayName || `Pengguna_${uid.substring(0,5)}`,
        activePeriod: updates.activePeriod || DEFAULT_PERIOD,
        availablePeriods: updates.availablePeriods || [...DEFAULT_AVAILABLE_PERIODS],
        createdAt: serverTimestamp(), 
        updatedAt: serverTimestamp(),
      };
      await setDoc(userDocRef, newDocData);
    }
    console.log(`[userService] User document updated/created successfully for UID ${uid}.`);

  } catch (error: any) {
    console.error("[userService] Error updating/creating user profile data in Firestore. Message:", error.message);
    if (error.name === 'FirebaseError') {
        console.error("[userService] FirebaseError Details (JSON):", JSON.stringify(error));
    }
    throw new Error(`Gagal memperbarui data profil pengguna: ${error.message || String(error)}`);
  }
}

    