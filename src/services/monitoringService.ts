
"use server";

import { db } from '@/lib/firebase/config';
import type { MonitoringSession } from '@/lib/types';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
  doc,
  getDoc,
} from 'firebase/firestore';
import { MONITORING_SESSIONS_COLLECTION } from './collectionNames';

export async function addMonitoringSession(
  data: Omit<MonitoringSession, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'period'>,
  userId: string,
  period: string // Periode aplikasi saat sesi ini dibuat
): Promise<MonitoringSession> {
  if (!userId || !period) {
    console.error("Error in addMonitoringSession: userId or period is missing.", { userId, period });
    throw new Error("User ID atau Periode aplikasi tidak valid untuk memulai sesi pemantauan.");
  }
  if (!data.name || !data.startDate || !data.endDate) {
    console.error("Error in addMonitoringSession: name, startDate, or endDate is missing.", data);
    throw new Error("Nama periode pemantauan, tanggal mulai, dan tanggal selesai harus diisi.");
  }

  try {
    const docDataToSave = {
      ...data,
      userId,
      period,
      status: data.status || 'Aktif', // Default status
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    console.log("[monitoringService] Data to add MonitoringSession:", JSON.stringify(docDataToSave, null, 2));
    const docRef = await addDoc(collection(db, MONITORING_SESSIONS_COLLECTION), docDataToSave);

    const newDocSnap = await getDoc(docRef);
    if (!newDocSnap.exists()) {
      throw new Error("Gagal mengambil dokumen sesi pemantauan yang baru dibuat.");
    }
    const newDocData = newDocSnap.data();
    const createdAtTimestamp = newDocData.createdAt instanceof Timestamp ? newDocData.createdAt.toDate() : new Date();
    const updatedAtTimestamp = newDocData.updatedAt instanceof Timestamp ? newDocData.updatedAt.toDate() : new Date();

    return {
      id: docRef.id,
      ...data,
      userId,
      period,
      status: newDocData.status,
      createdAt: createdAtTimestamp.toISOString(),
      updatedAt: updatedAtTimestamp.toISOString(),
    } as MonitoringSession;

  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error("Error adding monitoring session to Firestore: ", errorMessage);
    throw new Error(`Gagal menambahkan sesi pemantauan ke database. Pesan: ${errorMessage}`);
  }
}

export async function getMonitoringSessions(userId: string, period: string): Promise<MonitoringSession[]> {
  if (!userId || !period) {
    console.warn("[monitoringService] getMonitoringSessions: userId or period is missing.", { userId, period });
    return [];
  }
  try {
    const q = query(
      collection(db, MONITORING_SESSIONS_COLLECTION),
      where("userId", "==", userId),
      where("period", "==", period), // Menyaring berdasarkan periode aplikasi
      orderBy("endDate", "desc") // Menampilkan yang terbaru di atas
    );
    const querySnapshot = await getDocs(q);
    const sessions: MonitoringSession[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const createdAtTimestamp = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date());
      const updatedAtTimestamp = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : null);
      
      sessions.push({
        id: docSnap.id,
        ...data,
        createdAt: createdAtTimestamp.toISOString(),
        updatedAt: updatedAtTimestamp ? updatedAtTimestamp.toISOString() : undefined,
      } as MonitoringSession);
    });
    console.log(`[monitoringService] Fetched ${sessions.length} monitoring sessions for user ${userId}, period ${period}.`);
    return sessions;
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error("Error getting monitoring sessions from Firestore: ", errorMessage);
    let detailedErrorMessage = "Gagal mengambil daftar sesi pemantauan.";
    if (error.code === 'failed-precondition') {
      detailedErrorMessage += " Ini mungkin karena indeks komposit yang hilang. Periksa Firebase Console.";
    } else {
      detailedErrorMessage += ` Pesan: ${errorMessage}`;
    }
    throw new Error(detailedErrorMessage);
  }
}

// Fungsi update dan delete bisa ditambahkan di sini nanti jika diperlukan
