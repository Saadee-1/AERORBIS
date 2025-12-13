// src/components/common/InterlinkCTA.tsx
import React, { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  getAvailableDataForTool,
  getAvailableDataAny,
  importDataToSession,
  labelForField,
} from '@/components/tools/utils/interlink';
import { INTERLINK_PUBLISHERS, FieldKey } from '@/components/tools/utils/interlinkConfig';
import { AeroCard } from '@/components/common/AeroCard';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNavigateToTool } from '@/hooks/useNavigateToTool';
import { cn } from '@/lib/utils';

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
      return {
        toolId: pub.toolId,
        label: pub.label || pub.toolId,
        path: `/tools/launch?tool=${pub.toolId}`,
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
  
  // Support both old and new API
  const targetFieldKey = fieldKey || (requiredFields?.[0]);
  if (!targetFieldKey) return null;
  
  // Find publisher for the field
  const publisher = sourceTool 
    ? INTERLINK_PUBLISHERS.find(p => p.toolId === sourceTool)
    : findPublisher(targetFieldKey);
  
  if (!publisher) return null;
  
  const sessionValue = getSessionValue(targetFieldKey);
  const hasData = sessionValue !== undefined && sessionValue !== null;
  
  const toolLabel = 'label' in publisher ? publisher.label : sourceTool;
  const toolPath = 'path' in publisher ? publisher.path : `/tools/launch?tool=${sourceTool}`;
  
  if (hasData) {
    return (
      <div className={cn("text-[11px] text-cyan-400/60 mt-1", className)}>
        Available from {toolLabel}: {typeof sessionValue === 'number' ? sessionValue.toPrecision(4) : sessionValue}
      </div>
    );
  }
  
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
