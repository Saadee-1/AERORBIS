import { useCallback } from "react";
import { useAIAssistant, ToolContext } from "@/contexts/AIAssistantContext";

export interface CalculationEventPayload {
  toolId: string;
  toolName: string;
  inputs: Record<string, any>;
  results: Record<string, any>;
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

      // Use the new hardcoded endpoint
      const assistantEventsUrl = "https://khzdqcixiqlomounagej.supabase.co/functions/v1/assistant-events";

      // Try to send to server, but don't fail if it doesn't work
      try {
        const response = await fetch(
          assistantEventsUrl,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            mode: "cors",
            body: JSON.stringify(event),
          },
        ).catch((fetchError) => {
          // Network error (CORS, connection refused, etc.)
          console.warn(
            "Network error sending calculation event (this is OK, using local storage):",
            fetchError,
          );
          return null;
        });

        if (response && response.ok) {
          try {
            const result: CalculationEventResponse = await response.json();
            // Update localStorage with server response
            const storageData = {
              ...event,
              ...result,
              storedAt: Date.now(),
              expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
            };
            localStorage.setItem(
              `calc-${requestId}`,
              JSON.stringify(storageData),
            );
            return result;
          } catch (parseError) {
            console.warn(
              "Failed to parse server response (using fallback):",
              parseError,
            );
            return fallbackResponse;
          }
        } else {
          // Server returned error, but we already have fallback stored
          if (response) {
            try {
              const errorText = await response.text();
              console.warn(
                "Server returned error (using local storage):",
                response.status,
                errorText,
              );
            } catch {
              console.warn(
                "Server returned error (using local storage):",
                response.status,
              );
            }
          }
          return fallbackResponse;
        }
      } catch (error) {
        // Any other error (network, timeout, etc.)
        console.warn(
          "Error sending calculation event (using local storage, this is OK):",
          error,
        );
        return fallbackResponse;
      }
    },
    [],
  );

  // Send calculation update event (for streaming/partial updates)
  const sendCalculationUpdate = useCallback(
    async (
      requestId: string,
      payload: {
        progress?: number;
        intermediateResults?: Record<string, any>;
        sequenceId: number;
        isFinal?: boolean;
      },
    ): Promise<boolean> => {
      try {
        const userId =
          "user-" + (localStorage.getItem("userId") || "anonymous");

        const event = {
          eventType: "calculation.update" as const,
          requestId,
          userId,
          timestamp: new Date().toISOString(),
          ...payload,
        };

        // Use the new hardcoded endpoint
        const assistantEventsUrl = "https://khzdqcixiqlomounagej.supabase.co/functions/v1/assistant-events";

        const response = await fetch(
          assistantEventsUrl,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            mode: "cors",
            body: JSON.stringify(event),
          },
        );

        return response.ok;
      } catch (error) {
        console.error("Error sending calculation update:", error);
        return false;
      }
    },
    [],
  );

  const updateToolContext = useCallback(
    (context: any) => {
      // Backwards-compatible normalizer:
      // Converts any legacy or partial tool context into the new canonical format:
      // { tool: string, inputs: Record<string, any>, results: Record<string, any> }

      try {
        let normalized: any = context;

        // Case 1 — already correct
        if (
          context &&
          typeof context === "object" &&
          "tool" in context &&
          "inputs" in context &&
          "results" in context
        ) {
          normalized = {
            tool: context.tool,
            inputs: context.inputs || {},
            results: context.results || {},
          };

          // Case 2 — legacy shape: { toolName, lastCalculation }
        } else if (
          context &&
          typeof context === "object" &&
          "toolName" in context &&
          "lastCalculation" in context
        ) {
          const last = context.lastCalculation || {};
          normalized = {
            tool: context.tool || context.toolName || "Unknown",
            inputs: last.inputs || context.inputs || {},
            results: last.results || context.results || last.payload || {},
          };

          // Case 3 — legacy shape: { lastCalculation } only
        } else if (
          context &&
          typeof context === "object" &&
          "lastCalculation" in context
        ) {
          const last = context.lastCalculation || {};
          normalized = {
            tool: context.tool || context.toolName || last.toolId || "Unknown",
            inputs: last.inputs || context.inputs || {},
            results: last.results || context.results || last.payload || {},
          };

          // Case 4 — unknown object but may contain inputs/results
        } else {
          normalized = {
            tool: context?.tool || context?.toolName || "Unknown",
            inputs: context?.inputs || {},
            results: context?.results || {},
          };
        }

        // Attempt to preserve metadata (warnings, steps)
        normalized.results = normalized.results || {};
        if (!normalized.results.metadata && context?.metadata) {
          normalized.results.metadata = context.metadata;
        } else if (
          !normalized.results.metadata &&
          context?.lastCalculation?.metadata
        ) {
          normalized.results.metadata = context.lastCalculation.metadata;
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

        setToolContext({
          tool: (context && (context.tool || context.toolName)) || "Unknown",
          inputs: (context && context.inputs) || {},
          results: (context && context.results) || {},
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
