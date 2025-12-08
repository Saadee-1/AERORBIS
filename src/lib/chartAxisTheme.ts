/**
 * Global axis styling for all charts
 * Provides consistent, small tick labels across X and Y axes
 */

// Canonical tick style - use this for ALL XAxis and YAxis components
export const globalAxisTickStyle = {
  fontSize: 10, // small and consistent
  fill: "rgba(148, 163, 184, 0.9)", // slate-400/90
};

// Common axis props - use this for ALL XAxis and YAxis components
export const globalAxisCommonProps = {
  tickLine: false,
  axisLine: { stroke: "rgba(148, 163, 184, 0.35)", strokeWidth: 0.75 },
  tickMargin: 4,
  minTickGap: 8,
};

// Legacy exports for backward compatibility (re-export global styles)
export const compactAxisTick = globalAxisTickStyle;
export const compactAxisProps = globalAxisCommonProps;

/**
 * Create a compact Y-axis label configuration
 */
export const makeYAxisLabel = (text: string) => ({
  value: text,
  angle: -90,
  position: "insideLeft" as const,
  offset: -4,
  style: {
    textAnchor: "middle" as const,
    fontSize: 11,
    fill: "rgba(148, 163, 184, 0.95)",
  },
});

/**
 * Create a compact X-axis label configuration
 */
export const makeXAxisLabel = (text: string) => ({
  value: text,
  position: "insideBottom" as const,
  offset: -2,
  style: {
    textAnchor: "middle" as const,
    fontSize: 11,
    fill: "rgba(148, 163, 184, 0.95)",
  },
});

