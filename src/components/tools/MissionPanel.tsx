"use client";

import { useState, useEffect, useMemo } from "react";
import type {
  MissionId,
  RecommendationMode,
  AirfoilRecommendation,
} from "@/types/missionRecommendations";
import { MISSION_PRESETS, getMissionById } from "@/data/missions";
import { recommendAirfoils } from "@/core/recommendAirfoils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle } from "lucide-react";
import { RecommendationList, type RecommendationItem } from "@/components/recommendations/RecommendationList";
import { getAllAirfoilsWithMetricsForRe } from "@/core/airfoilMetrics";
import { getTargetReForMission } from "@/core/missionReMapping";
import { AIRFOILS } from "@/data/airfoils";
import { buildRecommendationReasons } from "@/lib/recommendations/reasoning";
import { buildEngineeringSummary } from "@/core/engineeringText";

interface MissionPanelProps {
  onApplyRecommendations: (baseAirfoilId: string, comparedAirfoilIds: string[]) => void;
}

export function MissionPanel({ onApplyRecommendations }: MissionPanelProps) {
  const [selectedMission, setSelectedMission] = useState<MissionId | null>("uav_endurance");
  const [mode, setMode] = useState<RecommendationMode>("engineering");
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<AirfoilRecommendation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [smartAiUnavailableReason, setSmartAiUnavailableReason] = useState<"AI_DISABLED" | "NETWORK_ERROR" | "BAD_RESPONSE" | null>(null);
  const [selectedAirfoilId, setSelectedAirfoilId] = useState<string | undefined>();
  
  // Type for airfoil metrics
  interface AirfoilMetrics {
    re?: number;
    clMax?: number;
    ldMax?: number;
    stallAlpha?: number;
    alphaAtClMax?: number;
    cdMin?: number;
    stallSoftness?: number | null;
    cmRange?: number | null;
    cmMean?: number | null;
  }
  const [airfoilMetricsMap, setAirfoilMetricsMap] = useState<Map<string, AirfoilMetrics>>(new Map());

  async function handleRecommend() {
    if (!selectedMission) return;
    setLoading(true);
    setError(null);
    setSmartAiUnavailableReason(null);
    try {
      const result = await recommendAirfoils(selectedMission, mode);
      setRecommendations(result.items);
      
      // Check if Smart AI failed and fell back to engineering
      if (mode === "ai" && result.smartAiError) {
        setSmartAiUnavailableReason(result.smartAiError.reason);
      } else if (mode === "ai") {
        // Smart AI succeeded, clear any previous error
        setSmartAiUnavailableReason(null);
      }

      const airfoilIds = result.items.map(item => item.airfoilId).filter(Boolean);
      if (airfoilIds.length > 0) {
        const maxItems = Math.min(airfoilIds.length, 5);
        const [base, ...rest] = airfoilIds.slice(0, maxItems);
        onApplyRecommendations(base, rest.slice(0, 4));
      }
    } catch (e: unknown) {
      console.error("MissionPanel recommend error:", e);
      setError("Could not compute recommendations.");
    } finally {
      setLoading(false);
    }
  }

  const selectedMissionPreset = selectedMission 
    ? getMissionById(selectedMission)
    : null;

  // Fetch metrics for recommended airfoils when recommendations change
  useEffect(() => {
    async function fetchMetrics() {
      if (recommendations.length === 0 || !selectedMission) return;
      
      try {
        const targetRe = getTargetReForMission(selectedMission);
        const allMetrics = await getAllAirfoilsWithMetricsForRe(targetRe);
        const metricsMap = new Map();
        
        allMetrics.forEach(airfoil => {
          metricsMap.set(airfoil.airfoilId, airfoil);
        });
        
        setAirfoilMetricsMap(metricsMap);
      } catch (err) {
        console.warn("Failed to fetch airfoil metrics:", err);
      }
    }
    
    fetchMetrics();
  }, [recommendations, selectedMission]);

  // Map recommendations to RecommendationList format
  const recommendationItems: RecommendationItem[] = useMemo(() => {
    return recommendations.map((rec) => {
      const airfoil = AIRFOILS.find(a => a.id === rec.airfoilId);
      const airfoilName = airfoil?.name || rec.airfoilId;
      const metrics = airfoilMetricsMap.get(rec.airfoilId);
      
      // Map metrics to RecommendationCard format
      const cardMetrics = metrics ? {
        reynolds: metrics.re ?? 0,
        clMax: metrics.clMax,
        ldMax: metrics.ldMax,
        alphaStallDeg: metrics.stallAlpha ?? metrics.alphaAtClMax,
        // Note: clTarget, clAtTarget, cdAtTarget, cmAtTarget would need to come from mission context
        // For now, we'll omit them if not available
      } : undefined;

      // Generate multiple metric-backed reasons if metrics are available
      let reasons: string[] = [];
      if (metrics && cardMetrics) {
        try {
          reasons = buildRecommendationReasons({
            mode: mode === "ai" ? "smart-ai" : "engineering",
            isFallback: smartAiUnavailableReason !== null && mode === "ai",
            reynolds: cardMetrics.reynolds,
            ldMax: cardMetrics.ldMax,
            clMax: cardMetrics.clMax,
            alphaStallDeg: cardMetrics.alphaStallDeg,
            cdMin: metrics.cdMin,
            stallSoftness: metrics.stallSoftness ?? undefined,
            cmRange: metrics.cmRange ?? undefined,
            cmMean: metrics.cmMean ?? undefined,
            // Optional metrics that may not be available (not in cardMetrics, so undefined)
            clTarget: undefined,
            clAtTarget: undefined,
            cdAtTarget: undefined,
            cmAtTarget: undefined,
          });
        } catch (err) {
          console.warn("Failed to build recommendation reasons:", err);
          // Fallback to original reason if available
          reasons = rec.reason ? [rec.reason] : [];
        }
      } else {
        // Fallback to original reason if metrics not available
        reasons = rec.reason ? [rec.reason] : [];
      }

      // Build engineering summary for engineering mode
      let engineeringSummary = undefined;
      if (mode === "engineering" && metrics && cardMetrics) {
        try {
          const missionPreset = selectedMission ? getMissionById(selectedMission) : undefined;
          engineeringSummary = buildEngineeringSummary(
            {
              airfoilId: rec.airfoilId,
              name: airfoilName,
              missionId: selectedMission,
              ldMax: cardMetrics.ldMax ?? 0,
              clMax: cardMetrics.clMax ?? 0,
              alphaStall: cardMetrics.alphaStallDeg ?? 0,
              cdMin: metrics.cdMin ?? 0,
              stallSoftness: metrics.stallSoftness ?? null,
              cmRange: metrics.cmRange ?? null,
              cmMean: metrics.cmMean ?? null,
              reynolds: cardMetrics.reynolds,
            },
            missionPreset
          );
        } catch (err) {
          console.warn("Failed to build engineering summary:", err);
        }
      }

      // Get mission preset for chip display
      const missionPreset = selectedMission ? getMissionById(selectedMission) : undefined;

      return {
        airfoilId: rec.airfoilId,
        airfoilName,
        mode: mode === "ai" ? "smart-ai" : "engineering",
        score: rec.score,
        reasons,
        metrics: cardMetrics,
        isFallback: smartAiUnavailableReason !== null && mode === "ai",
        engineeringSummary,
        missionEmoji: missionPreset?.emoji,
        missionShortLabel: missionPreset?.shortLabel,
      };
    });
  }, [recommendations, mode, smartAiUnavailableReason, airfoilMetricsMap, selectedMission]);

  const handleSelectAirfoil = (airfoilId: string) => {
    setSelectedAirfoilId(airfoilId);
    // Find the selected airfoil and apply it as base, with others as compared
    const selectedIndex = recommendations.findIndex(r => r.airfoilId === airfoilId);
    if (selectedIndex >= 0) {
      const base = recommendations[selectedIndex].airfoilId;
      const compared = recommendations
        .filter((_, idx) => idx !== selectedIndex)
        .map(r => r.airfoilId)
        .slice(0, 4);
      onApplyRecommendations(base, compared);
    }
  };

  return (
    <div className="mission-panel bg-slate-950/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 w-full">
      {/* Top row: Mission dropdown, Engine mode, Apply button */}
      <div className="flex w-full items-center justify-between gap-4">
        {/* Left: Mission selection */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="mission-panel-title text-sm font-semibold text-slate-200 whitespace-nowrap">
              Mission & Engine
            </h3>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <div className="flex-1 min-w-0">
              <Select
                value={selectedMission ?? ""}
                onValueChange={(value) => setSelectedMission(value as MissionId)}
              >
                <SelectTrigger className="mission-select bg-slate-900 border-slate-700 text-slate-200 text-sm h-9 w-full">
                  <SelectValue placeholder="Select mission" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 [&_div[class*='overflow-y-auto']]:!max-h-[144px] [&_div[class*='overflow-y-auto']]:!overflow-y-auto">
                  {MISSION_PRESETS.map(preset => (
                    <SelectItem 
                      key={preset.id} 
                      value={preset.id}
                      className="text-slate-200 hover:bg-slate-800 focus:bg-slate-800"
                    >
                      {preset.emoji} {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedMissionPreset && (
              <p className="mission-description text-slate-400 text-sm ml-2 mt-1">
                {selectedMissionPreset.description}
              </p>
            )}
          </div>
        </div>

        {/* Middle: Engine mode buttons */}
        <div className="flex flex-col gap-2 lg:min-w-[200px]">
          <label className="mission-label text-xs text-slate-400 whitespace-nowrap">
            Engine mode
          </label>
          <div className="mission-engine-toggle flex items-center gap-3">
            <button
              type="button"
              className={`engine-button flex-1 text-xs py-2 px-3 rounded-full border transition-all whitespace-nowrap ${
                mode === "ai"
                  ? "engine-button-active border-yellow-400 bg-yellow-400 text-slate-900 font-medium"
                  : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600"
              }`}
              onClick={() => setMode("ai")}
            >
              Smart AI ✨
            </button>
            <button
              type="button"
              className={`engine-button flex-1 text-xs py-2 px-3 rounded-full border transition-all whitespace-nowrap ${
                mode === "engineering"
                  ? "engine-button-active border-yellow-400 bg-yellow-400 text-slate-900 font-medium"
                  : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600"
              }`}
              onClick={() => setMode("engineering")}
            >
              Engineering 📐
            </button>
          </div>
          {/* Show Smart AI error hint if Smart AI failed */}
          {mode === "ai" && smartAiUnavailableReason && (
            <p className="mt-1 text-xs text-slate-400">
              {smartAiUnavailableReason === "AI_DISABLED" && "Smart AI is not configured (no API key). Using Engineering mode instead."}
              {smartAiUnavailableReason === "NETWORK_ERROR" && "Smart AI request failed (network/API). Using Engineering mode instead."}
              {smartAiUnavailableReason === "BAD_RESPONSE" && "Smart AI responded with an unexpected format. Using Engineering mode instead."}
            </p>
          )}
        </div>

        {/* Right: Apply button + error/fallback badge */}
        <div className="flex flex-col gap-2 lg:min-w-[180px]">
          <label className="text-xs text-slate-400 whitespace-nowrap">
            Action
          </label>
          <Button
            type="button"
            className="mission-apply-button w-full bg-green-500 hover:bg-green-600 text-slate-900 font-medium text-sm py-2 h-auto whitespace-nowrap"
            onClick={handleRecommend}
            disabled={loading || !selectedMission}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Computing…
              </>
            ) : (
              "Apply & select top 5"
            )}
          </Button>
          {error && (
            <p className="mission-error text-xs text-red-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {error}
            </p>
          )}
        </div>
      </div>

      {/* Recommendations list below the top row */}
      {recommendationItems.length > 0 && (
        <div className="border-t border-slate-800 pt-4">
          <h4 className="mission-subtitle text-xs font-semibold text-slate-200 mb-2">
            Recommendations
          </h4>
          <div className="max-h-[600px] overflow-y-auto">
            <RecommendationList
              recommendations={recommendationItems}
              selectedId={selectedAirfoilId}
              onSelectAirfoil={handleSelectAirfoil}
            />
          </div>
        </div>
      )}
      
      {/* Hint when no recommendations */}
      {recommendations.length === 0 && !loading && (
        <p className="mission-hint text-xs text-slate-400 text-center py-2">
          No recommendations yet. Choose a mission and click apply.
        </p>
      )}
    </div>
  );
}
