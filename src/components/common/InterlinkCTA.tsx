import React, { useMemo, useState } from 'react';
import { getAvailableDataForTool, importDataToSession, labelForField, getAvailableDataAny } from '@/components/tools/utils/interlink';
import { INTERLINK_PUBLISHERS } from '@/components/tools/utils/interlinkConfig';
import { AeroCard } from '@/components/common/AeroCard';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNavigateToTool } from '@/hooks/useNavigateToTool';

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

export default function InterlinkCTA(props: Props) {
  const { requiredFields, sourceTool, targetTool, title, description, importMapping, showUndo = true, className } = props;

  const navigate = useNavigateToTool();
  const availableFromSource = sourceTool ? getAvailableDataForTool(sourceTool) : {};
  const availableAny = getAvailableDataAny();
  const available = Object.keys(availableFromSource).length ? availableFromSource : availableAny;

  const missing = useMemo(
    () => requiredFields.filter((f) => available[f] === undefined),
    [requiredFields, available]
  );

  const [prevData, setPrevData] = useState<any>(null);
  const [importedAt, setImportedAt] = useState<number | null>(null);

  const label = sourceTool
    ? INTERLINK_PUBLISHERS.find((p) => p.toolId === sourceTool)?.label ?? sourceTool
    : undefined;

  const goCompute = () => {
    if (sourceTool) navigate(sourceTool, { focus: 'inputs' });
    else navigate('tools');
  };

  const handleImport = () => {
    const prev = importDataToSession(available as any, importMapping);
    setPrevData(prev);
    setImportedAt(Date.now());
  };

  const undoImport = () => {
    if (!prevData) return;
    importDataToSession(prevData as any);
    setPrevData(null);
    setImportedAt(null);
  };

  if (missing.length > 0) {
    return (
      <AeroCard title={title ?? `${labelForField(missing[0])} Needed`} className={className}>
        <div className="p-3">
          <p className="text-sm text-slate-300">
            {description ??
              `This calculator requires: ${missing.map((f) => labelForField(f)).join(', ')}`}
          </p>

          <div className="mt-4 flex gap-2">
            <Button onClick={goCompute}>
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
    <AeroCard
      title={title ?? `Data available from ${label ?? 'other calculators'}`}
      className={className}
    >
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
                      onClick={() => navigator.clipboard.writeText(String(available[f]))}
                    >
                      {String(available[f])}
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
          <Button onClick={handleImport}>
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
      </div>
    </AeroCard>
  );
}

/**
 * Inline interlink hint component for displaying available data inline
 */
export function InlineInterlinkHint({
  requiredFields,
  sourceTool,
  className,
}: {
  requiredFields: string[];
  sourceTool?: string;
  className?: string;
}) {
  const navigate = useNavigateToTool();
  const availableFromSource = sourceTool ? getAvailableDataForTool(sourceTool) : {};
  const availableAny = getAvailableDataAny();
  const available = Object.keys(availableFromSource).length ? availableFromSource : availableAny;

  const missing = useMemo(
    () => requiredFields.filter((f) => available[f] === undefined),
    [requiredFields, available]
  );

  const label = sourceTool
    ? INTERLINK_PUBLISHERS.find((p) => p.toolId === sourceTool)?.label ?? sourceTool
    : undefined;

  if (missing.length === 0) {
    return null; // Don't show if all fields are available
  }

  return (
    <span className={`text-xs text-slate-400 ${className || ''}`}>
      Missing {missing.map((f) => labelForField(f)).join(', ')}.
      <button
        onClick={() => navigate(sourceTool ?? 'tools', { focus: 'inputs' })}
        className="ml-1 text-cyan-400 hover:underline"
      >
        Compute in {label ?? 'other calculators'}
      </button>
    </span>
  );
}

