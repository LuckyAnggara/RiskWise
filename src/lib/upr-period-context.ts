// src/lib/upr-period-context.ts
'use client';
import type { User as FirebaseUser } from 'firebase/auth';

const UPR_ID_KEY = 'riskwise_app_current_upr_id';
const PERIOD_KEY = 'riskwise_app_current_period';
const AVAILABLE_PERIODS_KEY = 'riskwise_app_available_periods';

const DEFAULT_FALLBACK_UPR_ID = 'UPR_UMUM'; // Fallback if no user display name
const DEFAULT_PERIOD = new Date().getFullYear().toString(); // Default to current year
const DEFAULT_AVAILABLE_PERIODS = [
  (new Date().getFullYear() - 1).toString(), 
  DEFAULT_PERIOD, 
  (new Date().getFullYear() + 1).toString()
];

function getUprIdFromStorageOrUser(currentUser?: FirebaseUser | null): string {
  if (currentUser?.displayName) {
    return currentUser.displayName;
  }
  return localStorage.getItem(UPR_ID_KEY) || DEFAULT_FALLBACK_UPR_ID;
}

export function getCurrentUprId(currentUser?: FirebaseUser | null): string {
  if (typeof window === 'undefined') return DEFAULT_FALLBACK_UPR_ID;
  return getUprIdFromStorageOrUser(currentUser);
}

export function setCurrentUprId(uprId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(UPR_ID_KEY, uprId);
    // Consider if a reload or context refresh is needed application-wide
    // For now, other components should re-fetch data based on this new context if it's part of their dependency.
  }
}

export function getCurrentPeriod(): string {
  if (typeof window === 'undefined') return DEFAULT_PERIOD;
  return localStorage.getItem(PERIOD_KEY) || DEFAULT_PERIOD;
}

export function setCurrentPeriod(period: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(PERIOD_KEY, period);
    window.location.reload();
  }
}

export function getAvailablePeriods(): string[] {
  if (typeof window === 'undefined') return [...DEFAULT_AVAILABLE_PERIODS];
  const storedPeriods = localStorage.getItem(AVAILABLE_PERIODS_KEY);
  if (storedPeriods) {
    try {
      const parsedPeriods = JSON.parse(storedPeriods);
      if (Array.isArray(parsedPeriods) && parsedPeriods.every(p => typeof p === 'string')) {
        return parsedPeriods;
      }
    } catch (e) {
      console.error("Error parsing available periods from localStorage", e);
    }
  }
  localStorage.setItem(AVAILABLE_PERIODS_KEY, JSON.stringify(DEFAULT_AVAILABLE_PERIODS));
  return [...DEFAULT_AVAILABLE_PERIODS];
}

export function addAvailablePeriod(period: string): string[] {
  if (typeof window === 'undefined') return [...DEFAULT_AVAILABLE_PERIODS];
  if (!/^\d{4}$/.test(period.trim()) && !/^\d{4}\/\d{4}$/.test(period.trim()) && !/^\d{4}-(S1|S2|Q1|Q2|Q3|Q4)$/i.test(period.trim())) {
    console.warn("Invalid period format. Please use YYYY, YYYY/YYYY or YYYY-S1/S2/Q1-Q4.");
    return getAvailablePeriods();
  }
  const currentPeriods = getAvailablePeriods();
  const trimmedPeriod = period.trim();
  if (!currentPeriods.includes(trimmedPeriod)) {
    const updatedPeriods = [...currentPeriods, trimmedPeriod].sort((a, b) => {
      // Sort periods, prioritizing YYYY formats then YYYY-Suffix, then YYYY/YYYY
      const aYear = parseInt(a.substring(0,4));
      const bYear = parseInt(b.substring(0,4));
      if(aYear !== bYear) return aYear - bYear;
      // If years are same, simple string sort for suffixes or YYYY/YYYY
      return a.localeCompare(b);
    });
    localStorage.setItem(AVAILABLE_PERIODS_KEY, JSON.stringify(updatedPeriods));
    return updatedPeriods;
  }
  return currentPeriods;
}

export function initializeAppContext(currentUser?: FirebaseUser | null): { uprId: string, period: string, availablePeriods: string[] } {
    if (typeof window !== 'undefined') {
        let uprId = localStorage.getItem(UPR_ID_KEY);
        if (currentUser?.displayName) {
            uprId = currentUser.displayName; // Prioritize user's display name
            localStorage.setItem(UPR_ID_KEY, uprId);
        } else if (!uprId) {
            uprId = DEFAULT_FALLBACK_UPR_ID;
            localStorage.setItem(UPR_ID_KEY, uprId);
        }

        let period = localStorage.getItem(PERIOD_KEY);
        if (!period) {
            period = DEFAULT_PERIOD;
            localStorage.setItem(PERIOD_KEY, period);
        }

        let availablePeriodsJson = localStorage.getItem(AVAILABLE_PERIODS_KEY);
        let availablePeriods: string[];
        if (!availablePeriodsJson) {
            availablePeriods = [...DEFAULT_AVAILABLE_PERIODS];
            localStorage.setItem(AVAILABLE_PERIODS_KEY, JSON.stringify(availablePeriods));
        } else {
            try {
                availablePeriods = JSON.parse(availablePeriodsJson);
                if (!Array.isArray(availablePeriods) || !availablePeriods.every(p => typeof p === 'string')) {
                    availablePeriods = [...DEFAULT_AVAILABLE_PERIODS];
                    localStorage.setItem(AVAILABLE_PERIODS_KEY, JSON.stringify(availablePeriods));
                }
            } catch {
                availablePeriods = [...DEFAULT_AVAILABLE_PERIODS];
                localStorage.setItem(AVAILABLE_PERIODS_KEY, JSON.stringify(availablePeriods));
            }
        }
        
        return {
            uprId: uprId!,
            period: period!,
            availablePeriods
        }
    }
    return { // Fallback for server-side or if window is not defined
        uprId: DEFAULT_FALLBACK_UPR_ID,
        period: DEFAULT_PERIOD,
        availablePeriods: [...DEFAULT_AVAILABLE_PERIODS]
    }
}
