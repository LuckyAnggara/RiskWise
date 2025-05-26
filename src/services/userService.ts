
"use server";

import { db } from '@/lib/firebase/config';
import type { AppUser, UserRole } from '@/lib/types';
import { USERS_COLLECTION } from './collectionNames';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
// Tidak perlu lagi impor dari uprService

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
                        : (data.createdAt && typeof data.createdAt === 'string' ? new Date(data.createdAt).toISOString() : new Date().toISOString());
      return { 
        uid: userDocSnap.id, 
        email: data.email,
        displayName: data.displayName || null,
        photoURL: data.photoURL || null,
        role: data.role,
        uprId: data.uprId || null, // uprId akan sama dengan displayName
        createdAt 
      } as AppUser;
    }
    return null;
  } catch (error: any) {
    console.error("Error getting user document from Firestore. Message:", error.message);
    throw new Error(`Gagal mengambil dokumen pengguna: ${error.message || String(error)}`);
  }
}

/**
 * Creates or updates a user document in Firestore.
 * displayName pengguna akan digunakan sebagai uprId.
 * @param firebaseUser The User object from Firebase Authentication.
 * @param defaultRole The default role to assign to the new user.
 * @returns The AppUser object (either existing or newly created/updated).
 */
export async function checkAndCreateUserDocument(
  firebaseUser: FirebaseUser,
  defaultRole: UserRole = 'userSatker'
): Promise<AppUser> {
  console.log("Entering checkAndCreateUserDocument for UID:", firebaseUser.uid);
  const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
  
  try {
    const existingUserDocSnap = await getDoc(userDocRef);

    // Tentukan displayName dan uprId
    // Untuk registrasi email/password, displayName mungkin null awalnya, jadi kita buat placeholder.
    // Untuk Google Sign-In, displayName biasanya ada.
    const userDisplayName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || `User_${firebaseUser.uid.substring(0,5)}`;
    const uprIdForUser = userDisplayName; // Nama UPR = Nama Pengguna

    if (existingUserDocSnap.exists()) {
      const existingData = existingUserDocSnap.data() as AppUser;
      const updates: Partial<AppUser> = {};
      let needsUpdate = false;

      // Update displayName jika berbeda atau jika sebelumnya null dan sekarang ada dari Google
      if (userDisplayName && existingData.displayName !== userDisplayName) {
        updates.displayName = userDisplayName;
        updates.uprId = userDisplayName; // Jika displayName berubah, uprId juga
        needsUpdate = true;
      }
      if (firebaseUser.photoURL && existingData.photoURL !== firebaseUser.photoURL) {
        updates.photoURL = firebaseUser.photoURL;
        needsUpdate = true;
      }
      // Jika UPR ID belum ada atau berbeda dari displayName baru
      if (existingData.uprId !== uprIdForUser) {
        updates.uprId = uprIdForUser;
        needsUpdate = true;
      }
      
      if (needsUpdate && Object.keys(updates).length > 0) {
        console.log('Data to update user document:', JSON.stringify(updates));
        await updateDoc(userDocRef, updates);
      }
      
      const finalDocSnap = await getDoc(userDocRef);
      const finalData = finalDocSnap.data();
      const createdAt = finalData?.createdAt instanceof Timestamp 
                        ? finalData.createdAt.toDate().toISOString() 
                        : (existingData.createdAt || new Date().toISOString());
      return { uid: firebaseUser.uid, ...(finalData || existingData), createdAt } as AppUser;

    } else {
      // Buat dokumen pengguna baru
      const newUserDocData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: userDisplayName || null, 
        photoURL: firebaseUser.photoURL || null,    
        role: defaultRole,
        uprId: uprIdForUser, // Nama UPR = Nama Pengguna
        createdAt: serverTimestamp(),
      };
      
      console.log('Data to create user document:', JSON.stringify(newUserDocData)); 
      await setDoc(userDocRef, newUserDocData);
      
      const createdDocSnap = await getDoc(userDocRef);
      if (createdDocSnap.exists()) {
          const data = createdDocSnap.data();
          const createdAt = data.createdAt instanceof Timestamp 
                            ? data.createdAt.toDate().toISOString() 
                            : new Date().toISOString(); 
          return { 
              uid: createdDocSnap.id, 
              ...data,
              createdAt
          } as AppUser;
      } else {
          throw new Error("Gagal mengambil profil pengguna yang baru dibuat dari database.");
      }
    }
  } catch (error: any) {
    console.error("Error in checkAndCreateUserDocument. Message:", error.message);
    throw new Error(`Gagal menyimpan atau memperbarui profil pengguna di database: ${error.message || String(error)}`);
  }
}
