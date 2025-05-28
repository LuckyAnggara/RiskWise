
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
      status: newDocData.status as MonitoringSession['status'],
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
      where("period", "==", period), 
      orderBy("endDate", "desc") 
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
    console.error("Error getting monitoring sessions from Firestore: ", error.message, error.code, error);
    let detailedErrorMessage = "Gagal mengambil daftar sesi pemantauan.";
    if (error.code === 'failed-precondition') {
      detailedErrorMessage += " Ini mungkin karena indeks komposit yang hilang. Periksa Firebase Console (Firestore Database > Indexes) dan buat indeks yang disarankan.";
    } else {
      detailedErrorMessage += ` Pesan: ${errorMessage}`;
    }
    throw new Error(detailedErrorMessage);
  }
}

export async function getMonitoringSessionById(sessionId: string, userId: string, period: string): Promise<MonitoringSession | null> {
  if (!sessionId || !userId || !period) {
    console.warn("[monitoringService] getMonitoringSessionById: sessionId, userId, or period is missing.", { sessionId, userId, period });
    return null;
  }
  try {
    const docRef = doc(db, MONITORING_SESSIONS_COLLECTION, sessionId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.userId !== userId || data.period !== period) {
        console.warn(`[monitoringService] MonitoringSession ${sessionId} found, but does not match current user/period context. Expected User: ${userId}, Period: ${period}. Found: User: ${data.userId}, Period: ${data.period}`);
        return null; // Atau throw error
      }
      const createdAtTimestamp = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt);
      const updatedAtTimestamp = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : null);

      return {
        id: docSnap.id,
        ...data,
        createdAt: createdAtTimestamp.toISOString(),
        updatedAt: updatedAtTimestamp ? updatedAtTimestamp.toISOString() : undefined,
      } as MonitoringSession;
    } else {
      console.warn(`[monitoringService] MonitoringSession with ID ${sessionId} not found.`);
      return null;
    }
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error(`[monitoringService] Error getting monitoring session by ID ${sessionId} from Firestore: `, errorMessage);
    throw new Error(`Gagal mengambil detail sesi pemantauan. Pesan: ${errorMessage}`);
  }
}
