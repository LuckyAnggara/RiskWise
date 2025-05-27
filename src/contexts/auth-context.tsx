"use client";

import React, { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { Loader2 } from 'lucide-react';
import { getUserDocument } from '@/services/userService'; // Hanya import getUserDocument
import type { AppUser } from '@/lib/types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  appUser: AppUser | null;
  loading: boolean;
  refreshAppUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Fungsi ini sekarang hanya bertanggung jawab untuk MENGAMBIL data AppUser yang sudah ada
  const fetchAppUser = useCallback(async (user: FirebaseUser | null) => {
    if (user) {
      console.log(`[AuthContext] fetchAppUser attempting for UID: ${user.uid}`);
      try {
        // Panggil getUserDocument untuk mengambil data AppUser dari Firestore
        const userDoc = await getUserDocument(user.uid);
        console.log(`[AuthContext] fetchAppUser: AppUser data received:`, userDoc ? `${userDoc.uid} - ${userDoc.displayName}` : "null");
        setAppUser(userDoc);
      } catch (error: any) {
        console.error("[AuthContext] fetchAppUser: Failed to fetch AppUser from Firestore:", error.message || String(error));
        setAppUser(null); // Pastikan appUser null jika ada error
      }
    } else {
      console.log("[AuthContext] fetchAppUser: No Firebase user, setting appUser to null.");
      setAppUser(null);
    }
  }, []); // Empty dependency array means this function reference is stable

  useEffect(() => {
    setLoading(true);
    console.log("[AuthContext] onAuthStateChanged listener attached.");
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("[AuthContext] onAuthStateChanged: Firebase user state changed. User:", user ? user.uid : "null");
      setCurrentUser(user);
      try {
        await fetchAppUser(user);
      } catch (error) {
        console.error("[AuthContext] onAuthStateChanged: Error during fetchAppUser call:", error);
      } finally {
        console.log("[AuthContext] onAuthStateChanged: Setting loading to false.");
        setLoading(false);
      }
    });

    return () => {
      console.log("[AuthContext] onAuthStateChanged listener detached.");
      unsubscribe();
    };
  }, [fetchAppUser]);

  const refreshAppUser = useCallback(async () => {
    if (currentUser) {
      console.log(`[AuthContext] refreshAppUser called for UID: ${currentUser.uid}`);
      setLoading(true); // Indicate loading during refresh
      try {
        await fetchAppUser(currentUser);
      } catch (error) {
        console.error("[AuthContext] refreshAppUser: Error during fetchAppUser call:", error);
      } finally {
        console.log("[AuthContext] refreshAppUser: Setting loading to false after refresh attempt.");
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