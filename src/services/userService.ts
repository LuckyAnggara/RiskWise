
"use server";

import { db } from '@/lib/firebase/config';
import type { AppUser, UserRole } from '@/lib/types';
import { USERS_COLLECTION } from './collectionNames';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
import { getUprByName, createUpr } from './uprService'; // Import UPR services

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
  } catch (error) {
    console.error("Error getting user document from Firestore: ", error);
    // Return null or throw a more specific error if needed for UI handling
    return null;
  }
}

/**
 * Creates a new user document in Firestore if it doesn't already exist.
 * Handles UPR creation or linking.
 * @param firebaseUser The User object from Firebase Authentication.
 * @param displayNameFromForm The full name from the registration form.
 * @param uprNameInput Optional name of the UPR from the registration form.
 * @param defaultRole The default role to assign to the new user.
 * @returns The AppUser object (either existing or newly created).
 */
export async function checkAndCreateUserDocument(
  firebaseUser: FirebaseUser,
  displayNameFromForm: string, // Added for full name from form
  uprNameInput?: string,      // Optional UPR name from form
  defaultRole: UserRole = 'userSatker'
): Promise<AppUser> {
  const existingUserDoc = await getUserDocument(firebaseUser.uid);

  if (existingUserDoc) {
    // Optionally, update displayName if it's different and provided
    if (displayNameFromForm && existingUserDoc.displayName !== displayNameFromForm) {
        try {
            await updateDoc(doc(db, USERS_COLLECTION, firebaseUser.uid), { displayName: displayNameFromForm });
            return { ...existingUserDoc, displayName: displayNameFromForm };
        } catch (updateError) {
            console.error("Error updating user's displayName:", updateError);
            // Proceed with existing doc even if display name update fails
        }
    }
    return existingUserDoc;
  }

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
      // If createUpr throws due to duplicate name, or other error
      console.error("Error handling UPR during user creation:", uprError.message);
      throw new Error(`Gagal memproses UPR: ${uprError.message}`); 
    }
  }

  const newUserDocData = {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: displayNameFromForm || firebaseUser.displayName || null,
    photoURL: firebaseUser.photoURL || null,
    role: defaultRole,
    uprId: uprIdToStore,
    createdAt: serverTimestamp(),
  };

  try {
    const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
    await setDoc(userDocRef, newUserDocData);
    
    // To return the resolved timestamp and final data
    const createdDocSnap = await getDoc(userDocRef);
    if (createdDocSnap.exists()) {
        const data = createdDocSnap.data();
        const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString();
        return { 
            uid: createdDocSnap.id, 
            email: data.email,
            displayName: data.displayName,
            photoURL: data.photoURL,
            role: data.role,
            uprId: data.uprId,
            createdAt 
        } as AppUser;
    } else {
        // Should not happen if setDoc was successful, but as a fallback
        throw new Error("Gagal mengambil profil pengguna yang baru dibuat dari database.");
    }
  } catch (error: any) {
    console.error("Error creating user document in Firestore: ", error.message);
    throw new Error(`Gagal menyimpan profil pengguna di database: ${error.message}`);
  }
}
