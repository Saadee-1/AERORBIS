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
import { Loader2 } from "lucide-react";

interface MissionPanelProps {
  onApplyRecommendations: (baseAirfoilId: string, comparedAirfoilIds: string[]) => void;
}

export function MissionPanel({ onApplyRecommendations }: MissionPanelProps) {
  const [selectedMission, setSelectedMission] = useState<MissionId | null>("uav_endurance");
  const [mode, setMode] = useState<RecommendationMode>("engineering");
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<AirfoilRecommendation[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleRecommend() {
    if (!selectedMission) return;
    setLoading(true);
    setError(null);
    try {
      const result = await recommendAirfoils(selectedMission, mode);
      setRecommendations(result.items);

      const airfoilIds = result.items.map(item => item.airfoilId).filter(Boolean);
      if (airfoilIds.length > 0) {
        // Safety: ensure we never exceed 5 total (1 base + 4 compared)
        // recommendAirfoils already limits to 5, but defensive check here
        const maxItems = Math.min(airfoilIds.length, 5);
        const [base, ...rest] = airfoilIds.slice(0, maxItems);
        onApplyRecommendations(base, rest.slice(0, 4)); // Max 4 compared (base + 4 = 5 total)
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
    <div className="mission-panel bg-slate-950/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
      <h3 className="mission-panel-title text-sm font-semibold text-slate-200">
        Mission & Engine
      </h3>

      <div className="mission-panel-section flex flex-col gap-2">
        <label className="mission-label text-xs text-slate-400">
          Mission preset
        </label>
        <Select
          value={selectedMission ?? ""}
          onValueChange={(value) => setSelectedMission(value as MissionId)}
        >
          <SelectTrigger className="mission-select bg-slate-900 border-slate-700 text-slate-200 text-sm h-9">
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
        {selectedMissionMeta && (
          <p className="mission-description text-xs text-slate-400 leading-relaxed">
            {selectedMissionMeta.description}
          </p>
        )}
      </div>

      <div className="mission-panel-section flex flex-col gap-2">
        <label className="mission-label text-xs text-slate-400">
          Engine mode
        </label>
        <div className="mission-engine-toggle flex gap-2">
          <button
            type="button"
            className={`engine-button flex-1 text-xs py-2 px-3 rounded-full border transition-all ${
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
            className={`engine-button flex-1 text-xs py-2 px-3 rounded-full border transition-all ${
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

      <div className="mission-panel-section flex flex-col gap-2">
        <Button
          type="button"
          className="mission-apply-button w-full bg-green-500 hover:bg-green-600 text-slate-900 font-medium text-sm py-2 h-auto"
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
          <p className="mission-error text-xs text-red-400">{error}</p>
        )}
      </div>

      <div className="mission-panel-section flex flex-col gap-2">
        <h4 className="mission-subtitle text-xs font-semibold text-slate-200">
          Recommendations
        </h4>
        {recommendations.length === 0 && !loading && (
          <p className="mission-hint text-xs text-slate-400">
            No recommendations yet. Choose a mission and click apply.
          </p>
        )}
        <ul className="mission-recommendations flex flex-col gap-2 list-none p-0 m-0">
          {recommendations.map((rec, idx) => (
            <li 
              key={rec.airfoilId} 
              className="mission-recommendation-item rounded-lg border border-slate-800 bg-slate-900/50 p-2"
            >
              <div className="mission-recommendation-header flex items-center gap-2 text-xs text-slate-200">
                <span className="mission-rank opacity-70">{idx + 1}.</span>
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
  );
}

