// src/components/common/InterlinkCTA.tsx
import React, { useMemo, useState, useEffect } from 'react';
import { ArrowRight, Link2, Check, Undo2, ArrowUpRight, HelpCircle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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

/** Explanations of tool data sharing flows for tooltips */
const FIELD_EXPLANATIONS: Record<string, string> = {
  massKg: "Aircraft MTOW / Gross Mass, calculated in Wing Loading and used here for wing loading, thrust, or climb calculations.",
  weightN: "Aircraft gravitational weight. Calculated in Wing Loading and shared here to solve level cruise lift & drag requirements.",
  wingAreaM2: "Reference wing planform area. Calculated in Wing Loading and shared here for aerodynamic sizing & performance constraints.",
  wingLoadingKgm2: "Wing loading ratio (mass/area). Calculated in Wing Sizing, imported here for thrust loading or take-off run analysis.",
  totalThrustN: "Total engine thrust. Solved in Thrust Calculator, imported here to determine thrust loading & rate of climb.",
  perEngineThrustN: "Thrust output from a single engine. Used to calculate engine-out gradient safety limits.",
  numEngines: "Total engine count, used to compute aggregate thrust and engine-out gradients.",
  cd0: "Zero-lift drag coefficient (parasite drag). Solved in L/D Analyzer, imported here to compute climb drag losses.",
  k: "Induced drag factor (k = 1/π·AR·e). Determined in L/D Analyzer, used here for climb rate estimation.",
  clMax: "Maximum lift coefficient representing stall limits. Solved in Wing Loading or L/D Analyzer.",
  ldClimb: "Aerodynamic lift-to-drag ratio (L/D) in climb. Solved in L/D Analyzer, imported here to calculate climb rate.",
  stallSpeedMs: "Minimum steady flight airspeed. Calculated in Wing Loading, imported here to set safe take-off and climb climbout limits.",
  densityKgM3: "Atmospheric air density at altitude. Solved dynamically in Atmosphere/ISA and imported here for aerodynamic forces.",
  pressurePa: "Ambient atmospheric pressure. Solved in Atmosphere/ISA and imported here for rocket nozzle pressure expansion calculations.",
  vClimbVyMs: "Speed for best rate of climb (Vy). Computed in Climb Performance, shared with other navigation tools.",
  vClimbVxMs: "Speed for best angle of climb (Vx). Computed in Climb Performance, shared with other navigation tools.",
  rocVyMs: "Best vertical rate of climb. Computed in Climb Performance, shared with other navigation tools.",
  gammaVy: "Flight path angle at best rate of climb. Computed in Climb Performance, shared with other navigation tools.",
};

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
  const [importedSessionValue, setImportedSessionValue] = useState<number | string | undefined>(undefined);
  const [preImportSessionValue, setPreImportSessionValue] = useState<number | string | undefined>(undefined);
  const [isHovered, setIsHovered] = useState(false);
  
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
    
    const handleUpdate = () => {
      updateValue();
    };
    
    window.addEventListener('designSessionUpdated', handleUpdate);
    return () => window.removeEventListener('designSessionUpdated', handleUpdate);
  }, [targetFieldKey]);
  
  if (!targetFieldKey || !publisher) return null;
  
  const hasData = sessionValue !== undefined && sessionValue !== null;
  
  const getLocalValue = (): string | number | null => {
    if (currentValue !== undefined) {
      return currentValue === '' ? null : currentValue;
    }
    const input = findAssociatedInput();
    if (input) {
      const val = input.value;
      return val === '' ? null : val;
    }
    return null;
  };
  
  const localValue = getLocalValue();
  const isLocalValueEmpty = localValue === null || localValue === '';
  
  const toolId = 'toolId' in publisher ? publisher.toolId : sourceTool;
  const toolPath = toolId && TOOL_ROUTES[toolId] 
    ? TOOL_ROUTES[toolId] 
    : ('path' in publisher ? publisher.path : `/tools/launch?tool=${sourceTool}`);
  const toolLabel = 'label' in publisher ? publisher.label : sourceTool;
  
  const valuesMatch = (local: string | number | null, session: number | string | undefined): boolean => {
    if (local === null || session === undefined) return false;
    if (typeof local === 'number' && typeof session === 'number') {
      return Math.abs(local - session) < 1e-10;
    }
    return String(local) === String(session);
  };
  
  const handleImport = () => {
    if (!hasData || sessionValue === undefined) return;
    
    let currentFieldValue: number | string | null = null;
    if (currentValue !== undefined) {
      currentFieldValue = currentValue;
    } else {
      const input = findAssociatedInput();
      if (input) {
        const inputValue = input.value;
        if (inputValue === '') {
          currentFieldValue = '';
        } else if (typeof sessionValue === 'number') {
          const parsed = parseFloat(inputValue);
          currentFieldValue = isNaN(parsed) ? inputValue : parsed;
        } else {
          currentFieldValue = inputValue;
        }
      }
    }
    setPreviousValue(currentFieldValue);
    setImportedSessionValue(sessionValue);
    
    const dsBeforeImport = getDesignSession();
    setPreImportSessionValue(dsBeforeImport[targetFieldKey as FieldKey]);
    
    const data: Record<string, number | string> = {};
    data[targetFieldKey] = sessionValue;
    importDataToSession(data);
    
    if (onImport) {
      onImport(sessionValue);
    } else {
      const input = findAssociatedInput();
      if (input) {
        input.value = String(sessionValue);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  };
  
  const handleUndo = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (previousValue === null) {
      const ds = getDesignSession();
      if (preImportSessionValue === undefined) {
        if (ds[targetFieldKey as FieldKey] !== undefined) {
          delete (ds as Record<string, unknown>)[targetFieldKey];
          saveDesignSession(ds);
        }
        if (typeof window !== 'undefined') {
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('designSessionUpdated', { detail: { source: 'undo' } }));
          }, 0);
        }
      } else {
        (ds as Record<string, string | number>)[targetFieldKey] = preImportSessionValue;
        saveDesignSession(ds);
        if (typeof window !== 'undefined') {
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('designSessionUpdated', { detail: { source: 'undo' } }));
          }, 0);
        }
      }
      setPreviousValue(null);
      setImportedSessionValue(undefined);
      setPreImportSessionValue(undefined);
      if (onUndo) {
        onUndo(null);
      }
      return;
    }
    
    const input = findAssociatedInput();
    
    if (onUndo) {
      onUndo(previousValue);
    } else {
      if (previousValue === '') {
        if (input) {
          input.value = '';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      } else if (typeof previousValue === 'number' || typeof previousValue === 'string') {
        if (input) {
          input.value = String(previousValue);
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }
    
    const ds = getDesignSession();
    if (preImportSessionValue === undefined) {
      if (ds[targetFieldKey as FieldKey] !== undefined) {
        delete (ds as Record<string, unknown>)[targetFieldKey];
        saveDesignSession(ds);
      }
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('designSessionUpdated', { detail: { source: 'undo' } }));
        }, 0);
      }
    } else {
      (ds as Record<string, string | number>)[targetFieldKey] = preImportSessionValue;
      saveDesignSession(ds);
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('designSessionUpdated', { detail: { source: 'undo' } }));
        }, 0);
      }
    }
    
    setPreviousValue(null);
    setImportedSessionValue(undefined);
    setPreImportSessionValue(undefined);
  };

  const getExplanation = () => {
    return FIELD_EXPLANATIONS[targetFieldKey] || `Active interlink variable sharing values between tools.`;
  };

  const isImported = !isLocalValueEmpty && previousValue !== null && importedSessionValue !== undefined && valuesMatch(localValue, importedSessionValue);
  
  let pillState: 'imported' | 'available' | 'updated' | 'override' | 'missing' | 'none' = 'none';
  if (isImported) {
    pillState = 'imported';
  } else if (isLocalValueEmpty && hasData) {
    pillState = 'available';
  } else if (previousValue !== null && hasData && !valuesMatch(localValue, sessionValue) && 
             importedSessionValue !== undefined && !valuesMatch(importedSessionValue, sessionValue)) {
    pillState = 'updated';
  } else if (!isLocalValueEmpty && hasData && !valuesMatch(localValue, sessionValue)) {
    pillState = 'override';
  } else if (isLocalValueEmpty && !hasData) {
    pillState = 'missing';
  }

  if (pillState === 'none') return null;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("mt-1.5 flex select-none", className)}>
            <AnimatePresence mode="wait">
              {pillState === 'imported' && (
                <motion.div
                  key="imported"
                  initial={{ opacity: 0, y: -2, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 2, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.08)]"
                >
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  <span>Synced: <strong className="font-mono">{typeof importedSessionValue === 'number' ? importedSessionValue.toPrecision(4) : importedSessionValue}</strong></span>
                  <span className="opacity-30">|</span>
                  <button
                    onClick={handleUndo}
                    className="flex items-center gap-0.5 text-emerald-400 hover:text-emerald-200 transition-colors hover:underline"
                    aria-label="Undo import"
                  >
                    <Undo2 className="w-2.5 h-2.5" />
                    <span>Undo</span>
                  </button>
                </motion.div>
              )}

              {(pillState === 'available' || pillState === 'updated') && (
                <motion.div
                  key="available"
                  initial={{ opacity: 0, y: -2, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 2, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  onClick={handleImport}
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/15 hover:border-indigo-400/40 cursor-pointer shadow-[0_0_6px_rgba(99,102,241,0.06)] hover:shadow-[0_0_10px_rgba(99,102,241,0.2)] group"
                >
                  <Link2 className="w-3 h-3 text-indigo-400/80 animate-pulse group-hover:scale-110 transition-transform" />
                  <span>
                    {pillState === 'updated' ? 'New Value' : 'From'} {toolLabel}:{' '}
                    <strong className="font-mono">{typeof sessionValue === 'number' ? sessionValue.toPrecision(4) : sessionValue}</strong>
                  </span>
                  <span className="opacity-30">|</span>
                  <span className="text-indigo-400/80 underline font-medium hover:text-indigo-200 transition-colors flex items-center gap-0.5">
                    Sync <RefreshCw className={cn("w-2.5 h-2.5 transition-transform duration-500", isHovered && "rotate-180")} />
                  </span>
                </motion.div>
              )}

              {pillState === 'override' && (
                <motion.div
                  key="override"
                  initial={{ opacity: 0, y: -2, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 2, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  onClick={handleImport}
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all bg-slate-800/60 border border-slate-700 hover:border-indigo-500/40 text-slate-400 hover:text-indigo-300 hover:bg-slate-800/80 cursor-pointer shadow-[0_0_6px_rgba(0,0,0,0.1)] group"
                >
                  <Link2 className="w-3 h-3 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                  <span>From {toolLabel}: <strong className="font-mono">{typeof sessionValue === 'number' ? sessionValue.toPrecision(4) : sessionValue}</strong></span>
                  <span className="opacity-30">|</span>
                  <span className="text-indigo-400/80 underline font-medium hover:text-indigo-200 transition-colors flex items-center gap-0.5">
                    Sync <RefreshCw className={cn("w-2.5 h-2.5 transition-transform duration-500", isHovered && "rotate-180")} />
                  </span>
                </motion.div>
              )}

              {pillState === 'missing' && (
                <motion.div
                  key="missing"
                  initial={{ opacity: 0, y: -2, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 2, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => navigate(toolPath)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all border border-dashed border-slate-700/60 hover:border-indigo-500/40 text-slate-400 hover:text-indigo-300 hover:bg-slate-900/40 cursor-pointer group"
                >
                  <ArrowUpRight className="w-3 h-3 opacity-60 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  <span>Calculate in {toolLabel}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-slate-950 border border-slate-800 text-slate-200 p-2.5 max-w-[280px] rounded shadow-xl backdrop-blur-md">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-indigo-400 font-medium text-xs">
              <Link2 className="w-3 h-3" />
              <span>Interlink Active: {labelForField(targetFieldKey)}</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-normal">{getExplanation()}</p>
            <div className="pt-1 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
              <span>Source: {toolLabel}</span>
              {pillState === 'imported' && <span className="text-emerald-400 font-medium">✓ Active</span>}
              {pillState === 'available' && <span className="text-indigo-400 font-medium">● Available to sync</span>}
              {pillState === 'override' && <span className="text-amber-400 font-medium">▲ Different from session</span>}
              {pillState === 'missing' && <span className="text-slate-500 font-medium">○ Uncalculated</span>}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
                      className="ml-auto text-primary"
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
