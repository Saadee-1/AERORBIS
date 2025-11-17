import { useCallback } from 'react';
import { useAIAssistant, ToolContext } from '@/contexts/AIAssistantContext';

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
  const { setToolContext, setIsOpen, showNotification } = useAIAssistant();

  const sendCalculationEvent = useCallback(async (
    payload: CalculationEventPayload
  ): Promise<CalculationEventResponse | null> => {
    try {
      const requestId = `calc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const userId = 'user-' + (localStorage.getItem('userId') || 'anonymous');
      
      const event = {
        eventType: 'calculation.complete' as const,
        ...payload,
        requestId,
        userId,
        timestamp: new Date().toISOString(),
      };

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        console.warn('Supabase URL not configured, skipping calculation event');
        return null;
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/assistant-events/events/calc-complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });

      if (response.ok) {
        const result: CalculationEventResponse = await response.json();
        // Store requestId for later reference (with expiration - 30 days)
        const storageData = {
          ...event,
          ...result,
          storedAt: Date.now(),
          expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
        };
        localStorage.setItem(`calc-${requestId}`, JSON.stringify(storageData));
        return result;
      } else {
        console.error('Failed to send calculation event:', await response.text());
        return null;
      }
    } catch (error) {
      console.error('Error sending calculation event:', error);
      return null;
    }
  }, []);

  // Send calculation update event (for streaming/partial updates)
  const sendCalculationUpdate = useCallback(async (
    requestId: string,
    payload: {
      progress?: number;
      intermediateResults?: Record<string, any>;
      sequenceId: number;
      isFinal?: boolean;
    }
  ): Promise<boolean> => {
    try {
      const userId = 'user-' + (localStorage.getItem('userId') || 'anonymous');
      
      const event = {
        eventType: 'calculation.update' as const,
        requestId,
        userId,
        timestamp: new Date().toISOString(),
        ...payload,
      };

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        return false;
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/assistant-events/events/calc-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });

      return response.ok;
    } catch (error) {
      console.error('Error sending calculation update:', error);
      return false;
    }
  }, []);

  const updateToolContext = useCallback((context: ToolContext) => {
    setToolContext(context);
    // Show notification when calculation completes
    const toolNames: Record<string, string> = {
      "WingLoading": "Wing Loading Calculator",
      "LiftDrag": "Lift/Drag Analyzer",
      "OrbitalPath": "Orbital Visualizer",
      "DeltaV": "Delta-V Budget Planner",
      "Reynolds": "Reynolds Number Calculator",
      "MaterialsDB": "Materials Density Database",
      "Thrust": "Thrust Calculator",
      "Antenna": "Antenna Pattern Analyzer",
    };
    const toolName = toolNames[context.tool] || context.tool;
    showNotification(`📊 ${toolName} calculation complete! Click to analyze results.`);
  }, [setToolContext, showNotification]);

  const clearToolContext = useCallback(() => {
    setToolContext(null);
  }, [setToolContext]);

  const updateToolContextAndOpen = useCallback((context: ToolContext) => {
    setToolContext(context);
    setIsOpen(true);
  }, [setToolContext, setIsOpen]);

  return {
    updateToolContext,
    clearToolContext,
    updateToolContextAndOpen,
    sendCalculationEvent,
    sendCalculationUpdate,
  };
};

