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

  const ModeIcon = mode === "ai" ? Brain : Plane;

  return (
    <div className="mission-panel bg-slate-950/90 border border-slate-800 rounded-xl p-3 sm:p-4 flex flex-col gap-3 w-full min-w-[180px] max-w-[340px] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800/60 pb-2">
        <h3 className="text-sm font-semibold text-slate-200 tracking-tight">
          Mission & Engine
        </h3>
        <ModeIcon className="w-4 h-4 text-slate-500" />
      </div>

      {/* Mission Selection */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
          Mission Preset
        </label>
        <Select
          value={selectedMission ?? ""}
          onValueChange={(value) => setSelectedMission(value as MissionId)}
        >
          <SelectTrigger className="bg-slate-900/80 border-slate-700/80 text-slate-200 text-xs h-8 focus:ring-1 focus:ring-cyan-500/40">
            <SelectValue placeholder="Select mission" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-700 max-h-[200px]">
            {MISSIONS.map(m => (
              <SelectItem 
                key={m.id} 
                value={m.id}
                className="text-slate-200 text-xs hover:bg-slate-800 focus:bg-slate-800"
              >
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedMissionMeta && (
          <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">
            {selectedMissionMeta.description}
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />

      {/* Engine Mode */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
          Engine Mode
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            className={`flex items-center justify-center gap-1.5 text-[11px] py-1.5 px-2 rounded-lg border transition-all duration-200 ${
              mode === "ai"
                ? "border-amber-400/80 bg-amber-400/90 text-slate-900 font-semibold shadow-sm shadow-amber-500/20"
                : "border-slate-700/80 bg-slate-900/60 text-slate-400 hover:border-slate-600 hover:text-slate-300"
            }`}
            onClick={() => setMode("ai")}
          >
            <Brain className="w-3 h-3" />
            <span>Smart AI</span>
          </button>
          <button
            type="button"
            className={`flex items-center justify-center gap-1.5 text-[11px] py-1.5 px-2 rounded-lg border transition-all duration-200 ${
              mode === "engineering"
                ? "border-cyan-400/80 bg-cyan-400/90 text-slate-900 font-semibold shadow-sm shadow-cyan-500/20"
                : "border-slate-700/80 bg-slate-900/60 text-slate-400 hover:border-slate-600 hover:text-slate-300"
            }`}
            onClick={() => setMode("engineering")}
          >
            <Plane className="w-3 h-3" />
            <span>Engineering</span>
          </button>
        </div>
      </div>

      {/* Apply Button */}
      <Button
        type="button"
        className="w-full bg-emerald-500/90 hover:bg-emerald-500 text-slate-900 font-semibold text-xs py-2 h-8 shadow-sm shadow-emerald-500/20 transition-all duration-200"
        onClick={handleRecommend}
        disabled={loading || !selectedMission}
      >
        {loading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            Computing…
          </>
        ) : (
          "Apply & Select Top 5"
        )}
      </Button>

      {error && (
        <p className="text-[10px] text-red-400 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          {error}
        </p>
      )}

      {/* Fallback Badge */}
      {usedFallback && mode === "ai" && recommendations.length > 0 && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded-md">
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          <span className="text-[10px] text-amber-400">Fallback → Engineering</span>
        </div>
      )}

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />

      {/* Recommendations */}
      <div className="flex flex-col gap-2 flex-1 min-h-0">
        <h4 className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
          Recommendations
        </h4>
        
        {recommendations.length === 0 && !loading && (
          <p className="text-[10px] text-slate-500 italic">
            Select a mission and click apply.
          </p>
        )}
        
        <ul className="flex flex-col gap-1.5 overflow-y-auto max-h-[180px] pr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {recommendations.map((rec, idx) => (
            <li 
              key={rec.airfoilId} 
              className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-2 hover:bg-slate-800/30 transition-colors"
            >
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500 font-mono text-[10px] w-4">{idx + 1}.</span>
                {mode === "ai" ? (
                  <Brain className="w-3 h-3 text-amber-400/70 flex-shrink-0" />
                ) : (
                  <Plane className="w-3 h-3 text-cyan-400/70 flex-shrink-0" />
                )}
                <span className="font-semibold text-slate-200 truncate flex-1">{rec.airfoilId}</span>
                <span className="text-[10px] text-amber-400/80 font-medium tabular-nums">
                  ★ {rec.score.toFixed(2)}
                </span>
              </div>
              {rec.reason && (
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed line-clamp-2 pl-5">
                  {rec.reason}
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
