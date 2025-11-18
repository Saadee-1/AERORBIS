/**
 * Aeroverse Spacing System
 * 
 * Global spacing constants for consistent layout across all tools.
 * All spacing values are in pixels and follow a 4px base scale.
 * 
 * Usage:
 * ```tsx
 * import { spacing } from '@/styles/spacing';
 * 
 * <div style={{ margin: spacing.M, padding: spacing.L }}>
 * ```
 */

export const spacing = {
  /** Extra Small: 4px - Minimal spacing for tight layouts */
  XS: 4,
  
  /** Small: 8px - Compact spacing for related elements */
  S: 8,
  
  /** Medium: 16px - Standard spacing between form fields and sections */
  M: 16,
  
  /** Large: 24px - Spacing between major sections */
  L: 24,
  
  /** Extra Large: 32px - Spacing between major content blocks */
  XL: 32,
  
  /** Extra Extra Large: 48px - Spacing for page-level sections */
  XXL: 48,
} as const;

/**
 * Tailwind CSS spacing classes mapping
 * Use these for className props instead of hardcoded values
 */
export const spacingClasses = {
  XS: 'gap-1',      // 4px
  S: 'gap-2',       // 8px
  M: 'gap-4',       // 16px
  L: 'gap-6',       // 24px
  XL: 'gap-8',      // 32px
  XXL: 'gap-12',    // 48px
} as const;

/**
 * Tailwind CSS vertical spacing classes
 */
export const spacingVertical = {
  XS: 'space-y-1',
  S: 'space-y-2',
  M: 'space-y-4',
  L: 'space-y-6',
  XL: 'space-y-8',
  XXL: 'space-y-12',
} as const;

/**
 * Tailwind CSS horizontal spacing classes
 */
export const spacingHorizontal = {
  XS: 'space-x-1',
  S: 'space-x-2',
  M: 'space-x-4',
  L: 'space-x-6',
  XL: 'space-x-8',
  XXL: 'space-x-12',
} as const;

/**
 * Tailwind CSS padding classes
 */
export const padding = {
  XS: 'p-1',
  S: 'p-2',
  M: 'p-4',
  L: 'p-6',
  XL: 'p-8',
  XXL: 'p-12',
} as const;

/**
 * Tailwind CSS margin classes
 */
export const margin = {
  XS: 'm-1',
  S: 'm-2',
  M: 'm-4',
  L: 'm-6',
  XL: 'm-8',
  XXL: 'm-12',
} as const;

