/**
 * Aeroverse Typography System
 * 
 * Global typography constants for consistent text styling across all tools.
 * 
 * Usage:
 * ```tsx
 * import { typography } from '@/styles/typography';
 * 
 * <h1 className={typography.toolTitle}>Tool Name</h1>
 * ```
 */

export const typography = {
  /** Tool title: 28px bold - Main tool name in header */
  toolTitle: 'text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent',
  
  /** Section title: 20px semibold - Section headings within tools */
  sectionTitle: 'text-xl font-semibold text-white',
  
  /** Card title: 18px semibold - Titles within cards */
  cardTitle: 'text-lg font-semibold text-white',
  
  /** Label: 14px medium - Form field labels */
  label: 'text-sm font-medium text-gray-300',
  
  /** Body: 14px regular - Standard body text */
  body: 'text-sm text-gray-300',
  
  /** Small: 12px regular - Helper text, captions */
  small: 'text-xs text-gray-400',
  
  /** Number: 16px semibold monospace - For displaying calculated values */
  number: 'text-base font-semibold font-mono text-cyan-400',
  
  /** Result value: 24px bold - Large result numbers */
  resultValue: 'text-2xl font-bold text-cyan-400',
} as const;

/**
 * Typography size constants (in pixels) for reference
 */
export const typographySizes = {
  toolTitle: 28,
  sectionTitle: 20,
  cardTitle: 18,
  label: 14,
  body: 14,
  small: 12,
  number: 16,
  resultValue: 24,
} as const;

