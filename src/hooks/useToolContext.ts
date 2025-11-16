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
  const { setToolContext, setIsOpen } = useAIAssistant();

  const updateToolContext = useCallback((context: ToolContext) => {
    setToolContext(context);
    // Optionally auto-open AI assistant when tool context is updated
    // setIsOpen(true);
  }, [setToolContext]);

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

