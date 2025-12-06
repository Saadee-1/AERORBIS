"use client";

import { useState, useCallback } from "react";
import { MissionPanel } from "./MissionPanel";
import LiftDragAnalyzer from "./LiftDragAnalyzer";

/**
 * Wrapper component that combines MissionPanel (top bar) with LiftDragAnalyzer (main content)
 * Provides a single-column layout with MissionPanel at the top
 */
export function LaunchpadWithMissionPanel() {
  const [updateSelectionFn, setUpdateSelectionFn] = useState<
    ((baseAirfoilId: string, comparedAirfoilIds: string[]) => void) | null
  >(null);

  const handleApplyRecommendations = useCallback(
    (baseAirfoilId: string, comparedAirfoilIds: string[]) => {
      if (updateSelectionFn) {
        updateSelectionFn(baseAirfoilId, comparedAirfoilIds);
      }
    },
    [updateSelectionFn]
  );

  const handleRegisterUpdateSelection = useCallback(
    (fn: (baseAirfoilId: string, comparedAirfoilIds: string[]) => void) => {
      setUpdateSelectionFn(() => fn);
    },
    []
  );

  return (
    <div className="launchpad-layout flex flex-col gap-4">
      {/* Mission Panel as top bar */}
      <MissionPanel onApplyRecommendations={handleApplyRecommendations} />
      
      {/* Main analyzer content */}
      <LiftDragAnalyzer onRegisterUpdateSelection={handleRegisterUpdateSelection} />
    </div>
  );
}

