
"use client";

import React, { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { Loader2 } from 'lucide-react';
import { getUserDocument, updateUserProfileData } from '@/services/userService';
import type { AppUser } from '@/lib/types';
import { useAppStore, triggerInitialDataFetch } from '@/stores/useAppStore'; // Import triggerInitialDataFetch

interface AuthContextType {
  currentUser: FirebaseUser | null;
  appUser: AppUser | null;
  loading: boolean; // Combined loading state
  authLoading: boolean; // Specific to Firebase Auth state change
  profileLoading: boolean; // Specific to Firestore profile fetching/creation
  isProfileComplete: boolean;
  refreshAppUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false); // Initially false
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const resetAllStoreData = useAppStore(state => state.resetAllData);


  const determineProfileCompleteness = useCallback((userProfile: AppUser | null): boolean => {
    if (!userProfile) return false;
    return !!(userProfile.displayName && userProfile.uprId && userProfile.activePeriod && userProfile.availablePeriods && userProfile.availablePeriods.length > 0);
  }, []);

  const fetchAppUser = useCallback(async (user: FirebaseUser | null) => {
    if (user) {
      console.log("[AuthContext] fetchAppUser: Called for UID:", user.uid);
      setProfileLoading(true);
      try {
        const userDoc = await getUserDocument(user.uid);
        console.log("[AuthContext] fetchAppUser: AppUser data from Firestore:", JSON.stringify(userDoc));
        setAppUser(userDoc); // Set appUser even if it's null (user doc not found)
        const completeness = determineProfileCompleteness(userDoc);
        setIsProfileComplete(completeness);
        console.log("[AuthContext] fetchAppUser: Profile complete status:", completeness);

        if (userDoc && userDoc.uid && userDoc.activePeriod && completeness) {
            triggerInitialDataFetch(userDoc.uid, userDoc.activePeriod);
        } else if (userDoc && !completeness) {
            console.log("[AuthContext] Profile incomplete, not triggering initial data fetch yet.");
             resetAllStoreData(); // Reset store if profile is incomplete
        }


      } catch (error: any) {
        const errorMessage = error.message && typeof error.message === 'string' ? error.message : String(error);
        console.error("[AuthContext] fetchAppUser: Failed to fetch/create AppUser from Firestore:", errorMessage);
        setAppUser(null);
        setIsProfileComplete(false);
        resetAllStoreData();
      } finally {
        setProfileLoading(false);
      }
    } else {
      console.log("[AuthContext] fetchAppUser: No Firebase user, setting appUser to null.");
      setAppUser(null);
      setIsProfileComplete(false);
      setProfileLoading(false); // Ensure profile loading is false if no user
      resetAllStoreData();
    }
  }, [determineProfileCompleteness, resetAllStoreData]);

  useEffect(() => {
    console.log("[AuthContext] onAuthStateChanged listener attached.");
    setAuthLoading(true);
    // setProfileLoading(true); // Set profile loading true when auth state might change

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("[AuthContext] onAuthStateChanged: Firebase user state changed. User:", user ? user.uid : "null");
      setCurrentUser(user);
      try {
        await fetchAppUser(user);
      } catch (error) {
        console.error("[AuthContext] onAuthStateChanged: Error during fetchAppUser call:", error);
        // fetchAppUser's own catch will handle setAppUser(null)
      } finally {
        setAuthLoading(false);
        // profileLoading is handled by fetchAppUser
      }
    });

    return () => {
      console.log("[AuthContext] onAuthStateChanged listener detached.");
      unsubscribe();
    };
  }, [fetchAppUser]); // fetchAppUser is memoized, so this is fine

  const refreshAppUser = useCallback(async () => {
    if (currentUser) {
      console.log(`[AuthContext] refreshAppUser called for UID: ${currentUser.uid}`);
      setProfileLoading(true);
      try {
        const userDoc = await getUserDocument(currentUser.uid);
        setAppUser(userDoc);
        const completeness = determineProfileCompleteness(userDoc);
        setIsProfileComplete(completeness);
        console.log("[AuthContext] refreshAppUser: Profile complete status:", completeness);
        if (userDoc && userDoc.uid && userDoc.activePeriod && completeness) {
            triggerInitialDataFetch(userDoc.uid, userDoc.activePeriod);
        } else {
             resetAllStoreData();
        }
      } catch (error: any) {
        const errorMessage = error.message && typeof error.message === 'string' ? error.message : String(error);
        console.error("[AuthContext] refreshAppUser: Error fetching user document:", errorMessage);
        setAppUser(null);
        setIsProfileComplete(false);
        resetAllStoreData();
      } finally {
        setProfileLoading(false);
      }
    } else {
      console.log("[AuthContext] refreshAppUser: No current user, skipping refresh.");
      setAppUser(null);
      setIsProfileComplete(false);
      setProfileLoading(false);
      resetAllStoreData();
    }
  }, [currentUser, determineProfileCompleteness, resetAllStoreData]);

  const isLoadingOverall = authLoading || profileLoading;

  return (
    <AuthContext.Provider value={{ currentUser, appUser, loading: isLoadingOverall, authLoading, profileLoading, isProfileComplete, refreshAppUser }}>
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
