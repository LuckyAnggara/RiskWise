
"use server";

import { db } from "@/lib/firebase/config";
import { USERS_COLLECTION } from "./collectionNames";
import {
  Timestamp,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import type { User as FirebaseUser } from "firebase/auth";
import type { AppUser, UserRole } from "@/lib/types";

const DEFAULT_INITIAL_PERIOD = new Date().getFullYear().toString();
const DEFAULT_AVAILABLE_PERIODS = [
  (new Date().getFullYear() - 1).toString(),
  DEFAULT_INITIAL_PERIOD,
  (new Date().getFullYear() + 1).toString(),
];
const DEFAULT_RISK_APPETITE = 5;

async function _createUserProfileInFirestore(
  firebaseUser: FirebaseUser,
  displayNameFromForm: string | undefined,
  defaultRole: UserRole
): Promise<AppUser> {
  console.log("[userService] _createUserProfileInFirestore: Creating MINIMAL profile for UID:", firebaseUser.uid);
  const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);

  const finalDisplayName = displayNameFromForm || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || `Pengguna_${firebaseUser.uid.substring(0, 5)}`;

  const newUserDocData = {
    uid: firebaseUser.uid,
    email: firebaseUser.email || null,
    displayName: finalDisplayName,
    photoURL: firebaseUser.photoURL || null,
    role: defaultRole,
    uprId: finalDisplayName, // uprId adalah displayName
    activePeriod: null, // Profil awal belum lengkap
    availablePeriods: [], // Profil awal belum lengkap
    riskAppetite: DEFAULT_RISK_APPETITE, // Default risk appetite
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  console.log("[userService] _createUserProfileInFirestore: MINIMAL user document data to save:", JSON.stringify(newUserDocData));
  try {
    await setDoc(userDocRef, newUserDocData);
    console.log("[userService] _createUserProfileInFirestore: MINIMAL user document created successfully for UID:", firebaseUser.uid);
    
    // Fetch the just-created document to get server timestamps
    const savedDoc = await getDoc(userDocRef);
    if (savedDoc.exists()) {
      const data = savedDoc.data();
      return {
        uid: data.uid,
        email: data.email,
        displayName: data.displayName,
        photoURL: data.photoURL,
        role: data.role,
        uprId: data.uprId,
        activePeriod: data.activePeriod,
        availablePeriods: data.availablePeriods,
        riskAppetite: data.riskAppetite,
        createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
        updatedAt: (data.updatedAt as Timestamp).toDate().toISOString(),
      } as AppUser;
    } else {
      throw new Error("Failed to fetch newly created user document.");
    }
  } catch (error: any) {
    console.error("[userService] _createUserProfileInFirestore: Error saving minimal user document:", error.message || String(error));
    throw error; // Re-throw to be caught by checkAndCreateUserDocument
  }
}

async function _updateUserProfileInFirestore(
  userDocRef: ReturnType<typeof doc>,
  existingData: AppUser,
  firebaseUser: FirebaseUser,
  displayNameFromForm?: string
): Promise<Partial<AppUser> | null> {
  const updates: Partial<AppUser> = {};
  let needsUpdate = false;

  const finalDisplayName = displayNameFromForm || firebaseUser.displayName || existingData.displayName || firebaseUser.email?.split('@')[0] || `Pengguna_${firebaseUser.uid.substring(0, 5)}`;

  if (finalDisplayName && existingData.displayName !== finalDisplayName) {
    updates.displayName = finalDisplayName;
    updates.uprId = finalDisplayName; // Keep uprId in sync
    needsUpdate = true;
  }
  if (firebaseUser.photoURL && existingData.photoURL !== firebaseUser.photoURL) {
    updates.photoURL = firebaseUser.photoURL;
    needsUpdate = true;
  } else if (!firebaseUser.photoURL && existingData.photoURL !== null) {
    updates.photoURL = null;
    needsUpdate = true;
  }

  // Initialize period fields if they are missing (e.g., for users created before this logic)
  if (!existingData.activePeriod && !updates.activePeriod) {
      updates.activePeriod = DEFAULT_INITIAL_PERIOD;
      needsUpdate = true;
  }
  if ((!existingData.availablePeriods || existingData.availablePeriods.length === 0) && !updates.availablePeriods) {
      updates.availablePeriods = [...DEFAULT_AVAILABLE_PERIODS];
      needsUpdate = true;
  }
  if (existingData.riskAppetite === null && existingData.riskAppetite === undefined && !updates.riskAppetite) {
      updates.riskAppetite = DEFAULT_RISK_APPETITE;
      needsUpdate = true;
  }


  if (needsUpdate && Object.keys(updates).length > 0) {
    updates.updatedAt = serverTimestamp() as any; // Firestore will convert this
    console.log('[userService] _updateUserProfileInFirestore: Updating user document with:', JSON.stringify(updates));
    try {
      await updateDoc(userDocRef, updates);
      console.log('[userService] _updateUserProfileInFirestore: User document updated successfully.');
      return updates; // Return the updates made
    } catch (error: any) {
      console.error("[userService] _updateUserProfileInFirestore: Error updating user document:", error.message || String(error));
      throw error; // Re-throw
    }
  }
  return null; // No updates were needed
}

export async function getUserDocument(uid: string): Promise<AppUser | null> {
  if (!uid) {
    console.warn("[userService] getUserDocument: UID is missing.");
    return null;
  }
  console.log("[userService] getUserDocument: Attempting to fetch user document for UID:", uid);
  const userDocRef = doc(db, USERS_COLLECTION, uid);
  try {
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log("[userService] getUserDocument: Document found for UID:", uid);
      const createdAt = data.createdAt instanceof Timestamp
                        ? data.createdAt.toDate().toISOString()
                        : (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString());
      const updatedAt = data.updatedAt instanceof Timestamp
                        ? data.updatedAt.toDate().toISOString()
                        : (typeof data.updatedAt === 'string' ? data.updatedAt : undefined);
      
      return {
        uid: data.uid,
        email: data.email || null,
        displayName: data.displayName || null,
        photoURL: data.photoURL || null,
        role: data.role || 'userSatker',
        uprId: data.uprId || data.displayName || null, // Fallback uprId to displayName if missing
        activePeriod: data.activePeriod || DEFAULT_INITIAL_PERIOD,
        availablePeriods: Array.isArray(data.availablePeriods) && data.availablePeriods.length > 0 ? data.availablePeriods : [...DEFAULT_AVAILABLE_PERIODS],
        riskAppetite: (typeof data.riskAppetite === 'number') ? data.riskAppetite : DEFAULT_RISK_APPETITE,
        createdAt,
        updatedAt,
      } as AppUser;
    } else {
      console.log("[userService] getUserDocument: No document found for UID:", uid);
      return null;
    }
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error("[userService] Error fetching user document for UID:", uid, "Error:", errorMessage);
    throw new Error(`Gagal mengambil data pengguna dari database: ${errorMessage}`);
  }
}

export async function checkAndCreateUserDocument(
  firebaseUser: FirebaseUser,
  defaultRole: UserRole = 'userSatker',
  displayNameFromForm?: string
): Promise<AppUser | null > {
  console.log(`[userService] checkAndCreateUserDocument: Called for UID: ${firebaseUser.uid}, displayNameFromForm: ${displayNameFromForm}`);
  const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);

  try {
    let appUser = await getUserDocument(firebaseUser.uid);

    if (!appUser) {
      console.log(`[userService] checkAndCreateUserDocument: User document not found for UID ${firebaseUser.uid}, creating new one.`);
      appUser = await _createUserProfileInFirestore(firebaseUser, displayNameFromForm, defaultRole);
    } else {
      console.log(`[userService] checkAndCreateUserDocument: User document found for UID ${firebaseUser.uid}. Checking for updates.`);
      await _updateUserProfileInFirestore(userDocRef, appUser, firebaseUser, displayNameFromForm);
      // Re-fetch after potential update to get the latest data including server-generated timestamps
      appUser = await getUserDocument(firebaseUser.uid);
    }
    
    if (!appUser) { // Should not happen if create/update is successful and getUserDocument works
        console.error(`[userService] checkAndCreateUserDocument: AppUser is still null after create/update attempt for UID ${firebaseUser.uid}. This is unexpected.`);
        throw new Error("Gagal memuat profil pengguna setelah pembuatan/pembaruan.");
    }
    console.log("[userService] checkAndCreateUserDocument: Returning AppUser:", JSON.stringify(appUser));
    return appUser;

  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error("[userService] checkAndCreateUserDocument: Error processing user document for UID:", firebaseUser.uid, "Error:", errorMessage);
    throw new Error(`Gagal memproses dokumen pengguna: ${errorMessage}`);
  }
}

export async function updateUserProfileData(
  uid: string,
  data: Partial<Pick<AppUser, "displayName" | "photoURL" | "activePeriod" | "availablePeriods" | "riskAppetite">>
): Promise<void> {
  if (!uid) throw new Error("UID pengguna diperlukan untuk memperbarui profil.");
  console.log(`[userService] updateUserProfileData: Called for UID: ${uid} with data:`, JSON.stringify(data));

  const userDocRef = doc(db, USERS_COLLECTION, uid);
  const updates: Partial<AppUser> & { updatedAt?: any } = {};

  if (data.displayName !== undefined) {
    updates.displayName = data.displayName || null;
    updates.uprId = data.displayName || null; // Sinkronkan uprId
  }
  if (data.photoURL !== undefined) {
    updates.photoURL = data.photoURL || null;
  }
  if (data.activePeriod !== undefined) {
    updates.activePeriod = data.activePeriod || null;
  }
  if (data.availablePeriods !== undefined) {
    updates.availablePeriods = Array.isArray(data.availablePeriods) ? data.availablePeriods : [];
  }
  if (data.riskAppetite !== undefined) {
    updates.riskAppetite = (data.riskAppetite === null || isNaN(Number(data.riskAppetite))) ? null : Number(data.riskAppetite);
  }


  if (Object.keys(updates).length === 0) {
    console.log('[userService] updateUserProfileData: No actual changes to update for UID:', uid);
    return;
  }

  updates.updatedAt = serverTimestamp();

  try {
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      console.log('[userService] updateUserProfileData: Updating existing user document with:', JSON.stringify(updates));
      await updateDoc(userDocRef, updates);
    } else {
      console.log('[userService] updateUserProfileData: User document not found for update, creating new one with data (should ideally happen via profile setup flow):', JSON.stringify(updates));
      // Ini adalah fallback, idealnya pengguna baru akan melalui alur /profile-setup
      // yang mana updateUserProfileData di halaman itu akan memanggil ini
      // dan kita perlu data esensial seperti email dan role jika ini adalah pembuatan pertama
      const firebaseUser = (await import('firebase/auth')).getAuth().currentUser;
      const email = firebaseUser?.email || null;
      const createData: Partial<AppUser> & {uid: string, createdAt: any, role: UserRole} = {
        uid,
        email,
        role: 'userSatker', // Default role jika membuat dari sini
        createdAt: serverTimestamp(),
        ...updates // Gabungkan dengan update yang diminta
      };
      await setDoc(userDocRef, createData);
    }
    console.log('[userService] updateUserProfileData: User document updated/created successfully for UID:', uid);
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error("[userService] Error updating/creating user profile data in Firestore for UID:", uid, "Message:", errorMessage);
    throw new Error(`Gagal memperbarui data profil pengguna: ${errorMessage}`);
  }
}
