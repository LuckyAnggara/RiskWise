
"use client";

import React, { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { Loader2 } from 'lucide-react';
import { getUserDocument, checkAndCreateUserDocument } from '@/services/userService'; // Import checkAndCreateUserDocument
import type { AppUser } from '@/lib/types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  appUser: AppUser | null;
  loading: boolean;
  refreshAppUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAppUser = useCallback(async (user: FirebaseUser | null) => {
    if (user) {
      console.log(`[AuthContext] fetchAppUser called for UID: ${user.uid}`);
      try {
        // Coba dapatkan, jika tidak ada, checkAndCreate akan membuatkan (penting untuk login pertama)
        // Untuk login berikutnya, ini akan mengambil data yang sudah ada/diupdate.
        const userDoc = await checkAndCreateUserDocument(user); // Menggunakan checkAndCreateUserDocument
        console.log(`[AuthContext] fetchAppUser: AppUser data received/created:`, userDoc ? JSON.stringify(userDoc).substring(0,200) + "..." : "null");
        setAppUser(userDoc);
      } catch (error) {
        console.error("[AuthContext] fetchAppUser: Failed to fetch/create AppUser from Firestore:", error);
        setAppUser(null);
      }
    } else {
      console.log("[AuthContext] fetchAppUser: No Firebase user, setting appUser to null.");
      setAppUser(null);
    }
  }, []);

  useEffect(() => {
    setLoading(true); // Mulai loading saat listener auth state dipasang
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("[AuthContext] onAuthStateChanged: Firebase user state changed. User:", user ? user.uid : "null");
      setCurrentUser(user);
      try {
        await fetchAppUser(user);
      } catch (error) {
        // Error during fetchAppUser already logged
        console.error("[AuthContext] onAuthStateChanged: Error during fetchAppUser call:", error);
      } finally {
        console.log("[AuthContext] onAuthStateChanged: Setting loading to false.");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [fetchAppUser]);

  const refreshAppUser = useCallback(async () => {
    if (currentUser) {
      console.log(`[AuthContext] refreshAppUser called for UID: ${currentUser.uid}`);
      setLoading(true);
      try {
        await fetchAppUser(currentUser);
      } catch (error) {
        console.error("[AuthContext] refreshAppUser: Error during fetchAppUser call:", error);
      } finally {
        console.log("[AuthContext] refreshAppUser: Setting loading to false.");
        setLoading(false);
      }
    } else {
      console.log("[AuthContext] refreshAppUser: No current user, skipping refresh.");
    }
  }, [currentUser, fetchAppUser]);
  
  if (loading) { 
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat data sesi dan profil pengguna...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ currentUser, appUser, loading, refreshAppUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

    