import type { CalculationEventPayload } from '@/hooks/useToolContext';

type CalculationEventArgs = {
  toolId: string;
  toolName: string;
  // TODO: refine type for `inputs` — changed any -> unknown automatically by chore/typed-cleanup
  inputs: Record<string, unknown>;
  // TODO: refine type for `results` — changed any -> unknown automatically by chore/typed-cleanup
  results: Record<string, unknown>;
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
