import { useCallback } from "react";
import { useAIAssistant, ToolContext } from "@/contexts/AIAssistantContext";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export interface CalculationEventPayload {
  toolId: string;
  toolName: string;
  // TODO: refine type for `inputs` — changed any -> unknown automatically by chore/typed-cleanup
  inputs: Record<string, unknown>;
  // TODO: refine type for `results` — changed any -> unknown automatically by chore/typed-cleanup
  results: Record<string, unknown>;
  steps?: string[];
  attachments?: {
    charts?: Array<{ mime: string; data: string }>;
    files?: Array<{ name: string; url: string }>;
  };
  metadata?: {
    units?: string;
    approxLevel?: string;
    confidence?: string;
    warnings?: string[];
  };
}

export interface CalculationEventResponse {
  ack: boolean;
  requestId: string;
  explanationId: string;
  summary: string;
  recommendations: string[];
}

/**
 * Hook for tools to easily update AI Assistant context with their results
 * and send calculation events to the assistant
 *
 * Usage in a tool component:
 * ```tsx
 * const { updateToolContext, sendCalculationEvent, clearToolContext } = useToolContext();
 *
 * // After calculation:
 * const eventResponse = await sendCalculationEvent({
 *   toolId: "thrust-calculator",
 *   toolName: "Thrust Calculator",
 *   inputs: { massFlow: 10, exhaustVelocity: 3000 },
 *   results: { thrust: 30000 },
 *   steps: ["T = ṁ × Ve", "T = 10 × 3000 = 30000 N"]
 * });
 *
 * updateToolContext({
 *   tool: "Thrust",
 *   inputs: { massFlow: 10, exhaustVelocity: 3000 },
 *   results: { thrust: 30000 }
 * });
 * ```
 */
export const useToolContext = () => {
  const { setToolContext, setIsOpen } = useAIAssistant();
  const { user } = useAuth();

  const sendCalculationEvent = useCallback(
    async (
      payload: CalculationEventPayload,
    ): Promise<CalculationEventResponse | null> => {
      // Always generate requestId first, so we can return it even if the event fails
      const requestId = `calc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const userId = "user-" + (localStorage.getItem("userId") || "anonymous");

      const event = {
        eventType: "calculation.complete" as const,
        ...payload,
        requestId,
        userId,
        timestamp: new Date().toISOString(),
      };

      // Create fallback response function
      const createFallbackResponse = (): CalculationEventResponse => {
        const fallbackResponse: CalculationEventResponse = {
          ack: false,
          requestId,
          explanationId: `exp-${requestId}`,
          summary: `${payload.toolName} calculation completed (offline mode).`,
          recommendations: [],
        };
        const storageData = {
          ...event,
          ...fallbackResponse,
          storedAt: Date.now(),
          expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
        };
        localStorage.setItem(`calc-${requestId}`, JSON.stringify(storageData));
        return fallbackResponse;
      };

      // Always store locally first (even before trying to send to server)
      const fallbackResponse = createFallbackResponse();

      // Show save CTA toast once per session for non-signed-in users
      if (!user) {
        const toastShown = sessionStorage.getItem('calcToastShown');
        if (!toastShown) {
          sessionStorage.setItem('calcToastShown', 'true');
          toast('Save your calculations for future reference', {
            description: 'Create a free account to save results, presets and history.',
            duration: 8000,
            action: {
              label: 'Sign Up Free',
              onClick: () => window.location.href = '/auth',
            },
          });
        }
      }

      return fallbackResponse;
    },
    [],
  );

  // Send calculation update event (for streaming/partial updates)
  const sendCalculationUpdate = useCallback(
    async (
      requestId: string,
      payload: {
        progress?: number;
        // TODO: refine type for `intermediateResults` — changed any -> unknown automatically by chore/typed-cleanup
        intermediateResults?: Record<string, unknown>;
        sequenceId: number;
        isFinal?: boolean;
      },
    ): Promise<boolean> => {
      return true;
    },
    [],
  );

  const updateToolContext = useCallback(
    // TODO: refine type for `context` — changed any -> unknown automatically by chore/typed-cleanup
    (context: unknown) => {
      // Backwards-compatible normalizer:
      // Converts any legacy or partial tool context into the new canonical format:
      // { tool: string, inputs: Record<string, unknown>, results: Record<string, unknown> }

      try {
        // Define the normalized context type
        interface NormalizedContext {
          tool: string;
          inputs: Record<string, unknown>;
          results: Record<string, unknown> & { metadata?: unknown };
        }
        
        let normalized: NormalizedContext;

        // Case 1 — already correct
        if (
          context &&
          typeof context === "object" &&
          "tool" in context &&
          "inputs" in context &&
          "results" in context
        ) {
          const ctx = context as { tool: unknown; inputs: unknown; results: unknown };
          normalized = {
            tool: String(ctx.tool || "Unknown"),
            inputs: (ctx.inputs as Record<string, unknown>) || {},
            results: (ctx.results as Record<string, unknown>) || {},
          };

          // Case 2 — legacy shape: { toolName, lastCalculation }
        } else if (
          context &&
          typeof context === "object" &&
          "toolName" in context &&
          "lastCalculation" in context
        ) {
          const ctx = context as { toolName?: string; tool?: string; inputs?: Record<string, unknown>; results?: Record<string, unknown>; lastCalculation?: { inputs?: Record<string, unknown>; results?: Record<string, unknown>; payload?: unknown; toolId?: string } };
          const last = ctx.lastCalculation || {};
          normalized = {
            tool: ctx.tool || ctx.toolName || "Unknown",
            inputs: last.inputs || ctx.inputs || {},
            results: last.results || ctx.results || (last.payload as Record<string, unknown>) || {},
          };

          // Case 3 — legacy shape: { lastCalculation } only
        } else if (
          context &&
          typeof context === "object" &&
          "lastCalculation" in context
        ) {
          const ctx = context as { tool?: string; toolName?: string; inputs?: Record<string, unknown>; results?: Record<string, unknown>; lastCalculation?: { toolId?: string; inputs?: Record<string, unknown>; results?: Record<string, unknown>; payload?: unknown } };
          const last = ctx.lastCalculation || {};
          normalized = {
            tool: ctx.tool || ctx.toolName || last.toolId || "Unknown",
            inputs: last.inputs || ctx.inputs || {},
            results: last.results || ctx.results || (last.payload as Record<string, unknown>) || {},
          };

          // Case 4 — unknown object but may contain inputs/results
        } else {
          const ctx = context as { tool?: string; toolName?: string; inputs?: Record<string, unknown>; results?: Record<string, unknown> } | null;
          normalized = {
            tool: ctx?.tool || ctx?.toolName || "Unknown",
            inputs: ctx?.inputs || {},
            results: ctx?.results || {},
          };
        }

        // Attempt to preserve metadata (warnings, steps)
        if (!normalized.results) {
          normalized.results = {};
        }
        const contextObj = context as { metadata?: unknown; lastCalculation?: { metadata?: unknown } } | null;
        if (!normalized.results.metadata && contextObj?.metadata) {
          normalized.results.metadata = contextObj.metadata;
        } else if (
          !normalized.results.metadata &&
          contextObj?.lastCalculation?.metadata
        ) {
          normalized.results.metadata = contextObj.lastCalculation.metadata;
        }

        // Canonical enforcement
        const finalContext = {
          tool: String(normalized.tool || "Unknown"),
          inputs: normalized.inputs || {},
          results: normalized.results || {},
        };

        setToolContext(finalContext as ToolContext);
      } catch (err) {
        console.warn(
          "Failed to normalize tool context; applying minimal fallback.",
          err,
        );
        
        const ctx = context as { tool?: string; toolName?: string; inputs?: Record<string, unknown>; results?: Record<string, unknown> } | null;
        setToolContext({
          tool: ctx?.tool || ctx?.toolName || "Unknown",
          inputs: ctx?.inputs || {},
          results: ctx?.results || {},
        } as ToolContext);
      }
    },
    [setToolContext],
  );

  const clearToolContext = useCallback(() => {
    setToolContext(null);
  }, [setToolContext]);

  const updateToolContextAndOpen = useCallback(
    (context: ToolContext) => {
      setToolContext(context);
      setIsOpen(true);
    },
    [setToolContext, setIsOpen],
  );

  return {
    updateToolContext,
    clearToolContext,
    updateToolContextAndOpen,
    sendCalculationEvent,
    sendCalculationUpdate,
  };
};
