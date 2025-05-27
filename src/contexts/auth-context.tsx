// src/contexts/auth-context.tsx
"use client";

import React, { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { Loader2 } from 'lucide-react';
import { checkAndCreateUserDocument, getUserDocument } from '@/services/userService';
import type { AppUser } from '@/lib/types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  appUser: AppUser | null; // Data dari Firestore
  loading: boolean; // Kombinasi loading auth Firebase dan loading appUser dari Firestore
  refreshAppUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true); // Hanya untuk status Firebase Auth
  const [profileLoading, setProfileLoading] = useState(false); // Untuk status loading profil Firestore

  const fetchAppUser = useCallback(async (user: FirebaseUser | null) => {
    if (user) {
      console.log(`[AuthContext] fetchAppUser called for UID: ${user.uid}`);
      setProfileLoading(true);
      try {
        // Coba ambil, jika tidak ada atau ada update (misal displayName dari Google berubah), checkAndCreate akan handle
        const userProfile = await checkAndCreateUserDocument(user, 'userSatker', user.displayName);
        console.log("[AuthContext] fetchAppUser: AppUser data after checkAndCreateUserDocument:", JSON.stringify(userProfile));
        setAppUser(userProfile);
      } catch (error: any) {
        const errorMessage = error.message && typeof error.message === 'string' ? error.message : String(error);
        console.error("[AuthContext] fetchAppUser: Failed to fetch/create AppUser from Firestore:", errorMessage);
        setAppUser(null); // Pastikan appUser null jika ada error
      } finally {
        setProfileLoading(false);
      }
    } else {
      console.log("[AuthContext] fetchAppUser: No Firebase user, setting appUser to null.");
      setAppUser(null);
      setProfileLoading(false); // Pastikan profileLoading false jika tidak ada user
    }
  }, []);

  useEffect(() => {
    console.log("[AuthContext] onAuthStateChanged listener attached.");
    setAuthLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("[AuthContext] onAuthStateChanged: Firebase user state changed. User:", user ? user.uid : "null");
      setCurrentUser(user);
      setAuthLoading(false); // Firebase Auth state sudah diketahui
      await fetchAppUser(user); // Ambil atau buat profil Firestore
    });

    return () => {
      console.log("[AuthContext] onAuthStateChanged listener detached.");
      unsubscribe();
    };
  }, [fetchAppUser]); // fetchAppUser sekarang stabil karena useCallback dg dependensi kosong

  const refreshAppUser = useCallback(async () => {
    if (currentUser) {
      console.log(`[AuthContext] refreshAppUser called for UID: ${currentUser.uid}`);
      setProfileLoading(true);
      try {
        // Hanya ambil data terbaru dari Firestore, jangan panggil checkAndCreate lagi
        const userProfile = await getUserDocument(currentUser.uid);
        console.log("[AuthContext] refreshAppUser: AppUser data from getUserDocument:", JSON.stringify(userProfile));
        setAppUser(userProfile);
      } catch (error: any) {
        const errorMessage = error.message && typeof error.message === 'string' ? error.message : String(error);
        console.error("[AuthContext] refreshAppUser: Error during getUserDocument call:", errorMessage);
        setAppUser(null);
      } finally {
        setProfileLoading(false);
      }
    } else {
      console.log("[AuthContext] refreshAppUser: No current user, skipping refresh.");
    }
  }, [currentUser]);

  // Loading keseluruhan = loading auth ATAU loading profil (jika ada user)
  const isLoading = authLoading || (currentUser && profileLoading);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">
          {authLoading ? "Memverifikasi sesi..." : "Memuat data profil pengguna..."}
        </p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ currentUser, appUser, loading: isLoading, refreshAppUser }}>
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
