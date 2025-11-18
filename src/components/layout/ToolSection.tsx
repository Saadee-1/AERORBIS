/**
 * ToolSection - Standard section wrapper for tool content
 * 
 * Provides consistent spacing and layout for tool sections.
 * 
 * Usage:
 * ```tsx
 * <ToolSection>
 *   <AeroCard title="Inputs">
 *     Content here
 *   </AeroCard>
 * </ToolSection>
 * ```
 */

import { ReactNode } from 'react';
import { spacingVertical } from '@/styles/spacing';

interface ToolSectionProps {
  children: ReactNode;
  className?: string;
  gridCols?: 1 | 2 | 3;
}

export function ToolSection({ 
  children, 
  className = '',
  gridCols = 1 
}: ToolSectionProps) {
  const gridClass = gridCols === 1 
    ? 'grid-cols-1' 
    : gridCols === 2 
    ? 'grid-cols-1 lg:grid-cols-2' 
    : 'grid-cols-1 lg:grid-cols-3';
  
  return (
    <div className={`grid ${gridClass} gap-6 ${spacingVertical.L} ${className}`}>
      {children}
    </div>
  );
}

