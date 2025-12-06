"use client";

import { useState } from "react";
import type {
  MissionId,
  RecommendationMode,
  AirfoilRecommendation,
} from "@/types/missionRecommendations";
import { MISSIONS } from "@/data/missions";
import { recommendAirfoils } from "@/core/recommendAirfoils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Brain, Plane, AlertTriangle } from "lucide-react";

interface MissionPanelProps {
  onApplyRecommendations: (baseAirfoilId: string, comparedAirfoilIds: string[]) => void;
}

export function MissionPanel({ onApplyRecommendations }: MissionPanelProps) {
  const [selectedMission, setSelectedMission] = useState<MissionId | null>("uav_endurance");
  const [mode, setMode] = useState<RecommendationMode>("engineering");
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<AirfoilRecommendation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);

  async function handleRecommend() {
    if (!selectedMission) return;
    setLoading(true);
    setError(null);
    setUsedFallback(false);
    try {
      const result = await recommendAirfoils(selectedMission, mode);
      setRecommendations(result.items);
      
      // Check if AI mode fell back to engineering
      if (mode === "ai" && result.items.length > 0) {
        // Simple heuristic: if reasons don't mention AI-specific language, likely fallback
        const firstReason = result.items[0]?.reason || "";
        const isLikelyFallback = !firstReason.toLowerCase().includes("recommend") && 
                                  !firstReason.toLowerCase().includes("ideal") &&
                                  !firstReason.toLowerCase().includes("excellent");
        setUsedFallback(isLikelyFallback);
      }

      const airfoilIds = result.items.map(item => item.airfoilId).filter(Boolean);
      if (airfoilIds.length > 0) {
        const maxItems = Math.min(airfoilIds.length, 5);
        const [base, ...rest] = airfoilIds.slice(0, maxItems);
        onApplyRecommendations(base, rest.slice(0, 4));
      }
    } catch (e: any) {
      console.error("MissionPanel recommend error:", e);
      setError("Could not compute recommendations.");
    } finally {
      setLoading(false);
    }
  }

  const selectedMissionMeta = selectedMission 
    ? MISSIONS.find(m => m.id === selectedMission)
    : null;

  return (
    <div className="mission-panel bg-slate-950/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 w-full">
      {/* Top row: Mission dropdown, Engine mode, Apply button */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
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
                <SelectContent className="bg-slate-900 border-slate-700">
                  {MISSIONS.map(m => (
                    <SelectItem 
                      key={m.id} 
                      value={m.id}
                      className="text-slate-200 hover:bg-slate-800 focus:bg-slate-800"
                    >
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedMissionMeta && (
              <p className="mission-description text-xs text-slate-400 leading-relaxed sm:max-w-md">
                {selectedMissionMeta.description}
              </p>
            )}
          </div>
        </div>

        {/* Middle: Engine mode buttons */}
        <div className="flex flex-col gap-2 lg:min-w-[200px]">
          <label className="mission-label text-xs text-slate-400 whitespace-nowrap">
            Engine mode
          </label>
          <div className="mission-engine-toggle flex gap-2">
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
        </div>

        {/* Right: Apply button + error/fallback badge */}
        <div className="flex flex-col gap-2 lg:min-w-[180px]">
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
          {!error && usedFallback && mode === "ai" && recommendations.length > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded-md">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span className="text-xs text-amber-400">Fallback → Engineering</span>
            </div>
          )}
        </div>
      </div>

      {/* Recommendations list below the top row */}
      {recommendations.length > 0 && (
        <div className="border-t border-slate-800 pt-4">
          <h4 className="mission-subtitle text-xs font-semibold text-slate-200 mb-2">
            Recommendations
          </h4>
          <div className="max-h-48 overflow-y-auto">
            <ul className="mission-recommendations flex flex-col gap-2 list-none p-0 m-0">
              {recommendations.map((rec, idx) => (
                <li 
                  key={rec.airfoilId} 
                  className="mission-recommendation-item rounded-lg border border-slate-800 bg-slate-900/50 p-2"
                >
                  <div className="mission-recommendation-header flex items-center gap-2 text-xs text-slate-200">
                    <span className="mission-rank opacity-70">{idx + 1}.</span>
                    {mode === "ai" ? (
                      <Brain className="w-3 h-3 text-amber-400/70 flex-shrink-0" />
                    ) : (
                      <Plane className="w-3 h-3 text-cyan-400/70 flex-shrink-0" />
                    )}
                    <span className="mission-airfoil-id font-semibold">{rec.airfoilId}</span>
                    <span className="mission-score ml-auto text-xs opacity-80">
                      ★ {rec.score.toFixed(2)}
                    </span>
                  </div>
                  {rec.reason && (
                    <p className="mission-reason text-xs text-slate-400 mt-1 leading-relaxed">
                      {rec.reason}
                    </p>
                  )}
                </li>
              ))}
            </ul>
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
