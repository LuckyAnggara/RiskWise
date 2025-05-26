
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
    // Potentially re-throw or return a more specific error if needed by callers
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
    // Optionally, update fields like displayName or photoURL if they've changed in Firebase Auth
    // For now, just return the existing document
    return existingUserDoc;
  }

  // User document doesn't exist, create it
  const newUser: Omit<AppUser, 'createdAt' | 'id'> = { // Omit 'id' as it's the doc name
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    role: defaultRole,
    uprId: null, // Default UPR ID, can be set later by an admin
    // createdAt will be set by serverTimestamp
  };

  try {
    const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
    await setDoc(userDocRef, {
      ...newUser,
      createdAt: serverTimestamp(),
    });
    
    // Fetch the newly created document to get the server timestamp resolved
    const createdDocSnap = await getDoc(userDocRef);
    if (createdDocSnap.exists()) {
        const data = createdDocSnap.data();
        const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString();
        return { uid: createdDocSnap.id, ...data, createdAt } as AppUser;
    } else {
        // This case should ideally not happen if setDoc was successful
        console.error("Failed to fetch newly created user document.");
        // Fallback to client-side timestamp if fetching fails, though not ideal
        return { ...newUser, createdAt: new Date().toISOString() } as AppUser;
    }

  } catch (error) {
    console.error("Error creating user document in Firestore: ", error);
    throw new Error("Gagal membuat dokumen pengguna di database.");
  }
}
