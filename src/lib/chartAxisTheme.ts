/**
 * Compact axis styling for engineering-grade polar charts
 * Provides consistent, tight spacing and smaller tick labels
 */

export const compactAxisTick = {
  fontSize: 10,
  fill: "rgba(148, 163, 184, 0.9)", // slate-400/90
};

export const compactAxisProps = {
  tickLine: false,
  axisLine: { stroke: "rgba(148, 163, 184, 0.35)", strokeWidth: 0.75 },
};

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

