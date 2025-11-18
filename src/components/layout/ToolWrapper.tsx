/**
 * ToolWrapper - Standard container for all Aeroverse tools
 * 
 * Provides consistent layout structure, max-width, and spacing
 * for all tool pages.
 * 
 * Usage:
 * ```tsx
 * <ToolWrapper>
 *   <ToolHeader title="Tool Name" icon={Icon} />
 *   <ToolContent>
 *     {/* Tool content */}
 *   </ToolContent>
 * </ToolWrapper>
 * ```
 */

import { ReactNode } from 'react';
import { spacingVertical } from '@/styles/spacing';

interface ToolWrapperProps {
  children: ReactNode;
  className?: string;
}

export function ToolWrapper({ children, className = '' }: ToolWrapperProps) {
  return (
    <div className={`w-full max-w-7xl mx-auto ${spacingVertical.L} ${className}`}>
      {children}
    </div>
  );
}

