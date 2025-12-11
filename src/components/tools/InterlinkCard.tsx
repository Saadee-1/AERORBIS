/**
 * InterlinkCard Component
 * 
 * Displays a card when reusable data from other calculators is available.
 * Allows users to import that data into the current calculator.
 */

"use client";

import React, { useState } from "react";
import { Link2, X } from "lucide-react";
import { AeroCard } from "@/components/common/AeroCard";
import { Button } from "@/components/ui/button";
import { 
  ReusableData, 
  getReusableDataSummary, 
  hasReusableData,
  applyReusableDataToState,
  StateSetters 
} from "./utils/interlink";
import { DesignSessionData } from "@/contexts/designSession";

export interface InterlinkCardProps {
  /** Reusable data to display */
  reusableData: ReusableData;
  /** State setters for applying data */
  setters: StateSetters;
  /** Title for the card */
  title?: string;
  /** Description text */
  description?: string;
  /** Source name (e.g., "Wing Loading", "Lift/Drag Analyzer") */
  sourceName?: string;
  /** Additional options */
  options?: {
    weightMode?: 'mass' | 'weight';
    unitSystem?: 'SI' | 'Imperial';
    onApplied?: (keys: string[]) => void;
    onDismiss?: () => void;
  };
  /** Whether to show dismiss button */
  showDismiss?: boolean;
}

export function InterlinkCard({
  reusableData,
  setters,
  title,
  description,
  sourceName = "Wing Loading",
  options,
  showDismiss = false,
}: InterlinkCardProps) {
  const [dismissed, setDismissed] = useState(false);
  const [imported, setImported] = useState(false);

  if (!hasReusableData(reusableData) || dismissed) {
    return null;
  }

  const summary = getReusableDataSummary(reusableData);
  const cardTitle = title || `${sourceName} data available`;
  const cardDescription = description || `Reuse data from your last ${sourceName} run.`;

  const handleUse = () => {
    const appliedKeys = applyReusableDataToState(reusableData, setters, {
      weightMode: options?.weightMode,
      unitSystem: options?.unitSystem,
      onApplied: (keys) => {
        setImported(true);
        console.info('[Interlink] Applied reused data from', sourceName, 'keys:', keys);
        if (options?.onApplied) {
          options.onApplied(keys);
        }
      },
    });
  };

  const handleDismiss = () => {
    setDismissed(true);
    if (options?.onDismiss) {
      options.onDismiss();
    }
  };

  const handleUndo = () => {
    setImported(false);
    // Clear imported fields - this would need to be implemented per calculator
    // For now, just reset the flag
  };

  return (
    <AeroCard
      title={cardTitle}
      description={cardDescription}
      icon={Link2}
      className="mb-4"
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <span className="text-xs text-slate-300">
            {summary}
          </span>
          {showDismiss && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="h-6 px-2 text-xs text-slate-400 hover:text-slate-200"
              aria-label={`Dismiss ${sourceName} data card`}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleUse}
            disabled={imported}
            className="border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/10"
            aria-label={`Use ${sourceName} data in this calculator`}
          >
            {imported ? 'Imported' : 'Use in this calculator'}
          </Button>
          
          {imported && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleUndo}
              className="h-7 px-2 text-xs text-slate-400 hover:text-slate-200"
            >
              Undo
            </Button>
          )}
        </div>
        
        {imported && (
          <div className="text-xs text-cyan-400/70 flex items-center gap-1">
            <span>✓</span>
            <span>Imported from {sourceName}</span>
          </div>
        )}
      </div>
    </AeroCard>
  );
}

