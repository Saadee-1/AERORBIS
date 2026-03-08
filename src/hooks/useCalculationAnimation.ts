/**
 * useCalculationAnimation - Hook to wrap any calculation function
 * with a futuristic animation delay.
 * 
 * Usage:
 * ```tsx
 * const { isCalculating, runCalculation } = useCalculationAnimation();
 * 
 * const handleCalc = () => runCalculation(async () => {
 *   // actual calculation logic
 * });
 * 
 * return (
 *   <>
 *     <CalculationOverlay isActive={isCalculating} label="Analyzing" />
 *     <Button onClick={handleCalc}>Calculate</Button>
 *   </>
 * );
 * ```
 */

import { useState, useCallback } from "react";

interface UseCalculationAnimationOptions {
  /** Minimum display time in ms (default: 1200) */
  minDuration?: number;
}

export function useCalculationAnimation(options: UseCalculationAnimationOptions = {}) {
  const { minDuration = 1200 } = options;
  const [isCalculating, setIsCalculating] = useState(false);

  const runCalculation = useCallback(
    async <T,>(fn: () => T | Promise<T>): Promise<T | undefined> => {
      setIsCalculating(true);
      const start = Date.now();

      try {
        const result = await fn();
        const elapsed = Date.now() - start;
        const remaining = Math.max(0, minDuration - elapsed);
        if (remaining > 0) {
          await new Promise((r) => setTimeout(r, remaining));
        }
        return result;
      } finally {
        setIsCalculating(false);
      }
    },
    [minDuration]
  );

  return { isCalculating, runCalculation };
}
