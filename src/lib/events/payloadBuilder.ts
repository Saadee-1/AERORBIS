import type { CalculationEventPayload } from '@/hooks/useToolContext';

type CalculationEventArgs = {
  toolId: string;
  toolName: string;
  inputs: Record<string, any>;
  results: Record<string, any>;
  steps?: string[];
  attachments?: CalculationEventPayload['attachments'];
  metadata?: CalculationEventPayload['metadata'];
};

export function buildCalculationEvent({
  toolId,
  toolName,
  inputs,
  results,
  steps = [],
  attachments,
  metadata = {},
}: CalculationEventArgs): CalculationEventPayload {
  return {
    toolId,
    toolName,
    inputs,
    results,
    steps,
    attachments,
    metadata,
  };
}
