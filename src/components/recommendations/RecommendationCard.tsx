"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RecommendationCardProps {
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
}

export function RecommendationCard({
  airfoilName,
  mode,
  score,
  reasons,
  metrics,
  isFallback = false,
  selected = false,
  onSelect,
}: RecommendationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Generate tags from metrics
  const tags: Array<{ label: string; warning?: boolean }> = [];
  
  if (metrics) {
    if (metrics.ldMax !== undefined) {
      if (metrics.ldMax >= 80) {
        tags.push({ label: "Very high L/D" });
      } else if (metrics.ldMax >= 60) {
        tags.push({ label: "High L/D" });
      }
    }
    
    if (metrics.clTarget !== undefined && metrics.clAtTarget !== undefined) {
      const diff = Math.abs(metrics.clAtTarget - metrics.clTarget);
      if (diff <= 0.05) {
        tags.push({ label: "Meets CL target" });
      }
    }
    
    if (metrics.alphaStallDeg !== undefined && metrics.alphaStallDeg >= 14) {
      tags.push({ label: "Good stall margin" });
    }
    
    if (metrics.cdAtTarget !== undefined && metrics.cdAtTarget <= 0.015) {
      tags.push({ label: "Low drag at CL target" });
    }
    
    if (metrics.cmAtTarget !== undefined && metrics.cmAtTarget < -0.1) {
      tags.push({ label: "Strong nose-down Cm", warning: true });
    }
  }

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

  // Determine badge type
  const badgeType = isFallback 
    ? "fallback" 
    : mode === "smart-ai" 
    ? "ai" 
    : "engineering";

  return (
    <div
      className={cn(
        "rec-card rounded-lg border bg-slate-900/50 p-4 transition-all cursor-pointer",
        selected 
          ? "rec-card--selected border-cyan-400 bg-slate-800/70 shadow-lg shadow-cyan-500/20" 
          : "border-slate-700 hover:border-slate-600 hover:bg-slate-800/40"
      )}
      onClick={handleCardClick}
    >
      {/* Header */}
      <div className="rec-card__header flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-base font-semibold text-slate-200 truncate">
              {airfoilName}
            </h3>
            <span className="text-sm font-medium text-cyan-400 tabular-nums">
              ★ {score.toFixed(2)}
            </span>
          </div>
          
          {/* Badge */}
          <div className="flex items-center gap-2 mb-2">
            {badgeType === "engineering" && (
              <span className="rec-badge--engineering inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Engineering mode
              </span>
            )}
            {badgeType === "ai" && (
              <span className="rec-badge--ai inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-violet-500/20 text-violet-300 border border-violet-500/30">
                Smart AI
              </span>
            )}
            {badgeType === "fallback" && (
              <span className="rec-badge--fallback inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                AI (engineering fallback)
              </span>
            )}
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((tag, idx) => (
                <span
                  key={idx}
                  className={cn(
                    "rec-tag inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                    tag.warning
                      ? "rec-tag--warning bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "bg-slate-700/50 text-slate-300 border border-slate-600/50"
                  )}
                >
                  {tag.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      {metrics && (
        <div className="rec-card__metrics flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-400 mb-3 pb-3 border-b border-slate-700/50">
          <div>
            <span className="text-slate-500">Re:</span>{" "}
            <span className="text-cyan-400 font-mono">
              {metrics.reynolds.toLocaleString()}
            </span>
          </div>
          {metrics.clTarget !== undefined && (
            <div>
              <span className="text-slate-500">CL target:</span>{" "}
              <span className="text-cyan-400 font-mono">
                {metrics.clTarget.toFixed(3)}
              </span>
            </div>
          )}
          {metrics.ldMax !== undefined && (
            <div>
              <span className="text-slate-500">L/D max:</span>{" "}
              <span className="text-cyan-400 font-mono">
                {metrics.ldMax.toFixed(1)}
              </span>
            </div>
          )}
          {metrics.clMax !== undefined && (
            <div>
              <span className="text-slate-500">CL max:</span>{" "}
              <span className="text-cyan-400 font-mono">
                {metrics.clMax.toFixed(3)}
              </span>
            </div>
          )}
          {metrics.alphaStallDeg !== undefined && (
            <div>
              <span className="text-slate-500">α stall:</span>{" "}
              <span className="text-cyan-400 font-mono">
                {metrics.alphaStallDeg.toFixed(1)}°
              </span>
            </div>
          )}
        </div>
      )}

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

