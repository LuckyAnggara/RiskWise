
"use server";

import { db } from '@/lib/firebase/config';
import type { AppUser, UserRole } from '@/lib/types';
import { USERS_COLLECTION } from './collectionNames';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
import { getUprByName, createUpr } from './uprService';

/**
 * Retrieves a user document from Firestore.
 * @param uid The user's UID.
 * @returns The AppUser object or null if not found.
 */
export async function getUserDocument(uid: string): Promise<AppUser | null> {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString();
      return { 
        uid: userDocSnap.id, 
        email: data.email,
        displayName: data.displayName,
        photoURL: data.photoURL,
        role: data.role,
        uprId: data.uprId || null,
        createdAt 
      } as AppUser;
    }
    return null;
  } catch (error: any) {
    console.error("Error getting user document from Firestore. Message:", error.message);
    return null;
  }
}

/**
 * Creates or updates a user document in Firestore.
 * Handles UPR creation or linking.
 * @param firebaseUser The User object from Firebase Authentication.
 * @param displayNameFromForm The full name from the registration form or Google profile.
 * @param uprNameInput Optional name of the UPR.
 * @param defaultRole The default role to assign to the new user.
 * @returns The AppUser object (either existing or newly created/updated).
 */
export async function checkAndCreateUserDocument(
  firebaseUser: FirebaseUser,
  displayNameFromForm: string,
  uprNameInput?: string,
  defaultRole: UserRole = 'userSatker'
): Promise<AppUser> {
  const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
  const existingUserDocSnap = await getDoc(userDocRef);

  let uprIdToStore: string | null = null;

  if (uprNameInput && uprNameInput.trim() !== "") {
    try {
      let upr = await getUprByName(uprNameInput.trim());
      if (!upr) {
        console.log(`UPR "${uprNameInput.trim()}" not found, creating new one...`);
        upr = await createUpr(uprNameInput.trim());
        console.log(`New UPR created: ${upr.code} - ${upr.name}`);
      } else {
        console.log(`Existing UPR found: ${upr.code} - ${upr.name}`);
      }
      uprIdToStore = upr.code;
    } catch (uprError: any) {
      console.error("Error handling UPR during user creation. Message:", uprError.message);
      throw new Error(`Gagal memproses UPR: ${uprError.message || uprError}`);
    }
  }

  if (existingUserDocSnap.exists()) {
    // User exists, potentially update display name or UPR ID if not set and provided now
    const existingData = existingUserDocSnap.data() as AppUser;
    const updates: Partial<AppUser> = {};
    let needsUpdate = false;

    if (displayNameFromForm && existingData.displayName !== displayNameFromForm) {
      updates.displayName = displayNameFromForm;
      needsUpdate = true;
    }
    // Only update uprId if it's currently null and a new one is provided
    if (existingData.uprId === null && uprIdToStore !== null) {
      updates.uprId = uprIdToStore;
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      try {
        await updateDoc(userDocRef, updates);
      } catch (updateError: any) {
        console.error("Error updating existing user document. Message:", updateError.message);
        // Decide if this should throw or just proceed with existing data
      }
    }
    const finalData = (await getDoc(userDocRef)).data(); // Re-fetch to get latest
    const createdAt = finalData?.createdAt instanceof Timestamp ? finalData.createdAt.toDate().toISOString() : (existingData.createdAt || new Date().toISOString());
    return { uid: firebaseUser.uid, ...finalData, createdAt } as AppUser;
  } else {
    // User does not exist, create new document
    const newUserDocData = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: displayNameFromForm || null,
      photoURL: firebaseUser.photoURL || null,
      role: defaultRole,
      uprId: uprIdToStore, // This might be null if uprNameInput was not provided (e.g., Google Sign-In first time)
      createdAt: serverTimestamp(),
    };

    try {
      await setDoc(userDocRef, newUserDocData);
      // To return the resolved timestamp and final data
      const createdDocSnap = await getDoc(userDocRef);
      if (createdDocSnap.exists()) {
          const data = createdDocSnap.data();
          const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString();
          return { 
              uid: createdDocSnap.id, 
              ...data
          } as AppUser;
      } else {
          throw new Error("Gagal mengambil profil pengguna yang baru dibuat dari database.");
      }
    } catch (error: any) {
      console.error("Error creating user document in Firestore. Message:", error.message);
      throw new Error(`Gagal menyimpan profil pengguna di database: ${error.message || error}`);
    }
  }
}
