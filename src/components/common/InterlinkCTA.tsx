// src/components/common/InterlinkCTA.tsx
import React, { useMemo, useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  getAvailableDataForTool,
  getAvailableDataAny,
  importDataToSession,
  labelForField,
} from '@/components/tools/utils/interlink';
import { INTERLINK_PUBLISHERS, FieldKey, TOOL_ROUTES } from '@/components/tools/utils/interlinkConfig';
import { AeroCard } from '@/components/common/AeroCard';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNavigateToTool } from '@/hooks/useNavigateToTool';
import { cn } from '@/lib/utils';
import { getDesignSession, saveDesignSession } from '@/contexts/designSession';

type InlineData = Partial<Record<string, number | string>>;

type Props = {
  requiredFields: string[];
  sourceTool?: string;
  targetTool?: string;
  title?: string;
  description?: string;
  importMapping?: Record<string, string>;
  showUndo?: boolean;
  className?: string;
};

/** Find which tool publishes a given field */
function findPublisher(fieldKey: string) {
  for (const pub of INTERLINK_PUBLISHERS) {
    if (pub.publishes.includes(fieldKey as FieldKey)) {
      // Use TOOL_ROUTES for correct route
      const route = TOOL_ROUTES[pub.toolId] || `/tools/launch?tool=${pub.toolId}`;
      return {
        toolId: pub.toolId,
        label: pub.label || pub.toolId,
        path: route,
      };
    }
  }
  return null;
}

/** Get value from design session */
function getSessionValue(fieldKey: string): number | string | undefined {
  const available = getAvailableDataAny();
  return available[fieldKey as FieldKey];
}

/**
 * Inline interlink hint component - shows subtle hints below input fields
 * Supports both old API (requiredFields) and new API (fieldKey)
 * 
 * States (DERIVED, not stored):
 * - Missing data: localValue == null AND sessionValue === undefined → show redirect
 * - Data available: localValue == null AND sessionValue !== undefined → show import
 * - After import: localValue !== null AND previousValue !== null → show undo
 */
export function InlineInterlinkHint({
  requiredFields,
  sourceTool,
  className,
  fieldKey,
  currentValue,
  onImport,
  onUndo,
}: {
  requiredFields?: string[];
  sourceTool?: string;
  className?: string;
  fieldKey?: string;
  currentValue?: string | number; // Current local value from parent calculator
  onImport?: (value: number | string) => void; // Callback to update parent state on import
  onUndo?: (previousValue: number | string | null) => void; // Callback to update parent state on undo
}) {
  const navigate = useNavigate();
  const [previousValue, setPreviousValue] = useState<number | string | null>(null);
  const [sessionValue, setSessionValue] = useState<number | string | undefined>(undefined);
  
  // Support both old and new API
  const targetFieldKey = fieldKey || (requiredFields?.[0]);
  
  // Find publisher for the field
  const publisher = sourceTool 
    ? INTERLINK_PUBLISHERS.find(p => p.toolId === sourceTool)
    : targetFieldKey ? findPublisher(targetFieldKey) : null;
  
  // Helper to find the input field associated with this hint
  const findAssociatedInput = (): HTMLInputElement | HTMLTextAreaElement | null => {
    try {
      let input = document.querySelector(`input[name="${targetFieldKey}"], textarea[name="${targetFieldKey}"]`) as HTMLInputElement | HTMLTextAreaElement | null;
      if (input) return input;
      input = document.querySelector(`input#${targetFieldKey}, textarea#${targetFieldKey}`) as HTMLInputElement | HTMLTextAreaElement | null;
      if (input) return input;
      return null;
    } catch (e) {
      return null;
    }
  };
  
  // Re-evaluate available data on mount and designSession changes
  useEffect(() => {
    const updateValue = () => {
      if (!targetFieldKey) return;
      const value = getSessionValue(targetFieldKey);
      setSessionValue(value);
    };
    
    updateValue();
    
    // Listen for designSession updates (re-evaluate on any change)
    const handleUpdate = () => {
      updateValue();
    };
    
    window.addEventListener('designSessionUpdated', handleUpdate);
    return () => window.removeEventListener('designSessionUpdated', handleUpdate);
  }, [targetFieldKey]); // Removed importedValue dependency - state is derived
  
  if (!targetFieldKey || !publisher) return null;
  
  const hasData = sessionValue !== undefined && sessionValue !== null;
  
  // DERIVE local value state (null/empty means missing)
  // Use currentValue prop if provided, otherwise fallback to reading from input
  const getLocalValue = (): string | number | null => {
    if (currentValue !== undefined) {
      return currentValue === '' ? null : currentValue;
    }
    // Fallback: try to read from input field (backward compatibility)
    const input = findAssociatedInput();
    if (input) {
      const val = input.value;
      return val === '' ? null : val;
    }
    return null;
  };
  
  const localValue = getLocalValue();
  const isLocalValueEmpty = localValue === null || localValue === '';
  
  // Use TOOL_ROUTES for correct route
  const toolId = 'toolId' in publisher ? publisher.toolId : sourceTool;
  const toolPath = toolId && TOOL_ROUTES[toolId] 
    ? TOOL_ROUTES[toolId] 
    : ('path' in publisher ? publisher.path : `/tools/launch?tool=${sourceTool}`);
  const toolLabel = 'label' in publisher ? publisher.label : sourceTool;
  
  const handleImport = () => {
    if (!hasData || sessionValue === undefined) return;
    
    // Store previous value for undo - preserve type consistency
    let currentFieldValue: number | string | null = null;
    const input = findAssociatedInput();
    if (input) {
      const inputValue = input.value;
      if (inputValue === '') {
        currentFieldValue = ''; // Empty string, not null
      } else if (typeof sessionValue === 'number') {
        const parsed = parseFloat(inputValue);
        currentFieldValue = isNaN(parsed) ? inputValue : parsed;
      } else {
        currentFieldValue = inputValue;
      }
    }
    setPreviousValue(currentFieldValue);
    
    // Import data to session (this updates designSession)
    const data: Record<string, number | string> = {};
    data[targetFieldKey] = sessionValue;
    importDataToSession(data);
    
    // Notify parent component to update its state (if callback provided)
    if (onImport) {
      onImport(sessionValue);
    }
    
    // Update input field value directly as fallback (for backward compatibility)
    if (input) {
      input.value = String(sessionValue);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };
  
  const handleUndo = () => {
    // PURE LOCAL REWIND: Only restore local value, do NOT modify designSession
    if (previousValue === null) {
      // No field found or no previous value - just clear state
      setPreviousValue(null);
      if (onUndo) {
        onUndo(null);
      }
      return;
    }
    
    const input = findAssociatedInput();
    
    // Notify parent component to update its state (if callback provided)
    if (onUndo) {
      onUndo(previousValue);
    }
    
    // Restore previous local value only (as fallback for backward compatibility)
    if (previousValue === '') {
      // Previous was empty - restore to empty
      if (input) {
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    } else if (typeof previousValue === 'number' || typeof previousValue === 'string') {
      // Restore non-empty value
      if (input) {
        input.value = String(previousValue);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    
    // Clear undo state - import will be available again if session data exists
    setPreviousValue(null);
  };
  
  // STATE MACHINE: Derive state from localValue and sessionValue
  
  // Helper to compare values (handles string/number conversion)
  const valuesMatch = (local: string | number | null, session: number | string | undefined): boolean => {
    if (local === null || session === undefined) return false;
    if (typeof local === 'number' && typeof session === 'number') {
      return Math.abs(local - session) < 1e-10; // Floating point comparison
    }
    // Convert both to strings for comparison
    return String(local) === String(session);
  };
  
  // State 1: After import (show undo) - localValue has value AND we have previousValue AND values match
  const isImported = !isLocalValueEmpty && previousValue !== null && valuesMatch(localValue, sessionValue);
  if (isImported) {
    return (
      <div className={cn("text-[11px] text-cyan-400/80 mt-1 flex items-center gap-2", className)}>
        <span>Imported: {typeof sessionValue === 'number' ? sessionValue.toPrecision(4) : sessionValue}</span>
        <button
          onClick={handleUndo}
          className="text-cyan-300 hover:text-cyan-200 underline"
        >
          Undo
        </button>
      </div>
    );
  }
  
  // State 2: Data available (show import) - localValue empty AND sessionValue exists
  if (isLocalValueEmpty && hasData) {
    return (
      <div className={cn("text-[11px] text-cyan-400/60 mt-1 flex items-center gap-2", className)}>
        <span>Available from {toolLabel}: {typeof sessionValue === 'number' ? sessionValue.toPrecision(4) : sessionValue}</span>
        <button
          onClick={handleImport}
          className="text-cyan-300 hover:text-cyan-200 underline"
        >
          Import
        </button>
      </div>
    );
  }
  
  // State 3: Missing data (show redirect) - localValue empty AND sessionValue undefined
  if (isLocalValueEmpty && !hasData) {
    return (
      <button
        onClick={() => navigate(toolPath)}
        className={cn(
          "text-[11px] text-slate-400 hover:text-cyan-400 mt-1 flex items-center gap-1",
          className
        )}
      >
        Don't know? Compute in {toolLabel}
        <ArrowRight className="w-3 h-3" />
      </button>
    );
  }
  
  // State 4: Field has manual value - don't show hint
  return null;
}

export default function InterlinkCTA(props: Props) {
  const {
    requiredFields,
    sourceTool,
    targetTool,
    title,
    description,
    importMapping,
    showUndo = true,
    className,
  } = props;

  const navigate = useNavigateToTool();
  const availableFromSource = sourceTool ? getAvailableDataForTool(sourceTool) : {};
  const availableAny = getAvailableDataAny();
  const available: InlineData = Object.keys(availableFromSource).length ? availableFromSource : availableAny;

  const missing = useMemo(
    () => requiredFields.filter((f) => available[f] === undefined || available[f] === null),
    [requiredFields, available]
  );

  const [prevData, setPrevData] = useState<InlineData | null>(null);
  const [importedAt, setImportedAt] = useState<number | null>(null);

  const label = sourceTool
    ? INTERLINK_PUBLISHERS.find((p) => p.toolId === sourceTool)?.label ?? sourceTool
    : undefined;

  const goCompute = () => {
    if (sourceTool) navigate(sourceTool, { focus: 'inputs' });
    else navigate('tools');
  };

  const handleImport = () => {
    const prev = importDataToSession(available as unknown, importMapping);
    setPrevData(prev as InlineData);
    setImportedAt(Date.now());
  };

  const undoImport = () => {
    if (!prevData) return;
    importDataToSession(prevData as unknown);
    setPrevData(null);
    setImportedAt(null);
  };

  if (missing.length > 0) {
    return (
      <AeroCard title={title ?? `${labelForField(missing[0])} Needed`} className={className}>
        <div className="p-3">
          <p className="text-sm text-slate-300">
            {description ?? `This calculator requires: ${missing.map((f) => labelForField(f)).join(', ')}`}
          </p>

          <div className="mt-4 flex gap-2">
            <Button variant="default" onClick={goCompute}>
              Compute in {label}
            </Button>
            <Button variant="ghost" onClick={() => navigate('tools')}>
              View All Tools
            </Button>
          </div>
        </div>
      </AeroCard>
    );
  }

  return (
    <AeroCard title={title ?? `Data available from ${label ?? 'other calculators'}`} className={className}>
      <div className="p-3">
        <div className="grid grid-cols-2 gap-3">
          {requiredFields.map((f) => (
            <div key={f} className="flex items-center gap-2">
              <span className="text-xs text-slate-400">{labelForField(f)}</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="ml-auto text-cyan-300"
                      onClick={() => navigator.clipboard.writeText(String(available[f] ?? ''))}
                      aria-label={`Copy ${labelForField(f)}`}
                    >
                      {String(available[f] ?? '')}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copy value</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-3">
          <Button variant="default" onClick={handleImport}>
            Use this data {targetTool ? `in ${targetTool}` : ''}
          </Button>
          <Button variant="ghost" onClick={() => navigate(sourceTool ?? 'tools')}>
            View source
          </Button>
          {showUndo && importedAt && (
            <button onClick={undoImport} className="ml-auto text-slate-300 text-xs underline">
              Undo import
            </button>
          )}
        </div>

        {importedAt && <div className="mt-2 text-xs text-slate-400">Imported {new Date(importedAt).toLocaleString()}</div>}
      </div>
    </AeroCard>
  );
}
