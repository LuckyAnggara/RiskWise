// src/services/userService.ts
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

// Fungsi internal untuk membuat profil pengguna di Firestore
async function _createUserProfileInFirestore(
  uid: string,
  email: string | null,
  displayName: string,
  photoURL: string | null,
  role: UserRole,
  uprId: string,
  activePeriod: string,
  availablePeriods: string[]
): Promise<void> {
  const userDocRef = doc(db, USERS_COLLECTION, uid);
  const newUserDocData = {
    uid: uid,
    email: email, // Sudah di-handle nullability-nya
    displayName: displayName, // Sudah di-handle nullability-nya
    photoURL: photoURL, // Sudah di-handle nullability-nya
    role: role,
    uprId: uprId, // Dari displayName
    activePeriod: activePeriod,
    availablePeriods: availablePeriods,
    createdAt: serverTimestamp(),
    // updatedAt akan di-set saat update pertama, atau bisa juga di-set di sini
  };
  console.log('[userService] _createUserProfileInFirestore: MINIMAL user document data to save:', JSON.stringify(newUserDocData));
  await setDoc(userDocRef, newUserDocData);
  console.log('[userService] _createUserProfileInFirestore: MINIMAL user document created successfully for UID:', uid);
}

// Fungsi internal untuk memperbarui profil pengguna di Firestore
async function _updateUserProfileInFirestore(
  uid: string,
  existingData: AppUser,
  finalDisplayName: string,
  photoURL: string | null,
  uprId: string // sama dengan finalDisplayName
): Promise<void> {
  const userDocRef = doc(db, USERS_COLLECTION, uid);
  const updates: Partial<AppUser> = {};
  let needsUpdate = false;

  if (finalDisplayName && existingData.displayName !== finalDisplayName) {
    updates.displayName = finalDisplayName;
    updates.uprId = finalDisplayName; // Sinkronkan uprId
    needsUpdate = true;
  }
  if (photoURL !== undefined && existingData.photoURL !== photoURL) {
    updates.photoURL = photoURL; // photoURL sudah di-handle nullability-nya
    needsUpdate = true;
  }
  // Selalu set uprId jika berbeda, karena logika UPR = displayName
  if (uprId && existingData.uprId !== uprId) {
    updates.uprId = uprId;
    needsUpdate = true;
  }
  
  // Inisialisasi periode jika belum ada di data lama (kasus pengguna lama sebelum fitur periode)
  if (!existingData.activePeriod) {
    updates.activePeriod = DEFAULT_INITIAL_PERIOD;
    needsUpdate = true;
  }
  if (!existingData.availablePeriods || existingData.availablePeriods.length === 0) {
    updates.availablePeriods = [...DEFAULT_AVAILABLE_PERIODS];
    needsUpdate = true;
  }


  if (needsUpdate && Object.keys(updates).length > 0) {
    console.log('[userService] _updateUserProfileInFirestore: Updating user document with:', JSON.stringify(updates));
    await updateDoc(userDocRef, { ...updates, updatedAt: serverTimestamp() });
    console.log('[userService] _updateUserProfileInFirestore: User document updated successfully for UID:', uid);
  } else {
    console.log('[userService] _updateUserProfileInFirestore: No updates needed for user document UID:', uid);
  }
}

export async function getUserDocument(uid: string): Promise<AppUser | null> {
  if (!uid) return null;
  console.log("[userService] getUserDocument called for UID:", uid);

  const userDocRef = doc(db, USERS_COLLECTION, uid);
  try {
    const userDocSnap = await getDoc(userDocRef);
    if (!userDocSnap.exists()) {
      console.log("[userService] getUserDocument: No document found for UID:", uid);
      return null;
    }

    const data = userDocSnap.data();
    console.log("[userService] getUserDocument: Raw data from Firestore for UID:", uid, JSON.stringify(data));

    const createdAt = data.createdAt instanceof Timestamp
      ? data.createdAt.toDate().toISOString()
      : (data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString()); // Fallback jika format tidak sesuai

    const updatedAt = data.updatedAt instanceof Timestamp
      ? data.updatedAt.toDate().toISOString()
      : (data.updatedAt ? new Date(data.updatedAt).toISOString() : undefined);

    const appUser: AppUser = {
      uid: data.uid,
      email: data.email || null,
      displayName: data.displayName || null,
      photoURL: data.photoURL === undefined ? null : data.photoURL,
      role: data.role || "userSatker",
      uprId: data.uprId || data.displayName || null, // Fallback uprId ke displayName jika uprId null
      activePeriod: data.activePeriod || DEFAULT_INITIAL_PERIOD,
      availablePeriods: (Array.isArray(data.availablePeriods) && data.availablePeriods.length > 0)
        ? data.availablePeriods
        : [...DEFAULT_AVAILABLE_PERIODS],
      createdAt,
      updatedAt,
    };
    console.log("[userService] getUserDocument: Parsed AppUser for UID:", uid, JSON.stringify(appUser));
    return appUser;
  } catch (error: any) {
    console.error("[userService] Error in getUserDocument for UID:", uid, "Message:", error.message);
    throw new Error(`Gagal mengambil data profil pengguna dari database: ${error.message || String(error)}`);
  }
}


export async function checkAndCreateUserDocument(
  firebaseUser: FirebaseUser,
  defaultRole: UserRole = 'userSatker',
  displayNameFromForm?: string | null
): Promise<AppUser | null> { // Diubah agar bisa return null jika proses gagal total
  console.log("[userService] checkAndCreateUserDocument called for UID:", firebaseUser.uid, "displayNameFromForm:", displayNameFromForm);

  // =================== BLOK DIAGNOSTIK ===================
  console.log("[userService] DIAGNOSTIC: Bypassing Firestore for checkAndCreateUserDocument. Returning mock AppUser.");
  const mockUserDisplayName = displayNameFromForm || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || `PenggunaMock_${firebaseUser.uid.substring(0,5)}`;
  const mockAppUser: AppUser = {
    uid: firebaseUser.uid,
    email: firebaseUser.email || `mock-${firebaseUser.uid.substring(0,5)}@example.com`,
    displayName: mockUserDisplayName,
    photoURL: firebaseUser.photoURL || null,
    role: defaultRole,
    uprId: mockUserDisplayName, // UPR ID sama dengan display name
    activePeriod: DEFAULT_INITIAL_PERIOD,
    availablePeriods: [...DEFAULT_AVAILABLE_PERIODS],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  console.log("[userService] DIAGNOSTIC: Mock AppUser to be returned:", JSON.stringify(mockAppUser));
  return Promise.resolve(mockAppUser);
  // ================= END BLOK DIAGNOSTIK =================

  /* // ============== KODE ASLI (DIKOMENTARI SEMENTARA) ==============
  const finalDisplayName =
    displayNameFromForm?.trim() ||
    firebaseUser.displayName ||
    firebaseUser.email?.split('@')[0] ||
    `Pengguna_${firebaseUser.uid.substring(0, 5)}`;
  
  // uprId akan sama dengan displayName
  const uprIdForUser = finalDisplayName;

  try {
    const existingUser = await getUserDocument(firebaseUser.uid);

    if (existingUser) {
      console.log('[userService] User document exists for UID:', firebaseUser.uid, 'Attempting update if necessary.');
      // Pengguna sudah ada, periksa apakah perlu update (misalnya displayName atau photoURL dari provider berubah)
      await _updateUserProfileInFirestore(
        firebaseUser.uid,
        existingUser,
        finalDisplayName,
        firebaseUser.photoURL || null,
        uprIdForUser
      );
    } else {
      console.log('[userService] No user document found for UID:', firebaseUser.uid, 'Creating new one.');
      // Pengguna belum ada, buat dokumen baru
      await _createUserProfileInFirestore(
        firebaseUser.uid,
        firebaseUser.email || null,
        finalDisplayName,
        firebaseUser.photoURL || null,
        defaultRole,
        uprIdForUser,
        DEFAULT_INITIAL_PERIOD,
        [...DEFAULT_AVAILABLE_PERIODS]
      );
    }

    // Selalu ambil data terbaru dari Firestore setelah create/update
    const appUserFromFirestore = await getUserDocument(firebaseUser.uid);
    if (!appUserFromFirestore) {
      console.error("[userService] Failed to retrieve user document after create/update for UID:", firebaseUser.uid);
      throw new Error("Gagal mengambil data profil pengguna setelah pembuatan/pembaruan.");
    }
    console.log("[userService] Successfully fetched/created AppUser for UID:", firebaseUser.uid, JSON.stringify(appUserFromFirestore));
    return appUserFromFirestore;

  } catch (error: any) {
    console.error("[userService] Critical error in checkAndCreateUserDocument for UID:", firebaseUser.uid, "Message:", error.message);
    // Jangan melempar error "Maximum call stack size exceeded" lagi
    const errorMessage = error.message && typeof error.message === 'string' ? error.message : String(error);
    throw new Error(`Gagal memproses profil pengguna di database: ${errorMessage}`);
  }
  */ // ============== END KODE ASLI (DIKOMENTARI SEMENTARA) ==============
}


export async function updateUserProfileData(
  uid: string,
  data: Partial<Pick<AppUser, "displayName" | "photoURL" | "activePeriod" | "availablePeriods">>
): Promise<void> {
  if (!uid) throw new Error("UID pengguna diperlukan untuk memperbarui profil.");
  console.log(`[userService] updateUserProfileData called for UID: ${uid} with data:`, JSON.stringify(data));

  const userDocRef = doc(db, USERS_COLLECTION, uid);
  const updates: any = {};

  if (data.displayName !== undefined) {
    updates.displayName = data.displayName || null;
    updates.uprId = data.displayName || null; // Sinkronkan uprId dengan displayName
  }
  if (data.photoURL !== undefined) {
    updates.photoURL = data.photoURL || null;
  }
  if (data.activePeriod !== undefined) {
    updates.activePeriod = data.activePeriod;
  }
  if (data.availablePeriods !== undefined) {
    updates.availablePeriods = data.availablePeriods && data.availablePeriods.length > 0 
      ? data.availablePeriods 
      : [...DEFAULT_AVAILABLE_PERIODS];
  }

  if (Object.keys(updates).length === 0) {
    console.log('[userService] No actual data changes to update for UID:', uid);
    return;
  }

  updates.updatedAt = serverTimestamp();

  try {
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      console.log('[userService] Document found for update. Applying updates for UID:', uid, JSON.stringify(updates));
      await updateDoc(userDocRef, updates);
      console.log('[userService] User profile updated successfully for UID:', uid);
    } else {
      // Jika dokumen tidak ada, buat dengan data yang diberikan + data default
      console.warn('[userService] Document not found for update. Creating new document for UID:', uid);
      const baseDisplayName = data.displayName || `Pengguna_${uid.substring(0,5)}`;
      const newUserData = {
        uid,
        email: null, // Tidak bisa kita dapatkan email dari sini
        displayName: baseDisplayName,
        photoURL: data.photoURL || null,
        role: 'userSatker' as UserRole, // Default role
        uprId: baseDisplayName,
        activePeriod: data.activePeriod || DEFAULT_INITIAL_PERIOD,
        availablePeriods: data.availablePeriods || [...DEFAULT_AVAILABLE_PERIODS],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      console.log('[userService] Data for new document during update attempt:', JSON.stringify(newUserData));
      await setDoc(userDocRef, newUserData);
      console.log('[userService] New user document created during update attempt for UID:', uid);
    }
  } catch (error: any) {
    console.error("[userService] Error updating user profile data in Firestore. Message:", error.message);
    const errorMessage = error.message && typeof error.message === 'string' ? error.message : String(error);
    throw new Error(`Gagal memperbarui data profil pengguna: ${errorMessage}`);
  }
}
