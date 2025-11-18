/**
 * ToolActions - Standardized action button row for all tools
 * 
 * Provides consistent button placement and responsive layout.
 * 
 * Usage:
 * ```tsx
 * <ToolActions>
 *   <AeroButton>Calculate</AeroButton>
 *   <AskAIButton requestId={requestId} />
 *   <PDFExportButton requestId={requestId} />
 * </ToolActions>
 * ```
 */

import { ReactNode } from 'react';

interface ToolActionsProps {
  children: ReactNode;
  className?: string;
}

export function ToolActions({ children, className = '' }: ToolActionsProps) {
  return (
    <div className={`flex flex-wrap justify-center gap-2 ${className}`}>
      {children}
    </div>
  );
}

