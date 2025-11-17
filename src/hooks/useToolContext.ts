import { useCallback } from 'react';
import { useAIAssistant, ToolContext } from '@/contexts/AIAssistantContext';

/**
 * Hook for tools to easily update AI Assistant context with their results
 * 
 * Usage in a tool component:
 * ```tsx
 * const { updateToolContext, clearToolContext } = useToolContext();
 * 
 * // After calculation:
 * updateToolContext({
 *   tool: "Thrust",
 *   inputs: { massFlow: 10, exhaustVelocity: 3000 },
 *   results: { thrust: 30000 }
 * });
 * ```
 */
export const useToolContext = () => {
  const { setToolContext, setIsOpen, showNotification } = useAIAssistant();

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
  };
};

