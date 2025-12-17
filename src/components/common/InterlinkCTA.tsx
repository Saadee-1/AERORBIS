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
 * States:
 * - Missing data: Shows link to compute in source tool
 * - Data available: Shows available value with import option
 * - After import: Shows undo option
 */
export function InlineInterlinkHint({
  requiredFields,
  sourceTool,
  className,
  fieldKey,
}: {
  requiredFields?: string[];
  sourceTool?: string;
  className?: string;
  fieldKey?: string;
}) {
  const navigate = useNavigate();
  const [importedValue, setImportedValue] = useState<number | string | null>(null);
  const [previousValue, setPreviousValue] = useState<number | string | null>(null);
  const [sessionValue, setSessionValue] = useState<number | string | undefined>(undefined);
  
  // Support both old and new API
  const targetFieldKey = fieldKey || (requiredFields?.[0]);
  
  // Find publisher for the field
  const publisher = sourceTool 
    ? INTERLINK_PUBLISHERS.find(p => p.toolId === sourceTool)
    : targetFieldKey ? findPublisher(targetFieldKey) : null;
  
  // Re-evaluate available data on mount and designSession changes
  useEffect(() => {
    const updateValue = () => {
      if (!targetFieldKey) return;
      const value = getSessionValue(targetFieldKey);
      setSessionValue(value);
    };
    
    updateValue();
    
    // Listen for designSession updates
    const handleUpdate = () => {
      updateValue();
      // Reset imported state if session value changes externally
      if (importedValue !== null) {
        const current = getSessionValue(targetFieldKey);
        if (current !== importedValue) {
          setImportedValue(null);
          setPreviousValue(null);
        }
      }
    };
    
    window.addEventListener('designSessionUpdated', handleUpdate);
    return () => window.removeEventListener('designSessionUpdated', handleUpdate);
  }, [targetFieldKey, importedValue]);
  
  if (!targetFieldKey || !publisher) return null;
  
  const hasData = sessionValue !== undefined && sessionValue !== null;
  
  // Use TOOL_ROUTES for correct route
  const toolId = 'toolId' in publisher ? publisher.toolId : sourceTool;
  const toolPath = toolId && TOOL_ROUTES[toolId] 
    ? TOOL_ROUTES[toolId] 
    : ('path' in publisher ? publisher.path : `/tools/launch?tool=${sourceTool}`);
  const toolLabel = 'label' in publisher ? publisher.label : sourceTool;
  
  // Helper to find the input field associated with this hint
  // Note: This works best if inputs have name attributes matching fieldKey
  // If not found, designSession is still updated which is the main requirement
  const findAssociatedInput = (): HTMLInputElement | HTMLTextAreaElement | null => {
    try {
      // Try by name attribute first (most reliable)
      let input = document.querySelector(`input[name="${targetFieldKey}"], textarea[name="${targetFieldKey}"]`) as HTMLInputElement | HTMLTextAreaElement | null;
      if (input) return input;
      
      // Try by id matching fieldKey
      input = document.querySelector(`input#${targetFieldKey}, textarea#${targetFieldKey}`) as HTMLInputElement | HTMLTextAreaElement | null;
      if (input) return input;
      
      return null;
    } catch (e) {
      return null;
    }
  };
  
  const handleImport = () => {
    if (!hasData || sessionValue === undefined) return;
    
    // Store previous value for undo - preserve type consistency
    // Use null only when no input field is found, use empty string for empty fields
    let currentFieldValue: number | string | null = null;
    const input = findAssociatedInput();
    if (input) {
      const inputValue = input.value;
      // If input field exists but is empty, use empty string (not null)
      // This distinguishes "no field found" (null) from "empty field" ('')
      if (inputValue === '') {
        currentFieldValue = ''; // Empty string, not null
      } else if (typeof sessionValue === 'number') {
        // Try to parse as number to preserve type consistency
        const parsed = parseFloat(inputValue);
        currentFieldValue = isNaN(parsed) ? inputValue : parsed;
      } else {
        // sessionValue is a string, keep input.value as string
        currentFieldValue = inputValue;
      }
    }
    // If input is null, currentFieldValue remains null (no field found)
    setPreviousValue(currentFieldValue);
    
    // Import data to session (this updates designSession)
    const data: Record<string, number | string> = {};
    data[targetFieldKey] = sessionValue;
    importDataToSession(data);
    
    // Also update input field value directly so user sees it immediately
    if (input) {
      input.value = String(sessionValue);
      // Trigger change event so React state updates
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    // Track imported value
    setImportedValue(sessionValue);
  };
  
  const handleUndo = () => {
    // If previousValue is null, it means no input field was found during import
    // We still need to clean up the imported data from designSession
    if (previousValue === null) {
      // Remove the imported data from designSession
      const ds = getDesignSession();
      delete (ds as Record<string, unknown>)[targetFieldKey];
      saveDesignSession(ds);
      window.dispatchEvent(new CustomEvent('designSessionUpdated', { detail: { source: 'undo' } }));
      
      // Reset state
      setImportedValue(null);
      setPreviousValue(null);
      return;
    }
    
    const input = findAssociatedInput();
    
    // Restore previous value to designSession
    const data: Record<string, number | string> = {};
    // Handle empty string case (empty field) separately from null (no field found)
    if (previousValue === '') {
      // Previous was empty, remove from session
      const ds = getDesignSession();
      delete (ds as Record<string, unknown>)[targetFieldKey];
      saveDesignSession(ds);
      window.dispatchEvent(new CustomEvent('designSessionUpdated', { detail: { source: 'undo' } }));
      
      // Also restore input field value to empty
      if (input) {
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    } else if (typeof previousValue === 'number' || typeof previousValue === 'string') {
      // Restore non-empty value
      data[targetFieldKey] = previousValue;
      importDataToSession(data);
      
      // Also restore input field value
      if (input) {
        input.value = String(previousValue);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    
    setImportedValue(null);
    setPreviousValue(null);
  };
  
  // After import: show undo option
  if (importedValue !== null) {
    return (
      <div className={cn("text-[11px] text-cyan-400/80 mt-1 flex items-center gap-2", className)}>
        <span>Imported: {typeof importedValue === 'number' ? importedValue.toPrecision(4) : importedValue}</span>
        <button
          onClick={handleUndo}
          className="text-cyan-300 hover:text-cyan-200 underline"
        >
          Undo
        </button>
      </div>
    );
  }
  
  // Data available: show import option
  if (hasData) {
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
  
  // Missing data: show link to compute
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
