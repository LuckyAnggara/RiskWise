
// src/lib/upr-period-context.ts
'use client';

const UPR_ID_KEY = 'riskwise_app_current_upr_id';
const PERIOD_KEY = 'riskwise_app_current_period';
const AVAILABLE_PERIODS_KEY = 'riskwise_app_available_periods';

const DEFAULT_UPR_ID = 'UPR001';
const DEFAULT_PERIOD = '2024';
const DEFAULT_AVAILABLE_PERIODS = ['2023', '2024', '2025'];

export function getCurrentUprId(): string {
  if (typeof window === 'undefined') return DEFAULT_UPR_ID;
  return localStorage.getItem(UPR_ID_KEY) || DEFAULT_UPR_ID;
}

export function getCurrentPeriod(): string {
  if (typeof window === 'undefined') return DEFAULT_PERIOD;
  return localStorage.getItem(PERIOD_KEY) || DEFAULT_PERIOD;
}

export function setCurrentPeriod(period: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(PERIOD_KEY, period);
    // Consider a more sophisticated state update if reload is too jarring
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
  // If not found or invalid, set and return default
  localStorage.setItem(AVAILABLE_PERIODS_KEY, JSON.stringify(DEFAULT_AVAILABLE_PERIODS));
  return [...DEFAULT_AVAILABLE_PERIODS];
}

export function addAvailablePeriod(period: string): string[] {
  if (typeof window === 'undefined') return [...DEFAULT_AVAILABLE_PERIODS];
  if (!/^\d{4}$/.test(period) && !/^\d{4}\/\d{4}$/.test(period) && !/^\d{4}-\d{1,2}$/.test(period) ) { // Basic validation for year format
    console.warn("Invalid period format. Please use YYYY, YYYY/YYYY or YYYY-S1/S2.");
    return getAvailablePeriods();
  }
  const currentPeriods = getAvailablePeriods();
  if (!currentPeriods.includes(period)) {
    const updatedPeriods = [...currentPeriods, period].sort(); // Keep them sorted
    localStorage.setItem(AVAILABLE_PERIODS_KEY, JSON.stringify(updatedPeriods));
    return updatedPeriods;
  }
  return currentPeriods;
}

// Helper function to initialize context if not already set, e.g. on first app load
export function initializeAppContext(): { uprId: string, period: string, availablePeriods: string[] } {
    if (typeof window !== 'undefined') {
        const uprId = localStorage.getItem(UPR_ID_KEY);
        if (!uprId) {
            localStorage.setItem(UPR_ID_KEY, DEFAULT_UPR_ID);
        }

        const period = localStorage.getItem(PERIOD_KEY);
        if (!period) {
            localStorage.setItem(PERIOD_KEY, DEFAULT_PERIOD);
        }

        const availablePeriods = localStorage.getItem(AVAILABLE_PERIODS_KEY);
        if (!availablePeriods) {
            localStorage.setItem(AVAILABLE_PERIODS_KEY, JSON.stringify(DEFAULT_AVAILABLE_PERIODS));
        }
        return {
            uprId: getCurrentUprId(),
            period: getCurrentPeriod(),
            availablePeriods: getAvailablePeriods()
        }
    }
    return {
        uprId: DEFAULT_UPR_ID,
        period: DEFAULT_PERIOD,
        availablePeriods: [...DEFAULT_AVAILABLE_PERIODS]
    }
}
