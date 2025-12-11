"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

// MissionType is shared between both calculators
export type MissionType = 'None' | 'UAV' | 'Trainer' | 'STOL' | 'Glider' | 'Jet';

export interface DesignSessionData {
  // From Wing Loading
  massKg?: number;
  weightN?: number;
  wingAreaM2?: number;
  wingLoadingKgm2?: number;
  missionType?: MissionType;
  densityKgM3?: number;
  clMaxUsed?: number;
  stallSpeedMs?: number;
  stallSpeedKts?: number;

  // From Lift/Drag Analyzer
  ldClimb?: number;      // L/D value to use in climb
  clClimb?: number;      // corresponding CL for that L/D (optional, for reference)
  alphaClimbDeg?: number;
  ldCruise?: number;     // optional future use
  clCruise?: number;
  alphaCruiseDeg?: number;

  // From Climb Performance Calculator
  vClimbVyMs?: number;   // Best rate of climb speed (m/s)
  vClimbVxMs?: number;   // Best angle of climb speed (m/s)
  rocVyMs?: number;      // Rate of climb at V_y (m/s)
  gammaVy?: number;      // Climb gradient at V_y (unitless)
  
  // Drag polar (for climb calculator)
  cd0?: number;          // Zero-lift drag coefficient
  k?: number;            // Induced drag factor
  totalThrustN?: number; // Total installed thrust (N)
}

interface DesignSessionContextValue {
  data: DesignSessionData;
  updateDesignSession: (partial: Partial<DesignSessionData>) => void;
  clearDesignSession: () => void;
}

const DesignSessionContext = createContext<DesignSessionContextValue | undefined>(undefined);

const DESIGN_SESSION_STORAGE_KEY = 'aeroverse_design_session';

export function getDesignSession(): DesignSessionData {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(DESIGN_SESSION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export function saveDesignSession(data: DesignSessionData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DESIGN_SESSION_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

export function DesignSessionProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DesignSessionData>(() => {
    // Initialize from localStorage
    return getDesignSession();
  });

  const updateDesignSession = (partial: Partial<DesignSessionData>) => {
    setData(prev => {
      const updated = { ...prev, ...partial };
      saveDesignSession(updated);
      return updated;
    });
  };

  const clearDesignSession = () => {
    setData({});
    if (typeof window !== 'undefined') {
      localStorage.removeItem(DESIGN_SESSION_STORAGE_KEY);
    }
  };

  return (
    <DesignSessionContext.Provider value={{ data, updateDesignSession, clearDesignSession }}>
      {children}
    </DesignSessionContext.Provider>
  );
}

export function useDesignSession() {
  const ctx = useContext(DesignSessionContext);
  if (!ctx) {
    throw new Error('useDesignSession must be used within a DesignSessionProvider');
  }
  return ctx;
}

