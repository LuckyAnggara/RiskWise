
"use server";

import { db } from '@/lib/firebase/config';
import type { AppUser, UserRole } from '@/lib/types';
import { USERS_COLLECTION } from './collectionNames';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore';
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
        photoURL: data.photoURL || null,
        role: data.role || 'userSatker',
        uprId: data.uprId || data.displayName || null,
        createdAt: createdAtISO,
        updatedAt: updatedAtISO,
      } as AppUser;
    }
    console.log(`User document with UID ${uid} not found.`);
    return null;
  } catch (error: any) {
    console.error("Error getting user document from Firestore. Message:", error.message);
    throw new Error(`Gagal mengambil dokumen pengguna: ${error.message || String(error)}`);
  }
}

export async function checkAndCreateUserDocument(
  firebaseUser: FirebaseUser,
  displayNameFromForm?: string, // From email/pass registration
  uprNameInput?: string, // From email/pass registration, used to create/find UPR code
  defaultRole: UserRole = 'userSatker'
): Promise<AppUser> {
  console.log("Entering checkAndCreateUserDocument for UID:", firebaseUser.uid);
  const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);

  try {
    const existingUserDocSnap = await getDoc(userDocRef);

    // Determine displayName and uprId
    const finalDisplayName = displayNameFromForm || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || `User_${firebaseUser.uid.substring(0,5)}`;
    let finalUprId: string | null = finalDisplayName; // By default, UPR ID is the display name for new users or if no UPR name is given

    // If uprNameInput is provided (typically from email/password registration form),
    // it overrides the default uprId logic.
    // For Google Sign-In, uprNameInput will be undefined, so uprId will be finalDisplayName or null if userDoc exists with uprId.
    if (uprNameInput && uprNameInput.trim() !== "") {
        // This logic for UPR creation was removed as per "1 user 1 UPR (name = displayname)"
        // For now, if uprNameInput exists, it implies displayNameFromForm also exists, so uprId is just finalDisplayName.
        // Future: if UPRs were a separate concept, this is where you'd call uprService.
        finalUprId = finalDisplayName;
    }


    if (existingUserDocSnap.exists()) {
      const existingData = existingUserDocSnap.data() as AppUser;
      const updates: Partial<AppUser> = {};
      let needsUpdate = false;

      if (finalDisplayName && existingData.displayName !== finalDisplayName) {
        updates.displayName = finalDisplayName;
        updates.uprId = finalDisplayName; // UPR ID follows display name
        needsUpdate = true;
      }
      if (firebaseUser.photoURL && existingData.photoURL !== firebaseUser.photoURL) {
        updates.photoURL = firebaseUser.photoURL;
        needsUpdate = true;
      }
      if (existingData.uprId !== finalUprId && finalUprId) { 
        updates.uprId = finalUprId;
        needsUpdate = true;
      } else if (existingData.uprId === null && finalUprId) { // Ensure uprId is set if it was null
        updates.uprId = finalUprId;
        needsUpdate = true;
      }


      if (needsUpdate && Object.keys(updates).length > 0) {
        console.log('Updating user document:', JSON.stringify(updates));
        await updateDoc(userDocRef, {...updates, updatedAt: serverTimestamp()});
      }
      
      const finalDocSnap = await getDoc(userDocRef); // Re-fetch to get the most current data
      const finalData = finalDocSnap.data();
      const createdAt = finalData?.createdAt instanceof Timestamp 
                        ? finalData.createdAt.toDate().toISOString() 
                        : (existingData.createdAt || new Date().toISOString());
      const updatedAt = finalData?.updatedAt instanceof Timestamp
                        ? finalData.updatedAt.toDate().toISOString()
                        : (existingData.updatedAt || undefined);

      return {
          uid: firebaseUser.uid,
          email: finalData?.email || existingData.email || firebaseUser.email,
          displayName: finalData?.displayName || existingData.displayName || finalDisplayName,
          photoURL: finalData?.photoURL || existingData.photoURL || firebaseUser.photoURL,
          role: finalData?.role || existingData.role || defaultRole,
          uprId: finalData?.uprId || existingData.uprId || finalUprId,
          createdAt,
          updatedAt,
      } as AppUser;

    } else {
      // Document doesn't exist, create it
      const newUserDocData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || null,
        displayName: finalDisplayName,
        photoURL: firebaseUser.photoURL || null,
        role: defaultRole,
        uprId: finalUprId,
        createdAt: serverTimestamp(),
      };
      
      console.log('Data to create user document:', JSON.stringify(newUserDocData));
      await setDoc(userDocRef, newUserDocData);
      
      return {
        ...newUserDocData,
        email: newUserDocData.email, // ensure type consistency
        displayName: newUserDocData.displayName,
        photoURL: newUserDocData.photoURL,
        uprId: newUserDocData.uprId,
        createdAt: new Date().toISOString(), // Placeholder for immediate return
      } as AppUser;
    }
  } catch (error: any) {
    console.error("Error in checkAndCreateUserDocument. Message:", error.message, "Details:", error);
    throw new Error(`Gagal menyimpan atau memperbarui profil pengguna di database: ${error.message || String(error)}`);
  }
}

export async function updateUserProfileData(
  uid: string,
  data: { displayName?: string | null; photoURL?: string | null }
): Promise<void> {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    const userDocSnap = await getDoc(userDocRef);

    const updates: Record<string, any> = {}; // Use Record<string, any> for flexibility

    if (data.displayName !== undefined) {
      updates.displayName = data.displayName;
      updates.uprId = data.displayName; // UPR ID is the display name
    }
    if (data.photoURL !== undefined) {
      updates.photoURL = data.photoURL;
    }
    
    if (Object.keys(updates).length === 0) {
        console.log("No changes to update for user profile.");
        return;
    }

    updates.updatedAt = serverTimestamp();

    if (userDocSnap.exists()) {
      console.log(`Updating user document for UID ${uid} with:`, updates);
      await updateDoc(userDocRef, updates);
    } else {
      // Document doesn't exist, create it with the new data plus essential fields
      console.log(`User document for UID ${uid} not found. Creating new document with:`, updates);
      const firebaseUser = { uid, email: null, ...data }; // Minimal FirebaseUser-like structure
      
      const newDocData = {
        uid: uid,
        email: null, // Cannot infer email here, might need to be fetched or passed if required
        displayName: updates.displayName || null,
        photoURL: updates.photoURL || null,
        role: 'userSatker', // Default role for a document created this way
        uprId: updates.uprId || updates.displayName || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(userDocRef, newDocData);
    }
    console.log(`User profile data processed for UID ${uid}.`);

  } catch (error: any) {
    console.error("Error updating/creating user profile data in Firestore. Message:", error.message);
    throw new Error(`Gagal memperbarui atau membuat data profil pengguna: ${error.message || String(error)}`);
  }
}

    