/**
 * Unified Thrust Calculator
 * 
 * Parent component that provides a mode toggle between:
 * - Rocket Thrust Calculator: Rocket engine performance (Isp, exhaust velocity, nozzle, mass flow)
 * - Aircraft Thrust Loading Calculator: Aircraft T/W ratio, mission envelopes, climb performance
 * 
 * All physics calculations remain unchanged in their respective child components.
 * Features preserved: PDF export, AI assistance, localStorage persistence
 */

"use client";

import { useState, useEffect } from "react";
import { Settings2, Rocket, Plane } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AeroCard } from "@/components/common/AeroCard";
import { ToolWrapper } from "@/components/layout/ToolWrapper";
import { ToolHeader } from "@/components/layout/ToolHeader";

// Import child calculators
import RocketThrustCalculator from "@/components/tools/thrust/RocketThrustCalculator";
import ThrustLoadingCalculator from "@/components/tools/ThrustLoadingCalculator";

// ============================================================================
// TYPES
// ============================================================================

type ThrustMode = 'rocket' | 'aircraft';

interface ThrustCalculatorProps {
  initialMode?: ThrustMode;
}

// ============================================================================
// MODE INFO
// ============================================================================

const MODE_INFO: Record<ThrustMode, { title: string; description: string; icon: typeof Rocket }> = {
  rocket: {
    title: "Rocket Thrust",
    description: "Analyze rocket engine thrust, specific impulse (Isp), exhaust velocity, nozzle performance, and mass flow.",
    icon: Rocket,
  },
  aircraft: {
    title: "Aircraft Thrust Loading",
    description: "Analyze aircraft thrust-to-weight ratio (T/W), mission envelopes, and climb performance.",
    icon: Plane,
  },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ThrustCalculator = ({ initialMode = 'rocket' }: ThrustCalculatorProps) => {
  const [mode, setMode] = useState<ThrustMode>(initialMode);

  // Persist mode preference
  useEffect(() => {
    const stored = localStorage.getItem("thrustCalculator_mode");
    if (stored === 'rocket' || stored === 'aircraft') {
      setMode(stored);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("thrustCalculator_mode", mode);
  }, [mode]);

  const currentModeInfo = MODE_INFO[mode];

  return (
    <ToolWrapper>
      <ToolHeader
        title="Thrust Calculator"
        description="Unified propulsion analysis for rockets and aircraft"
        icon={Settings2}
      />

      {/* Mode Selector Card */}
      <AeroCard
        title="Calculator Mode"
        description="Choose between rocket propulsion analysis and aircraft thrust loading"
        icon={Settings2}
      >
        <div className="space-y-4">
          {/* Mode Tabs */}
          <Tabs value={mode} onValueChange={(v) => setMode(v as ThrustMode)}>
            <TabsList className="w-full grid grid-cols-2 bg-slate-800/60 border border-primary/20">
              <TabsTrigger 
                value="rocket"
                className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-[0_0_15px_hsl(160_84%_39%/0.5)] transition-all duration-300"
              >
                <Rocket className="w-4 h-4 mr-2" />
                Rocket Thrust
              </TabsTrigger>
              <TabsTrigger 
                value="aircraft"
                className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-[0_0_15px_hsl(160_84%_39%/0.5)] transition-all duration-300"
              >
                <Plane className="w-4 h-4 mr-2" />
                Aircraft Thrust Loading
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Mode Description */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/50 border border-primary/10">
            <currentModeInfo.icon className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-primary">{currentModeInfo.title}</p>
              <p className="text-xs text-gray-400 mt-1">{currentModeInfo.description}</p>
            </div>
          </div>
        </div>
      </AeroCard>

      {/* Render the active calculator */}
      <div className="mt-6">
        {mode === 'rocket' ? (
          <RocketThrustCalculator />
        ) : (
          <ThrustLoadingCalculator />
        )}
      </div>
    </ToolWrapper>
  );
};

export default ThrustCalculator;
