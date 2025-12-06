"use client";

import { useState, useCallback } from "react";
import { MissionPanel } from "./MissionPanel";
import LiftDragAnalyzer from "./LiftDragAnalyzer";

/**
 * Wrapper component that combines MissionPanel (left sidebar) with LiftDragAnalyzer (main content)
 * Provides the two-column layout for the Launchpad page
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
    <div className="launchpad-layout grid grid-cols-1 lg:grid-cols-[minmax(280px,320px)_1fr] gap-4 items-start">
      <aside className="launchpad-sidebar lg:sticky lg:top-4 order-2 lg:order-1">
        <MissionPanel onApplyRecommendations={handleApplyRecommendations} />
      </aside>
      <main className="launchpad-main min-w-0 order-1 lg:order-2">
        <LiftDragAnalyzer onRegisterUpdateSelection={handleRegisterUpdateSelection} />
      </main>
    </div>
  );
}

