
"use client";

import React, { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { Loader2 } from 'lucide-react';
import { getUserDocument } from '@/services/userService';
import type { AppUser } from '@/lib/types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  appUser: AppUser | null; // User data from Firestore
  loading: boolean;
  refreshAppUser: () => Promise<void>; // Function to refresh appUser
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAppUser = useCallback(async (user: FirebaseUser | null) => {
    if (user) {
      try {
        const userDoc = await getUserDocument(user.uid);
        setAppUser(userDoc);
      } catch (error) {
        console.error("Failed to fetch AppUser from Firestore:", error);
        setAppUser(null); // Reset appUser on error
        // Potentially show a toast to the user here if fetching appUser fails critically
      }
    } else {
      setAppUser(null);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      try {
        await fetchAppUser(user);
      } catch (error) {
        // Error during fetchAppUser is already logged within fetchAppUser
        // We ensure loading is set to false in the finally block
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [fetchAppUser]);

  const refreshAppUser = useCallback(async () => {
    if (currentUser) {
      setLoading(true); // Indicate loading while refreshing
      try {
        await fetchAppUser(currentUser);
      } catch (error) {
        // Error during fetchAppUser is already logged within fetchAppUser
      } finally {
        setLoading(false);
      }
    }
  }, [currentUser, fetchAppUser]);

  // Initial loading state for the entire app until auth state is resolved AND appUser is fetched
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
