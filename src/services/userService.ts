
"use server";

import { db } from '@/lib/firebase/config';
import type { AppUser, UserRole } from '@/lib/types';
import { USERS_COLLECTION } from './collectionNames';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';

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
      return { uid: userDocSnap.id, ...data, createdAt } as AppUser;
    }
    return null;
  } catch (error) {
    console.error("Error getting user document from Firestore: ", error);
    return null;
  }
}

/**
 * Creates a new user document in Firestore if it doesn't already exist.
 * Typically called after a user signs up or signs in for the first time.
 * @param firebaseUser The User object from Firebase Authentication.
 * @param defaultRole The default role to assign to the new user.
 * @returns The AppUser object (either existing or newly created).
 */
export async function checkAndCreateUserDocument(
  firebaseUser: FirebaseUser,
  defaultRole: UserRole = 'userSatker'
): Promise<AppUser> {
  const existingUserDoc = await getUserDocument(firebaseUser.uid);

  if (existingUserDoc) {
    return existingUserDoc;
  }

  const newUserDocData = {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName || null, // Ensure null if undefined or falsy
    photoURL: firebaseUser.photoURL || null,     // Ensure null if undefined or falsy
    role: defaultRole,
    uprId: null, 
    createdAt: serverTimestamp(),
  };

  try {
    const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
    await setDoc(userDocRef, newUserDocData);
    
    // Fetch the newly created document to get the server timestamp resolved
    // This step is good practice but can be omitted if client-side timestamp is acceptable for immediate use
    const createdDocSnap = await getDoc(userDocRef);
    if (createdDocSnap.exists()) {
        const data = createdDocSnap.data();
        const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(); // Handle server timestamp
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
        console.error("Failed to fetch newly created user document.");
        // Fallback to client-side timestamp and data, though serverTimestamp is preferred
        return { 
            uid: firebaseUser.uid,
            email: newUserDocData.email,
            displayName: newUserDocData.displayName,
            photoURL: newUserDocData.photoURL,
            role: newUserDocData.role,
            uprId: newUserDocData.uprId,
            createdAt: new Date().toISOString() 
        } as AppUser;
    }
  } catch (error) {
    console.error("Error creating user document in Firestore: ", error);
    throw new Error("Gagal membuat dokumen pengguna di database.");
  }
}

    