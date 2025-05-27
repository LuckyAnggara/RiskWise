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
  appUser: AppUser | null;
  loading: boolean;
  refreshAppUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchAppUser = useCallback(async (user: FirebaseUser | null, displayNameFromForm?: string | null) => {
    if (user) {
      console.log(`[AuthContext] fetchAppUser called for UID: ${user.uid}`);
      setProfileLoading(true);
      try {
        // Always call checkAndCreateUserDocument to handle new users or sync existing ones
        // In diagnostic mode, this will return a mock or null.
        const userDoc = await checkAndCreateUserDocument(user, 'userSatker', displayNameFromForm);
        console.log("[AuthContext] fetchAppUser: AppUser data after checkAndCreateUserDocument:", JSON.stringify(userDoc));
        setAppUser(userDoc);
      } catch (error: any) {
        const errorMessage = error instanceof Error && error.message ? error.message : String(error);
        console.error("[AuthContext] fetchAppUser: Failed to fetch/create AppUser from Firestore. Error type:", typeof error, "Message:", errorMessage);
        setAppUser(null);
      } finally {
        setProfileLoading(false);
      }
    } else {
      console.log("[AuthContext] fetchAppUser: No Firebase user, setting appUser to null.");
      setAppUser(null);
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log("[AuthContext] onAuthStateChanged listener attached.");
    setAuthLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("[AuthContext] onAuthStateChanged: Firebase user state changed. User:", user ? user.uid : "null");
      setCurrentUser(user); // Set Firebase user immediately
      // Don't set authLoading to false until profile fetching attempt is also done
      try {
        await fetchAppUser(user);
      } catch (error) {
        // Error already logged in fetchAppUser
      } finally {
        setAuthLoading(false); // Firebase Auth state and profile fetch attempt are both settled
      }
    });

    return () => {
      console.log("[AuthContext] onAuthStateChanged listener detached.");
      unsubscribe();
    };
  }, [fetchAppUser]); // fetchAppUser is stable due to useCallback([])

  const refreshAppUser = useCallback(async () => {
    if (currentUser) {
      console.log(`[AuthContext] refreshAppUser called for UID: ${currentUser.uid}`);
      setProfileLoading(true);
      try {
        // In diagnostic mode, this will use the diagnostic version of getUserDocument
        const userProfile = await getUserDocument(currentUser.uid);
        console.log("[AuthContext] refreshAppUser: AppUser data from getUserDocument:", JSON.stringify(userProfile));
        setAppUser(userProfile);
      } catch (error: any) {
        const errorMessage = error instanceof Error && error.message ? error.message : String(error);
        console.error("[AuthContext] refreshAppUser: Error during getUserDocument call. Error type:", typeof error, "Message:", errorMessage);
        setAppUser(null);
      } finally {
        setProfileLoading(false);
      }
    } else {
      console.log("[AuthContext] refreshAppUser: No current user, skipping refresh.");
      setProfileLoading(false); // Ensure loading is false if no user
    }
  }, [currentUser]);

  const isLoading = authLoading || profileLoading;

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
