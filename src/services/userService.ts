
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
      const createdAt = data.createdAt instanceof Timestamp 
                        ? data.createdAt.toDate().toISOString() 
                        : (data.createdAt && typeof data.createdAt === 'string' ? new Date(data.createdAt).toISOString() : new Date().toISOString());
      return { 
        uid: userDocSnap.id, 
        email: data.email || null,
        displayName: data.displayName || null,
        photoURL: data.photoURL || null,
        role: data.role || 'userSatker',
        uprId: data.uprId || data.displayName || null, // Fallback uprId to displayName if uprId is missing
        createdAt 
      } as AppUser;
    }
    return null;
  } catch (error: any) {
    console.error("Error getting user document from Firestore. Message:", error.message);
    throw new Error(`Gagal mengambil dokumen pengguna: ${error.message || String(error)}`);
  }
}

export async function checkAndCreateUserDocument(
  firebaseUser: FirebaseUser,
  defaultRole: UserRole = 'userSatker'
): Promise<AppUser> {
  console.log("Entering checkAndCreateUserDocument for UID:", firebaseUser.uid);
  const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
  
  try {
    const existingUserDocSnap = await getDoc(userDocRef);

    const userDisplayName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || `User_${firebaseUser.uid.substring(0,5)}`;
    // For this model, UPR ID IS the display name.
    const uprIdForUser = userDisplayName; 

    if (existingUserDocSnap.exists()) {
      const existingData = existingUserDocSnap.data() as AppUser;
      const updates: Partial<AppUser> = {};
      let needsUpdate = false;

      if (userDisplayName && existingData.displayName !== userDisplayName) {
        updates.displayName = userDisplayName;
        updates.uprId = userDisplayName; // UPR ID follows display name
        needsUpdate = true;
      }
      if (firebaseUser.photoURL && existingData.photoURL !== firebaseUser.photoURL) {
        updates.photoURL = firebaseUser.photoURL;
        needsUpdate = true;
      }
      if (existingData.uprId !== uprIdForUser) { // If existing uprId is different or null
        updates.uprId = uprIdForUser;
        needsUpdate = true;
      }
      
      if (needsUpdate && Object.keys(updates).length > 0) {
        console.log('Data to update user document:', JSON.stringify(updates));
        await updateDoc(userDocRef, updates);
      }
      
      const finalDocSnap = await getDoc(userDocRef); // Re-fetch to get the most current data
      const finalData = finalDocSnap.data();
      const createdAt = finalData?.createdAt instanceof Timestamp 
                        ? finalData.createdAt.toDate().toISOString() 
                        : (existingData.createdAt || new Date().toISOString());
      return { 
          uid: firebaseUser.uid, 
          ...(finalData || existingData),
          displayName: finalData?.displayName || existingData.displayName || userDisplayName,
          uprId: finalData?.uprId || existingData.uprId || uprIdForUser,
          createdAt 
      } as AppUser;

    } else {
      const newUserDocData: AppUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || null,
        displayName: userDisplayName, 
        photoURL: firebaseUser.photoURL || null,    
        role: defaultRole,
        uprId: userDisplayName, // UPR ID is the display name
        createdAt: new Date().toISOString(), // Use client-side ISO string, Firestore will convert serverTimestamp
      };
      
      const dataToSave = {
        ...newUserDocData,
        createdAt: serverTimestamp(), // Use serverTimestamp for actual save
      };
      
      console.log('Data to create user document:', JSON.stringify(dataToSave)); 
      await setDoc(userDocRef, dataToSave);
      
      // Return the data as it would be after creation, with client-side timestamp for immediate use
      return newUserDocData;
    }
  } catch (error: any) {
    console.error("Error in checkAndCreateUserDocument. Message:", error.message, "Details:", error);
    throw new Error(`Gagal menyimpan atau memperbarui profil pengguna di database: ${error.message || String(error)}`);
  }
}

// New function to update user profile (displayName, photoURL) and UPR ID
export async function updateUserProfileData(
  uid: string,
  data: { displayName?: string | null; photoURL?: string | null }
): Promise<void> {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    const updates: Partial<AppUser> = {};

    if (data.displayName !== undefined) {
      updates.displayName = data.displayName;
      updates.uprId = data.displayName; // UPR ID is the display name
    }
    if (data.photoURL !== undefined) {
      updates.photoURL = data.photoURL;
    }
    updates.updatedAt = serverTimestamp();

    if (Object.keys(updates).length > 0) {
      await updateDoc(userDocRef, updates);
      console.log(`User profile data updated for UID ${uid}:`, updates);
    }
  } catch (error: any) {
    console.error("Error updating user profile data in Firestore. Message:", error.message);
    throw new Error(`Gagal memperbarui data profil pengguna: ${error.message || String(error)}`);
  }
}
