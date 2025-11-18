/**
 * ToolHeader - Standard header component for all Aeroverse tools
 * 
 * Provides consistent header layout with icon, title, description,
 * and action buttons.
 * 
 * Usage:
 * ```tsx
 * <ToolHeader
 *   title="Lift/Drag Analyzer"
 *   description="Calculate lift and drag coefficients"
 *   icon={Plane}
 *   actions={<Button>Action</Button>}
 * />
 * ```
 */

import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { typography } from '@/styles/typography';

interface ToolHeaderProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  actions?: ReactNode;
  className?: string;
}

export function ToolHeader({ 
  title, 
  description, 
  icon: Icon, 
  actions,
  className = '' 
}: ToolHeaderProps) {
  return (
    <div className={`text-center ${className}`}>
      <div className="flex items-center justify-center gap-3 mb-4">
        <Icon className="w-12 h-12 text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)]" />
        <h2 className={typography.toolTitle}>
          {title}
        </h2>
      </div>
      {description && (
        <p className="text-gray-300 text-lg max-w-3xl mx-auto mb-4">
          {description}
        </p>
      )}
      {actions && (
        <div className="flex justify-center gap-2 mt-4">
          {actions}
        </div>
      )}
    </div>
  );
}

