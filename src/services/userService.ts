
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
  console.log(`[userService] getUserDocument: Attempting to get user document for UID: ${uid}`);
  try {
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      console.log(`[userService] getUserDocument: User document found for UID ${uid}. Data:`, JSON.stringify(data));
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
        activePeriod: data.activePeriod || DEFAULT_PERIOD,
        availablePeriods: data.availablePeriods || [...DEFAULT_AVAILABLE_PERIODS],
      } as AppUser;
    }
    console.log(`[userService] getUserDocument: User document with UID ${uid} not found.`);
    return null;
  } catch (error: any) {
    console.error("[userService] getUserDocument: Error getting user document from Firestore. Message:", error.message);
    // Jangan melempar error di sini agar AuthContext bisa menangani appUser yang null
    return null; 
  }
}

export async function checkAndCreateUserDocument(
  firebaseUser: FirebaseUser,
  defaultRole: UserRole = 'userSatker'
): Promise<AppUser> {
  console.log("[userService] checkAndCreateUserDocument called for UID:", firebaseUser.uid);
  console.log("[userService] firebaseUser object received:", JSON.stringify({
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
  }));

  const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);

  try {
    const existingUserDocSnap = await getDoc(userDocRef);

    // Pastikan displayName dan uprId tidak undefined
    const finalDisplayName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || `Pengguna_${firebaseUser.uid.substring(0, 5)}`;
    const finalUprId = finalDisplayName; // Sesuai model 1 pengguna = 1 UPR

    console.log(`[userService] Determined finalDisplayName: "${finalDisplayName}", finalUprId: "${finalUprId}"`);

    if (existingUserDocSnap.exists()) {
      const existingData = existingUserDocSnap.data();
      console.log("[userService] User document exists. Existing data:", JSON.stringify(existingData));
      const updates: { [key: string]: any } = {}; // Gunakan any untuk fleksibilitas update
      let needsUpdate = false;

      if (finalDisplayName && existingData.displayName !== finalDisplayName) {
        updates.displayName = finalDisplayName;
        updates.uprId = finalUprId;
        needsUpdate = true;
      }
      
      const currentPhotoURL = firebaseUser.photoURL || null; // Pastikan null jika tidak ada
      if (existingData.photoURL !== currentPhotoURL) {
        updates.photoURL = currentPhotoURL;
        needsUpdate = true;
      }
      
      if ((!existingData.uprId || existingData.uprId !== finalUprId) && finalUprId) {
        updates.uprId = finalUprId;
        needsUpdate = true;
      }

      // Inisialisasi periode jika belum ada
      if (!existingData.activePeriod) {
        updates.activePeriod = DEFAULT_PERIOD;
        needsUpdate = true;
      }
      if (!existingData.availablePeriods || existingData.availablePeriods.length === 0) {
        updates.availablePeriods = [...DEFAULT_AVAILABLE_PERIODS];
        needsUpdate = true;
      }
       if (!existingData.role) {
        updates.role = defaultRole;
        needsUpdate = true;
      }


      if (needsUpdate && Object.keys(updates).length > 0) {
        updates.updatedAt = serverTimestamp();
        console.log('[userService] Updating existing user document with:', JSON.stringify(updates));
        await updateDoc(userDocRef, updates);
        console.log('[userService] Existing user document updated successfully.');
      } else {
        console.log('[userService] No updates needed for existing user document.');
      }
      
      const finalDocSnap = await getDoc(userDocRef); // Re-fetch to get latest data including timestamps
      const finalData = finalDocSnap.data()!;
      const createdAt = finalData.createdAt instanceof Timestamp 
                        ? finalData.createdAt.toDate().toISOString() 
                        : (existingData.createdAt instanceof Timestamp ? existingData.createdAt.toDate().toISOString() : new Date().toISOString());
      const updatedAt = finalData.updatedAt instanceof Timestamp
                        ? finalData.updatedAt.toDate().toISOString()
                        : (existingData.updatedAt instanceof Timestamp ? existingData.updatedAt.toDate().toISOString() : undefined);

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
        photoURL: firebaseUser.photoURL || null,
        role: defaultRole,
        uprId: finalUprId,
        activePeriod: DEFAULT_PERIOD,
        availablePeriods: [...DEFAULT_AVAILABLE_PERIODS],
        createdAt: serverTimestamp(),
      };
      
      console.log('[userService] Creating new user document with (SERIALIZED):', JSON.stringify(newUserDocData));
      await setDoc(userDocRef, newUserDocData);
      console.log('[userService] New user document created successfully.');
      
      // Re-fetch untuk mendapatkan timestamp yang sebenarnya
      const createdDocSnap = await getDoc(userDocRef);
      if (createdDocSnap.exists()) {
        const createdData = createdDocSnap.data();
        const createdAtTimestamp = createdData.createdAt as Timestamp; // Harusnya sudah Timestamp
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
        throw new Error("Gagal mengambil dokumen pengguna yang baru dibuat setelah penyimpanan.");
      }
    }
  } catch (error: any) {
    console.error("[userService] Error in checkAndCreateUserDocument. Message:", error.message);
    if (error.name === 'FirebaseError') {
        console.error("[userService] Firestore Error Details (JSON):", JSON.stringify(error));
    }
    // Lempar error agar bisa ditangkap oleh pemanggil (misalnya, halaman registrasi/login)
    throw new Error(`Gagal menyimpan atau memperbarui profil pengguna di database: ${error.message || String(error)}`);
  }
}

export async function updateUserProfileData(
  uid: string,
  data: Partial<Pick<AppUser, 'displayName' | 'photoURL' | 'activePeriod' | 'availablePeriods'>>
): Promise<void> {
  console.log(`[userService] updateUserProfileData called for UID: ${uid} with data:`, JSON.stringify(data));
  const userDocRef = doc(db, USERS_COLLECTION, uid);
  
  try {
    const userDocSnap = await getDoc(userDocRef);
    const updates: { [key: string]: any } = {};

    if (data.displayName !== undefined) {
      updates.displayName = data.displayName || null; // Pastikan null jika string kosong atau undefined
      updates.uprId = data.displayName || null;     // Sinkronkan uprId
    }
    if (data.photoURL !== undefined) {
      updates.photoURL = data.photoURL || null; // Pastikan null jika string kosong atau undefined
    }
    if (data.activePeriod !== undefined) {
      updates.activePeriod = data.activePeriod || DEFAULT_PERIOD;
    }
    if (data.availablePeriods !== undefined) {
      updates.availablePeriods = Array.isArray(data.availablePeriods) && data.availablePeriods.length > 0 
                                  ? data.availablePeriods 
                                  : [...DEFAULT_AVAILABLE_PERIODS];
    }
    
    if (Object.keys(updates).length === 0 && userDocSnap.exists()) {
        console.log("[userService] No changes to update for user profile.");
        return;
    }

    updates.updatedAt = serverTimestamp();

    if (userDocSnap.exists()) {
      console.log(`[userService] Updating user document for UID ${uid} with:`, JSON.stringify(updates));
      await updateDoc(userDocRef, updates);
    } else {
      // Jika dokumen tidak ada, buat dokumen baru dengan data yang diberikan + default
      console.log(`[userService] User document for UID ${uid} not found. Creating new document.`);
      const newDocData = {
        uid: uid,
        email: null, // Email tidak bisa didapatkan dari sini, perlu dari currentUser atau dibiarkan null
        displayName: updates.displayName || `Pengguna_${uid.substring(0,5)}`,
        photoURL: updates.photoURL === undefined ? null : updates.photoURL,
        role: 'userSatker', 
        uprId: updates.uprId || updates.displayName || `Pengguna_${uid.substring(0,5)}`,
        activePeriod: updates.activePeriod || DEFAULT_PERIOD,
        availablePeriods: updates.availablePeriods || [...DEFAULT_AVAILABLE_PERIODS],
        createdAt: serverTimestamp(), 
        updatedAt: serverTimestamp(),
      };
      console.log('[userService] Creating new user document (from update path) with:', JSON.stringify(newDocData));
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

    