
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
import type { AppUser, UserRole, MonitoringSettings } from "@/lib/types"; // Impor MonitoringSettings

const DEFAULT_INITIAL_PERIOD = new Date().getFullYear().toString();
const DEFAULT_AVAILABLE_PERIODS = [
  (new Date().getFullYear() - 1).toString(),
  DEFAULT_INITIAL_PERIOD,
  (new Date().getFullYear() + 1).toString(),
];
const DEFAULT_RISK_APPETITE = 5;
const DEFAULT_MONITORING_SETTINGS: MonitoringSettings = { defaultFrequency: null };

async function _createUserProfileInFirestore(
  firebaseUser: FirebaseUser,
  displayNameFromForm?: string, // Nama lengkap dari form registrasi
  defaultRole: UserRole = 'userSatker'
): Promise<AppUser> {
  console.log("[userService] _createUserProfileInFirestore: Creating profile for UID:", firebaseUser.uid);
  const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);

  const finalDisplayName = displayNameFromForm || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || `Pengguna_${firebaseUser.uid.substring(0, 5)}`;

  const newUserDocData: Omit<AppUser, 'createdAt' | 'updatedAt'> & { createdAt: any, updatedAt?: any } = {
    uid: firebaseUser.uid,
    email: firebaseUser.email || null,
    displayName: finalDisplayName,
    photoURL: firebaseUser.photoURL || null,
    role: defaultRole,
    uprId: finalDisplayName, // Sesuai model: 1 pengguna = 1 UPR, nama UPR = nama pengguna
    activePeriod: null,      // Diisi saat setup profil
    availablePeriods: [],    // Diisi saat setup profil
    riskAppetite: DEFAULT_RISK_APPETITE, // Default risk appetite
    monitoringSettings: DEFAULT_MONITORING_SETTINGS, // Default monitoring settings
    createdAt: serverTimestamp(),
  };
  
  console.log('[userService] _createUserProfileInFirestore: New user document data to save:', JSON.stringify(newUserDocData));
  await setDoc(userDocRef, newUserDocData);
  console.log('[userService] _createUserProfileInFirestore: New user document created successfully.');

  // Fetch the just-created document to get server timestamps converted
  const savedDoc = await getDoc(userDocRef);
  if (!savedDoc.exists()) {
    throw new Error("Failed to fetch newly created user document to confirm creation.");
  }
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
    monitoringSettings: data.monitoringSettings || DEFAULT_MONITORING_SETTINGS,
    createdAt: (data.createdAt as Timestamp).toDate().toISOString(), // Convert Timestamp
    updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate().toISOString() : undefined,
  } as AppUser;
}

async function _updateUserProfileInFirestore(
  userDocRef: ReturnType<typeof doc>,
  existingData: AppUser,
  firebaseUser: FirebaseUser,
  displayNameFromForm?: string
): Promise<boolean> { // Return true if an update was made
  const updates: Partial<AppUser> & { updatedAt?: any } = {};
  let needsUpdate = false;

  const finalDisplayName = displayNameFromForm || firebaseUser.displayName || existingData.displayName || firebaseUser.email?.split('@')[0] || `Pengguna_${firebaseUser.uid.substring(0, 5)}`;

  if (finalDisplayName && existingData.displayName !== finalDisplayName) {
    updates.displayName = finalDisplayName;
    updates.uprId = finalDisplayName; 
    needsUpdate = true;
  }
  if (firebaseUser.photoURL !== undefined && existingData.photoURL !== firebaseUser.photoURL) {
    updates.photoURL = firebaseUser.photoURL || null;
    needsUpdate = true;
  }

  // These fields are typically set during profile setup, not just auth change
  // but we ensure they exist with defaults if they are missing from an old document
  if (existingData.activePeriod === undefined) updates.activePeriod = null;
  if (existingData.availablePeriods === undefined) updates.availablePeriods = [];
  if (existingData.riskAppetite === undefined) updates.riskAppetite = DEFAULT_RISK_APPETITE;
  if (existingData.monitoringSettings === undefined) updates.monitoringSettings = DEFAULT_MONITORING_SETTINGS;


  if (needsUpdate && Object.keys(updates).length > 0) {
    updates.updatedAt = serverTimestamp();
    console.log('[userService] _updateUserProfileInFirestore: Updating user document with:', JSON.stringify(updates));
    await updateDoc(userDocRef, updates);
    console.log('[userService] _updateUserProfileInFirestore: User document updated successfully.');
    return true;
  }
  console.log('[userService] _updateUserProfileInFirestore: No updates needed for displayName or photoURL from FirebaseUser.');
  return false;
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
      console.log("[userService] getUserDocument: Document found for UID:", uid, JSON.stringify(data));
      const createdAt = data.createdAt instanceof Timestamp
                        ? data.createdAt.toDate().toISOString()
                        : (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString()); // Fallback
      const updatedAt = data.updatedAt instanceof Timestamp
                        ? data.updatedAt.toDate().toISOString()
                        : (typeof data.updatedAt === 'string' ? data.updatedAt : undefined);
      
      return {
        uid: data.uid,
        email: data.email || null,
        displayName: data.displayName || null,
        photoURL: data.photoURL === undefined ? null : data.photoURL,
        role: data.role || 'userSatker',
        uprId: data.uprId || data.displayName || null, 
        activePeriod: data.activePeriod || null, // Default to null if not set
        availablePeriods: Array.isArray(data.availablePeriods) ? data.availablePeriods : [], // Default to empty array
        riskAppetite: (typeof data.riskAppetite === 'number') ? data.riskAppetite : DEFAULT_RISK_APPETITE,
        monitoringSettings: data.monitoringSettings || DEFAULT_MONITORING_SETTINGS,
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
): Promise<AppUser> {
  console.log(`[userService] checkAndCreateUserDocument: Called for UID: ${firebaseUser.uid}, displayNameFromForm: ${displayNameFromForm}`);
  
  try {
    let appUser = await getUserDocument(firebaseUser.uid);

    if (!appUser) {
      console.log(`[userService] checkAndCreateUserDocument: User document not found for UID ${firebaseUser.uid}, creating new one.`);
      appUser = await _createUserProfileInFirestore(firebaseUser, displayNameFromForm, defaultRole);
    } else {
      console.log(`[userService] checkAndCreateUserDocument: User document found for UID ${firebaseUser.uid}. Checking for Auth profile updates.`);
      const wasUpdated = await _updateUserProfileInFirestore(doc(db, USERS_COLLECTION, firebaseUser.uid), appUser, firebaseUser, displayNameFromForm);
      if (wasUpdated) {
        appUser = await getUserDocument(firebaseUser.uid); // Re-fetch to get latest data if Firestore profile was updated
        if (!appUser) throw new Error("Failed to re-fetch AppUser after auth profile update.");
      }
    }
    
    console.log("[userService] checkAndCreateUserDocument: Returning AppUser:", JSON.stringify(appUser));
    return appUser;

  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error("[userService] checkAndCreateUserDocument: Error processing user document for UID:", firebaseUser.uid, "Error:", errorMessage);
    // Log a more detailed error if it's a FirebaseError for better debugging
    if (error.name === 'FirebaseError') {
        console.error("[userService] Firebase Error Details:", JSON.stringify(error));
    }
    throw new Error(`Gagal memproses dokumen pengguna: ${errorMessage}`);
  }
}

export async function updateUserProfileData(
  uid: string,
  data: Partial<Pick<AppUser, "displayName" | "photoURL" | "activePeriod" | "availablePeriods" | "riskAppetite" | "monitoringSettings" >>
): Promise<void> {
  if (!uid) throw new Error("UID pengguna diperlukan untuk memperbarui profil.");
  console.log(`[userService] updateUserProfileData: Called for UID: ${uid} with data:`, JSON.stringify(data));

  const userDocRef = doc(db, USERS_COLLECTION, uid);
  const updates: Partial<AppUser> & { updatedAt?: any } = {};

  // Explicitly handle each field to avoid undefined issues
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
    updates.riskAppetite = (data.riskAppetite === null || isNaN(Number(data.riskAppetite))) ? DEFAULT_RISK_APPETITE : Number(data.riskAppetite);
  }
  if (data.monitoringSettings !== undefined) {
    updates.monitoringSettings = data.monitoringSettings || DEFAULT_MONITORING_SETTINGS;
  }


  if (Object.keys(updates).length === 0) {
    console.log('[userService] updateUserProfileData: No actual changes to update for UID:', uid);
    return;
  }

  updates.updatedAt = serverTimestamp();
  console.log('[userService] updateUserProfileData: Updates to be applied:', JSON.stringify(updates));

  try {
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      console.log('[userService] updateUserProfileData: Updating existing user document.');
      await updateDoc(userDocRef, updates);
    } else {
      console.log('[userService] updateUserProfileData: User document not found, creating new one with profile setup data.');
      const firebaseUser = (await import('firebase/auth')).getAuth().currentUser; // Get current auth user for email
      const createData: Partial<AppUser> & {uid: string, createdAt: any, role: UserRole} = {
        uid,
        email: firebaseUser?.email || null,
        role: 'userSatker', 
        createdAt: serverTimestamp(),
        ...updates 
      };
      await setDoc(userDocRef, createData);
    }
    console.log('[userService] updateUserProfileData: User document updated/created successfully for UID:', uid);
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error("[userService] Error updating/creating user profile data in Firestore for UID:", uid, "Message:", errorMessage);
    if (error.name === 'FirebaseError') {
        console.error("[userService] Firebase Error Details on update/create:", JSON.stringify(error));
    }
    throw new Error(`Gagal memperbarui data profil pengguna: ${errorMessage}`);
  }
}
