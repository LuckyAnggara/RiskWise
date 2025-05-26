
"use server";

import { db } from '@/lib/firebase/config';
import type { AppUser, UserRole, UPR } from '@/lib/types';
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
      const createdAt = data.createdAt instanceof Timestamp 
                        ? data.createdAt.toDate().toISOString() 
                        : (data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString());
      return { 
        uid: userDocSnap.id, 
        email: data.email,
        displayName: data.displayName || null,
        photoURL: data.photoURL || null,
        role: data.role,
        uprId: data.uprId || null,
        createdAt 
      } as AppUser;
    }
    return null;
  } catch (error: any) {
    console.error("Error getting user document from Firestore. Message:", error.message);
    // return null or throw error depending on how you want to handle it
    throw new Error(`Gagal mengambil dokumen pengguna: ${error.message || error}`);
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
  
  try {
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
      const existingData = existingUserDocSnap.data() as AppUser;
      const updates: Partial<AppUser> = {};
      let needsUpdate = false;

      if (displayNameFromForm && existingData.displayName !== displayNameFromForm) {
        updates.displayName = displayNameFromForm;
        needsUpdate = true;
      }
      // Only update uprId if it's currently null and a new one is provided,
      // or if a uprNameInput was provided (implying an attempt to set/change it)
      if (uprNameInput && uprIdToStore && existingData.uprId !== uprIdToStore) {
        updates.uprId = uprIdToStore;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        console.log('Data to update user document:', updates);
        await updateDoc(userDocRef, updates);
      }
      
      // Re-fetch to ensure we return the most current data including potentially updated fields
      const updatedDocSnap = await getDoc(userDocRef);
      const finalData = updatedDocSnap.data();
      const createdAt = finalData?.createdAt instanceof Timestamp 
                        ? finalData.createdAt.toDate().toISOString() 
                        : (existingData.createdAt || new Date().toISOString());
      return { uid: firebaseUser.uid, ...(finalData || existingData), createdAt } as AppUser;

    } else {
      const newUserDocData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: displayNameFromForm || null,
        photoURL: firebaseUser.photoURL || null,
        role: defaultRole,
        uprId: uprIdToStore,
        createdAt: serverTimestamp(),
      };
      
      console.log('Data to create user document:', newUserDocData); // Logging data before write
      await setDoc(userDocRef, newUserDocData);
      
      // Fetch the newly created doc to resolve serverTimestamp
      const createdDocSnap = await getDoc(userDocRef);
      if (createdDocSnap.exists()) {
          const data = createdDocSnap.data();
          const createdAt = data.createdAt instanceof Timestamp 
                            ? data.createdAt.toDate().toISOString() 
                            : new Date().toISOString(); // Fallback
          return { 
              uid: createdDocSnap.id, 
              ...data,
              createdAt
          } as AppUser;
      } else {
          // This case should ideally not happen if setDoc was successful
          throw new Error("Gagal mengambil profil pengguna yang baru dibuat dari database.");
      }
    }
  } catch (error: any) {
    console.error("Error in checkAndCreateUserDocument. Message:", error.message);
    // Re-throw specific errors if needed, or a generic one
    if (error.message.startsWith("Gagal memproses UPR")) {
      throw error;
    }
    throw new Error(`Gagal menyimpan atau memperbarui profil pengguna di database: ${error.message || error}`);
  }
}
