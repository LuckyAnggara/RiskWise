
"use server";

import { db } from '@/lib/firebase/config';
import type { AppUser, UserRole } from '@/lib/types';
import { USERS_COLLECTION } from './collectionNames';
import { Timestamp, serverTimestamp, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';

export async function getUserDocument(uid: string): Promise<AppUser | null> {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
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
      const existingData = existingUserDocSnap.data() as AppUser;
      const updates: Partial<AppUser> = {};
      let needsUpdate = false;

      if (finalDisplayName && existingData.displayName !== finalDisplayName) {
        updates.displayName = finalDisplayName;
        updates.uprId = finalUprId; 
        needsUpdate = true;
      }
      // Handle photoURL explicitly to store null if it's undefined or removed
      if (firebaseUser.photoURL !== existingData.photoURL) {
        updates.photoURL = firebaseUser.photoURL || null;
        needsUpdate = true;
      }
      
      if ((!existingData.uprId || existingData.uprId !== finalUprId) && finalUprId) {
        updates.uprId = finalUprId;
        needsUpdate = true;
      }

      if (needsUpdate && Object.keys(updates).length > 0) {
        const updateDataPayload = {...updates, updatedAt: serverTimestamp()};
        console.log('[userService] Updating existing user document with:', JSON.stringify(updateDataPayload));
        await updateDoc(userDocRef, updateDataPayload);
        console.log('[userService] Existing user document updated successfully.');
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
        photoURL: finalData.photoURL === undefined ? null : (finalData.photoURL || null),
        role: finalData.role || defaultRole,
        uprId: finalData.uprId || finalUprId,
        createdAt,
        updatedAt,
      } as AppUser;

    } else {
      const newUserDocData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || null,
        displayName: finalDisplayName,
        photoURL: firebaseUser.photoURL || null,
        role: defaultRole,
        uprId: finalUprId,
        createdAt: serverTimestamp(),
      };
      
      console.log('[userService] Creating new user document with:', JSON.stringify(newUserDocData));
      await setDoc(userDocRef, newUserDocData);
      console.log('[userService] New user document created successfully.');
      
      // Fetch the just-created document to get the server-generated timestamp correctly
      const createdDocSnap = await getDoc(userDocRef);
      const createdData = createdDocSnap.data();
      const createdAtTimestamp = createdData?.createdAt as Timestamp | undefined;

      return {
        uid: newUserDocData.uid,
        email: newUserDocData.email,
        displayName: newUserDocData.displayName,
        photoURL: newUserDocData.photoURL,
        role: newUserDocData.role,
        uprId: newUserDocData.uprId,
        createdAt: createdAtTimestamp ? createdAtTimestamp.toDate().toISOString() : new Date().toISOString(),
      } as AppUser;
    }
  } catch (error: any) {
    console.error("[userService] Error in checkAndCreateUserDocument. Message:", error.message, "Code:", error.code);
    if (error.name === 'FirebaseError') {
        console.error("[userService] Firestore Error Details (JSON):", JSON.stringify(error));
    }
    throw new Error(`Gagal menyimpan atau memperbarui profil pengguna di database: ${error.message || String(error)}`);
  }
}

export async function updateUserProfileData(
  uid: string,
  data: { displayName?: string | null; photoURL?: string | null }
): Promise<void> {
  console.log(`[userService] updateUserProfileData called for UID: ${uid} with data:`, JSON.stringify(data));
  try {
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    const userDocSnap = await getDoc(userDocRef);

    const updates: Record<string, any> = {}; 

    if (data.displayName !== undefined) {
      updates.displayName = data.displayName || null; // Ensure null if empty string or undefined
      updates.uprId = data.displayName || null; // UPR ID is the display name
    }
    if (data.photoURL !== undefined) {
      updates.photoURL = data.photoURL || null; // Ensure null if empty string or undefined
    }
    
    if (Object.keys(updates).length === 0) {
        console.log("[userService] No changes to update for user profile.");
        return;
    }

    updates.updatedAt = serverTimestamp();

    if (userDocSnap.exists()) {
      console.log(`[userService] Updating user document for UID ${uid} with:`, JSON.stringify(updates));
      await updateDoc(userDocRef, updates);
      console.log(`[userService] User document updated successfully for UID ${uid}.`);
    } else {
      console.log(`[userService] User document for UID ${uid} not found. Creating new document.`);
      const newDocData = {
        uid: uid,
        email: null, // Cannot infer email here, would need to be passed if required
        displayName: updates.displayName, // Already handles null
        photoURL: updates.photoURL, // Already handles null
        role: 'userSatker', 
        uprId: updates.uprId, // Already handles null
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      console.log(`[userService] Creating new user document with:`, JSON.stringify(newDocData));
      await setDoc(userDocRef, newDocData);
      console.log(`[userService] New user document created successfully for UID ${uid}.`);
    }
  } catch (error: any) {
    console.error("[userService] Error updating/creating user profile data in Firestore. Message:", error.message);
    if (error.name === 'FirebaseError') {
        console.error("[userService] Firestore Error Details (JSON):", JSON.stringify(error));
    }
    throw new Error(`Gagal memperbarui atau membuat data profil pengguna: ${error.message || String(error)}`);
  }
}
