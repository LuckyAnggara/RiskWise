
// src/services/userService.ts
"use server";

import { db } from '@/lib/firebase/config';
import type { AppUser, UserRole } from '@/lib/types';
import { USERS_COLLECTION } from './collectionNames';
import { Timestamp, serverTimestamp, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';

const DEFAULT_INITIAL_PERIOD = new Date().getFullYear().toString();

// Fungsi internal untuk membuat profil pengguna baru di Firestore
async function _createUserProfileInFirestore(
  firebaseUser: FirebaseUser,
  finalDisplayName: string | null, // Bisa null jika belum diset dari form registrasi
  defaultRole: UserRole
): Promise<void> {
  const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
  const newUserDocData = {
    uid: firebaseUser.uid,
    email: firebaseUser.email || null,
    displayName: finalDisplayName, // Akan diisi di halaman setup profil
    photoURL: firebaseUser.photoURL || null,
    role: defaultRole,
    uprId: null, // Akan diisi di halaman setup profil, disamakan dengan displayName
    activePeriod: null, // Akan diisi di halaman setup profil
    availablePeriods: [], // Akan diisi di halaman setup profil
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(), // Set updatedAt juga saat create
  };
  console.log('[userService] _createUserProfileInFirestore: Creating new user document with initial (potentially incomplete) data:', JSON.stringify(newUserDocData));
  await setDoc(userDocRef, newUserDocData);
  console.log('[userService] _createUserProfileInFirestore: New user document created successfully for UID:', firebaseUser.uid);
}

// Fungsi internal untuk memperbarui profil pengguna yang ada di Firestore
async function _updateUserProfileInFirestore(
  userDocRef: any, // Firestore DocRef
  existingData: AppUser,
  firebaseUser: FirebaseUser,
  finalDisplayName: string | null // Bisa jadi dari form registrasi atau Firebase Auth
): Promise<boolean> {
  const updates: Partial<Omit<AppUser, 'uid' | 'role' | 'createdAt'>> = {};
  let needsUpdate = false;

  // Update displayName dan uprId jika ada perubahan dari Firebase Auth (misal login Google dengan nama baru)
  // atau jika ini adalah bagian dari alur setup profil di mana displayName baru diisi.
  // Untuk kasus di mana finalDisplayName adalah null (setelah registrasi awal email/pass),
  // kita tidak ingin menimpa displayName yang mungkin sudah ada.
  if (finalDisplayName && existingData.displayName !== finalDisplayName) {
    updates.displayName = finalDisplayName;
    updates.uprId = finalDisplayName; // uprId = displayName
    needsUpdate = true;
  }

  if (firebaseUser.photoURL !== undefined && existingData.photoURL !== firebaseUser.photoURL) {
    updates.photoURL = firebaseUser.photoURL || null;
    needsUpdate = true;
  }

  if (needsUpdate) {
    updates.updatedAt = serverTimestamp();
    console.log('[userService] _updateUserProfileInFirestore: Updating existing user document for UID:', firebaseUser.uid, 'with:', JSON.stringify(updates));
    await updateDoc(userDocRef, updates);
    console.log('[userService] _updateUserProfileInFirestore: User document updated successfully for UID:', firebaseUser.uid);
    return true; // Menandakan ada update
  }
  return false; // Tidak ada update
}

export async function checkAndCreateUserDocument(
  firebaseUser: FirebaseUser,
  defaultRole: UserRole = 'userSatker',
  // displayNameFromForm adalah nama lengkap dari form registrasi email/pass
  // atau bisa juga nama UPR dari halaman profile-setup
  displayNameFromForm?: string | null 
): Promise<AppUser> {
  console.log("[userService] checkAndCreateUserDocument called for UID:", firebaseUser.uid, "with displayNameFromForm:", displayNameFromForm);
  const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);

  try {
    const existingUserDocSnap = await getDoc(userDocRef);

    // Prioritaskan displayNameFromForm jika ada (dari registrasi atau profile setup)
    // Jika tidak, gunakan dari firebaseUser (Google), lalu email, lalu default
    const finalDisplayName = displayNameFromForm || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || `Pengguna_${firebaseUser.uid.substring(0, 5)}`;

    if (!existingUserDocSnap.exists()) {
      // Pengguna baru, buat dokumen dengan state "incomplete" untuk displayName, uprId, activePeriod
      await _createUserProfileInFirestore(firebaseUser, null, defaultRole);
    } else {
      // Pengguna sudah ada, periksa apakah perlu update (misal photoURL dari Google berubah)
      // atau jika ini adalah pemanggilan dari halaman profile-setup
      // Dalam kasus ini, displayNameFromForm akan berisi nama UPR/Lengkap baru.
      // _updateUserProfileInFirestore akan menangani logika jika displayNameFromForm ada dan berbeda.
      await _updateUserProfileInFirestore(userDocRef, existingUserDocSnap.data() as AppUser, firebaseUser, displayNameFromForm || existingUserDocSnap.data().displayName);
    }

    // Selalu ambil data terbaru setelah create/update
    const finalUserDoc = await getUserDocument(firebaseUser.uid);
    if (!finalUserDoc) {
      // Ini seharusnya tidak terjadi jika create/update berhasil
      console.error("[userService] checkAndCreateUserDocument: Failed to retrieve user document after create/update for UID:", firebaseUser.uid);
      throw new Error("Gagal memuat data profil pengguna setelah pembuatan/pembaruan.");
    }
    console.log("[userService] checkAndCreateUserDocument: Successfully fetched/created/updated user document for UID:", firebaseUser.uid, "Data:", JSON.stringify(finalUserDoc));
    return finalUserDoc;

  } catch (error: any) {
    console.error("[userService] Error in checkAndCreateUserDocument for UID:", firebaseUser.uid, "Message:", error.message);
    if (error.name === 'FirebaseError') {
        console.error("[userService] Firestore Error Details:", JSON.stringify(error));
    }
    throw new Error(`Gagal memproses profil pengguna di database: ${error.message || String(error)}`);
  }
}

export async function getUserDocument(uid: string): Promise<AppUser | null> {
  if (!uid) {
    console.warn("[userService] getUserDocument: Called with no UID.");
    return null;
  }
  const userDocRef = doc(db, USERS_COLLECTION, uid);
  console.log(`[userService] getUserDocument: Attempting to fetch document for UID: ${uid}`);
  try {
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString());
      const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : (typeof data.updatedAt === 'string' ? data.updatedAt : undefined);
      
      const appUser: AppUser = {
        uid: data.uid,
        email: data.email || null,
        displayName: data.displayName || null,
        photoURL: data.photoURL || null,
        role: data.role || 'userSatker',
        uprId: data.uprId || null,
        activePeriod: data.activePeriod || null,
        availablePeriods: Array.isArray(data.availablePeriods) ? data.availablePeriods : [],
        createdAt,
        updatedAt,
      };
      console.log(`[userService] getUserDocument: Document found for UID: ${uid}`, appUser);
      return appUser;
    } else {
      console.log(`[userService] getUserDocument: No document found for UID: ${uid}`);
      return null;
    }
  } catch (error: any) {
    console.error(`[userService] getUserDocument: Error fetching user document for UID ${uid}:`, error.message);
    throw error; // Re-throw error agar bisa ditangani oleh pemanggil
  }
}

export async function updateUserProfileData(
  uid: string,
  data: Partial<Pick<AppUser, 'displayName' | 'photoURL' | 'activePeriod' | 'availablePeriods'>>
): Promise<void> {
  console.log(`[userService] updateUserProfileData called for UID: ${uid} with data:`, JSON.stringify(data));
  if (!uid) {
    throw new Error("UID pengguna tidak valid untuk memperbarui profil.");
  }
  const userDocRef = doc(db, USERS_COLLECTION, uid);
  
  try {
    const userDocSnap = await getDoc(userDocRef);
    const updates: { [key: string]: any } = {};

    if (data.displayName !== undefined) {
      updates.displayName = data.displayName || null;
      updates.uprId = data.displayName || null; // Sinkronkan uprId dengan displayName
    }
    if (data.photoURL !== undefined) { // Jarang diubah dari settings page, tapi jaga-jaga
      updates.photoURL = data.photoURL || null;
    }
    if (data.activePeriod !== undefined) {
      updates.activePeriod = data.activePeriod || null;
    }
    if (data.availablePeriods !== undefined) {
      updates.availablePeriods = Array.isArray(data.availablePeriods) ? data.availablePeriods : [];
    }
    
    if (Object.keys(updates).length === 0) {
      console.log("[userService] updateUserProfileData: No changes to update for user profile for UID:", uid);
      return;
    }
    
    updates.updatedAt = serverTimestamp();

    if (userDocSnap.exists()) {
      console.log(`[userService] updateUserProfileData: Attempting to update user document for UID ${uid} with:`, JSON.stringify(updates));
      await updateDoc(userDocRef, updates);
    } else {
      // Seharusnya tidak terjadi jika alur registrasi/login berjalan benar, tapi sebagai fallback
      console.warn(`[userService] updateUserProfileData: User document for UID ${uid} not found. Creating new document instead (minimal).`);
      const newDocData = {
        uid: uid,
        email: null, // Tidak bisa didapatkan dari sini
        displayName: data.displayName || `Pengguna_${uid.substring(0,5)}`,
        photoURL: data.photoURL || null,
        role: 'userSatker', 
        uprId: data.displayName || `Pengguna_${uid.substring(0,5)}`,
        activePeriod: data.activePeriod || DEFAULT_INITIAL_PERIOD,
        availablePeriods: data.availablePeriods || [DEFAULT_INITIAL_PERIOD],
        createdAt: serverTimestamp(), 
        updatedAt: serverTimestamp(),
      };
      console.log('[userService] updateUserProfileData: Attempting to create new user document (from update path, minimal) for UID:', uid, 'with:', JSON.stringify(newDocData));
      await setDoc(userDocRef, newDocData);
    }
    console.log(`[userService] updateUserProfileData: User document updated/created successfully for UID ${uid}.`);
  } catch (error: any) {
    console.error("[userService] updateUserProfileData: Error updating/creating user profile data in Firestore for UID:", uid, "Message:", error.message);
    if (error.name === 'FirebaseError') {
        console.error("[userService] FirebaseError Details:", JSON.stringify(error));
    }
    throw new Error(`Gagal memperbarui data profil pengguna: ${error.message || String(error)}`);
  }
}
