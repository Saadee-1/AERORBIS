/**
 * InterlinkCard Component
 * 
 * Displays a card when reusable data from other calculators is available.
 * Allows users to import that data into the current calculator.
 */

"use client";

import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Link2, X, ArrowRight, Undo2 } from "lucide-react";
import { AeroCard } from "@/components/common/AeroCard";
import { Button } from "@/components/ui/button";
import { 
  ReusableData, 
  getReusableDataSummary, 
  hasReusableData,
  applyReusableDataToSetters,
  StateSetters,
  SourceInfo
} from "./utils/interlink";
import { DesignSessionData } from "@/contexts/designSession";

export interface InterlinkCardProps {
  /** Reusable data to display */
  reusableData: ReusableData;
  /** State setters for applying data */
  setters: StateSetters;
  /** Source information */
  sourceInfo?: SourceInfo;
  /** Title for the card */
  title?: string;
  /** Description text */
  description?: string;
  /** Source name (e.g., "Wing Loading", "Lift/Drag Analyzer") */
  sourceName?: string;
  /** Current tool ID for return flow */
  currentToolId?: string;
  /** Function to get current values for undo */
  getCurrentValues?: () => Record<string, any>;
  /** Additional options */
  options?: {
    weightMode?: 'mass' | 'weight';
    unitSystem?: 'SI' | 'Imperial';
    onApplied?: (keys: string[], previousValues: Record<string, any>) => void;
    onDismiss?: () => void;
    onUndo?: (previousValues: Record<string, any>) => void;
  };
  /** Whether to show dismiss button */
  showDismiss?: boolean;
  /** Whether data is already imported */
  imported?: boolean;
  /** Previous values for undo */
  previousValues?: Record<string, any>;
}

export function InterlinkCard({
  reusableData,
  setters,
  sourceInfo,
  title,
  description,
  sourceName,
  currentToolId,
  getCurrentValues,
  options,
  showDismiss = false,
  imported: importedProp,
  previousValues: previousValuesProp,
}: InterlinkCardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [dismissed, setDismissed] = useState(false);
  const [imported, setImported] = useState(importedProp || false);
  const [previousValues, setPreviousValues] = useState<Record<string, any>>(previousValuesProp || {});

  const effectiveSourceName = sourceInfo?.name || sourceName || "Wing Loading";
  const sourcePath = sourceInfo?.path || '/tools/launch?tool=wing';

  if (!hasReusableData(reusableData) || dismissed) {
    return null;
  }

  const summary = getReusableDataSummary(reusableData);
  const cardTitle = title || `Data available from other calculators`;
  const cardDescription = description || `Detected results you can reuse — import values or calculate them in the source tool and return.`;

  const handleUse = () => {
    const { appliedKeys, previousValues: prevVals } = applyReusableDataToSetters(
      reusableData,
      setters,
      getCurrentValues
    );
    
    setPreviousValues(prevVals);
    setImported(true);
    console.info('[Interlink] Applied reused data from', effectiveSourceName, 'keys:', appliedKeys);
    
    if (options?.onApplied) {
      options.onApplied(appliedKeys, prevVals);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    if (options?.onDismiss) {
      options.onDismiss();
    }
  };

  const handleUndo = () => {
    // Restore previous values
    if (options?.onUndo && Object.keys(previousValues).length > 0) {
      options.onUndo(previousValues);
    }
    setImported(false);
    setPreviousValues({});
  };

  const handleGoCalculate = () => {
    const returnTo = location.pathname + location.search;
    const referrer = currentToolId || 'unknown';
    const targetPath = `${sourcePath}${sourcePath.includes('?') ? '&' : '?'}referrer=${referrer}&returnTo=${encodeURIComponent(returnTo)}`;
    navigate(targetPath);
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
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-300">
              {summary}
            </span>
            {sourceInfo && (
              <span className="text-[11px] text-slate-400">
                Source: {effectiveSourceName}
              </span>
            )}
          </div>
          {showDismiss && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="h-6 px-2 text-xs text-slate-400 hover:text-slate-200"
              aria-label={`Dismiss ${effectiveSourceName} data card`}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleUse}
            disabled={imported}
            className="border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/10"
            aria-label={`Use ${effectiveSourceName} data in this calculator`}
          >
            {imported ? `Imported from ${effectiveSourceName}` : 'Use in this calculator'}
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={handleGoCalculate}
            className="border-slate-600/40 text-slate-300 hover:bg-slate-700/50 flex items-center gap-1"
            aria-label={`Go to ${effectiveSourceName} calculator`}
          >
            Go calculate it
            <ArrowRight className="w-3 h-3" />
          </Button>
          
          {imported && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleUndo}
              className="h-7 px-2 text-xs text-yellow-400 hover:bg-yellow-400/10 flex items-center gap-1"
              aria-label="Undo import"
            >
              <Undo2 className="w-3 h-3" />
              Undo
            </Button>
          )}
        </div>
        
        {imported && (
          <div className="text-xs text-emerald-400/70 flex items-center gap-1">
            <span>✓</span>
            <span>Imported {Object.keys(previousValues).length} fields from {effectiveSourceName}</span>
          </div>
        )}
      </div>
    </AeroCard>
  );
}

