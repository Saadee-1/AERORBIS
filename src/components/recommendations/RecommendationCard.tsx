"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EngineeringSummary } from "@/core/engineeringText";

export interface RecommendationCardProps {
  airfoilId: string;
  airfoilName: string;
  mode: "engineering" | "smart-ai";
  score: number;
  reasons: string[];
  metrics?: {
    reynolds: number;
    clTarget?: number;
    clAtTarget?: number;
    cdAtTarget?: number;
    ldMax?: number;
    clMax?: number;
    alphaStallDeg?: number;
    cmAtTarget?: number;
  };
  isFallback?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  engineeringSummary?: EngineeringSummary; // Optional structured summary for engineering mode
  rank?: number; // Rank number (1, 2, 3, ...)
  missionEmoji?: string; // Mission emoji for chip
  missionShortLabel?: string; // Mission short label for chip
}

export function RecommendationCard({
  airfoilId,
  airfoilName,
  mode,
  score,
  reasons,
  metrics,
  isFallback = false,
  selected = false,
  onSelect,
  engineeringSummary,
  rank,
  missionEmoji,
  missionShortLabel,
}: RecommendationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCardClick = (e: React.MouseEvent) => {
    // Only trigger onSelect if click is not on the toggle button
    const target = e.target as HTMLElement;
    if (!target.closest('.rec-card__toggle')) {
      onSelect?.();
    }
  };

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  // Build pros/caution text for second row
  const prosCautionText = (() => {
    if (mode === "engineering" && engineeringSummary) {
      const parts: string[] = [];
      if (engineeringSummary.pros.length > 0) {
        parts.push(engineeringSummary.pros[0]);
      }
      if (engineeringSummary.cautions.length > 0) {
        parts.push(`· Watch: ${engineeringSummary.cautions[0]}`);
      }
      return parts.join(" ");
    }
    return null;
  })();

  return (
    <div
      className={cn(
        "rec-card rounded-lg border bg-slate-900/50 p-4 transition-all cursor-pointer",
        selected 
          ? "rec-card--selected border-primary bg-slate-800/70 shadow-lg shadow-primary/20" 
          : "border-slate-700 hover:border-slate-600 hover:bg-slate-800/40"
      )}
      onClick={handleCardClick}
    >
      {/* Main Content Row */}
      <div className="flex items-start gap-4 mb-3">
        {/* Left: Rank */}
        {rank !== undefined && (
          <div className="flex-shrink-0 w-8 text-center">
            <span className="text-lg font-bold text-slate-400 tabular-nums">
              {rank}.
            </span>
          </div>
        )}

        {/* Middle: Airfoil Info */}
        <div className="flex-1 min-w-0">
          {/* Top row: Airfoil ID + Name */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-slate-400">
              {airfoilId}
            </span>
            <span className="text-sm font-semibold text-slate-200">
              {airfoilName}
            </span>
          </div>

          {/* Second row: Engineering headline */}
          {mode === "engineering" && engineeringSummary && (
            <p className="text-sm font-medium text-slate-300 mb-1 line-clamp-1">
              {engineeringSummary.headline}
            </p>
          )}

          {/* Third row: Pros/Caution (muted) */}
          {prosCautionText && (
            <p className="text-xs text-slate-400 line-clamp-1">
              {prosCautionText}
            </p>
          )}
        </div>

        {/* Right: Score + Mission Chips */}
        <div className="flex-shrink-0 flex flex-col items-end gap-2">
          {/* Score Chip */}
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-medium tabular-nums">
            <span>★</span>
            <span>{score.toFixed(2)}</span>
          </span>

          {/* Mission Chip */}
          {missionEmoji && missionShortLabel && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-300 border border-slate-600/50 text-xs font-medium">
              <span>{missionEmoji}</span>
              <span className="hidden sm:inline">{missionShortLabel}</span>
            </span>
          )}
        </div>
      </div>

      {/* Collapsible Reasons Section */}
      <div>
        <button
          className="rec-card__toggle w-full flex items-center justify-between text-left py-2 hover:bg-slate-800/30 rounded transition-colors"
          onClick={handleToggleClick}
        >
          <span className="text-sm font-medium text-slate-300">
            Why this airfoil?
          </span>
          <ChevronDown
            className={cn(
              "rec-card__chevron w-4 h-4 text-slate-400 transition-transform duration-200",
              isExpanded && "open rotate-180"
            )}
          />
        </button>
        
        {isExpanded && (
          <div className="rec-card__reasons mt-2 pt-2 border-t border-slate-700/50">
            {reasons.length > 0 ? (
              <ul className="space-y-1.5">
                {reasons.map((reason, idx) => (
                  <li
                    key={idx}
                    className="rec-card__reason text-sm text-slate-400 leading-relaxed"
                  >
                    • {reason}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rec-card__reason text-sm text-slate-400 italic">
                No detailed explanation, but metrics match mission constraints.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

