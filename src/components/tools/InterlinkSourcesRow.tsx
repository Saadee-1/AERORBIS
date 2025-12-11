/**
 * InterlinkSourcesRow Component
 * 
 * Displays a compact row of pills showing available data sources
 * that can provide fields needed by the current calculator.
 */

"use client";

import React from "react";
import { SourceInfo } from "./utils/interlink";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface InterlinkSourcesRowProps {
  /** List of available sources */
  sources: SourceInfo[];
  /** Callback when a source is selected */
  onSelectSource?: (sourceId: string) => void;
  /** Whether to show in compact mode */
  compact?: boolean;
}

export function InterlinkSourcesRow({
  sources,
  onSelectSource,
  compact = false,
}: InterlinkSourcesRowProps) {
  if (sources.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-2 items-center mb-3">
        <span className="text-xs text-slate-400 mr-1">Data sources:</span>
        {sources.map((source) => {
          const fieldsText = source.fields.map((f) => f.label).join(", ");
          const tooltipText = `Provides ${fieldsText} from last ${source.name} run`;

          const pillContent = (
            <button
              key={source.id}
              onClick={() => onSelectSource?.(source.id)}
              className="px-3 py-1 rounded-full bg-slate-800/60 border border-slate-700 flex items-center gap-2 hover:scale-105 hover:border-cyan-400/50 transition-all duration-200 group"
              aria-label={`View data from ${source.name}`}
            >
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ background: source.color || "#06b6d4" }}
              />
              <span className="text-xs text-slate-100 font-medium">{source.name}</span>
              {!compact && source.fields.length > 0 && (
                <span className="text-[11px] text-slate-300 ml-1">
                  {fieldsText}
                </span>
              )}
            </button>
          );

          if (compact) {
            return (
              <Tooltip key={source.id}>
                <TooltipTrigger asChild>{pillContent}</TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{tooltipText}</p>
                  {source.fields.length > 0 && (
                    <p className="text-[11px] text-slate-300 mt-1">
                      Fields: {fieldsText}
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          }

          return pillContent;
        })}
      </div>
    </TooltipProvider>
  );
}

